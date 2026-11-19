import {
  mkdtemp,
  realpath,
  readFile,
  rm,
  stat,
  chmod,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { expect, it, vi } from "vitest";
import process from "node:process";
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, spawn: vi.fn(actual.spawn) };
});
import { fixture } from "./helpers/research-projection.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { advanceResearchAccessState } from "../scripts/enterprise-journeys/research-access-state.mjs";
import {
  createResearchControlStore as create,
  readResearchControlStore as read,
  advanceStoredResearchAccess as advance,
} from "../scripts/enterprise-journeys/research-control-store.mjs";
async function setup(fn) {
  const parent = await realpath(
      await mkdtemp(join(tmpdir(), "research-control-")),
    ),
    f = await fixture(),
    directory = join(parent, "vault");
  const options = {
    directory,
    key: randomBytes(32),
    context: f.context,
    authority: {
      scopeDigest: enterpriseDigest(
        advanceResearchAccessState(null, null, f.context).scope,
      ),
      directory,
      artifactClass: "research-control-metadata",
      stagingDirectory: parent,
      allowed: true,
      observedAt: f.context.assessmentAt,
      validUntil: "2026-11-20T00:00:00Z",
      maxAgeSeconds: 3600,
    },
  };
  try {
    await fn(options, parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}
it("persists encrypted state across reopen with private permissions", async () =>
  setup(async (o) => {
    const initial = await create(o);
    expect(await read({ ...o, key: Buffer.from(o.key) })).toEqual(initial);
    expect((await stat(o.directory)).mode & 0o777).toBe(0o700);
    expect((await stat(join(o.directory, "control.sqlite"))).mode & 0o777).toBe(
      0o600,
    );
    const bytes = await readFile(join(o.directory, "control.sqlite"));
    expect(bytes.includes(Buffer.from(o.key))).toBe(false);
    expect(bytes.toString()).not.toContain('"recipientId"');
    expect(bytes.toString()).not.toContain("customer-reviewers");
  }));
it("one concurrent writer wins the exact expected revision", async () =>
  setup(async (o) => {
    await create(o);
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].customerSummaryAllowed = false;
    const result = await Promise.allSettled([advance(o, 1), advance(o, 1)]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(result.filter((r) => r.status === "rejected")).toHaveLength(1);
    const saved = await read(o);
    expect(saved.revision).toBe(2);
    expect(saved.control.state.generation).toBe(2);
  }));
it("preserves generation through persisted denial and regrant", async () =>
  setup(async (o) => {
    await create(o);
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].analysisAllowed = false;
    await advance(o, 1);
    o.context.assessmentAt = "2026-11-19T02:02:00Z";
    o.context.access[0].analysisAllowed = true;
    const r = await advance(o, 2);
    expect(r.control.state.generation).toBe(3);
    expect((await read(o)).revision).toBe(3);
  }));
it("wrong key and tampered ciphertext cannot be accepted or overwritten", async () =>
  setup(async (o) => {
    await create(o);
    await expect(read({ ...o, key: randomBytes(32) })).rejects.toThrow(
      /authentication/,
    );
    execFileSync("python3", [
      "-c",
      "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute(\"UPDATE control SET envelope='{}'\"); c.commit()",
      join(o.directory, "control.sqlite"),
    ]);
    await expect(read(o)).rejects.toThrow(/authentication/);
    await expect(advance(o, 1)).rejects.toThrow(/authentication/);
  }));
it("AAD binds revision against database revision tampering", async () =>
  setup(async (o) => {
    await create(o);
    execFileSync("python3", [
      "-c",
      "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('UPDATE control SET revision=2'); c.commit()",
      join(o.directory, "control.sqlite"),
    ]);
    await expect(read(o)).rejects.toThrow(/authentication/);
  }));
it.each(["denied", "expired", "scope", "directory"])(
  "rejects %s storage grant before creating a directory",
  async (mode) =>
    setup(async (o) => {
      if (mode === "denied") o.authority.allowed = false;
      if (mode === "expired") o.authority.validUntil = o.context.assessmentAt;
      if (mode === "scope") o.authority.scopeDigest = "f".repeat(64);
      if (mode === "directory") o.authority.directory += "-other";
      await expect(create(o)).rejects.toThrow();
      await expect(stat(o.directory)).rejects.toThrow();
    }),
);
it("existing store cannot be silently recreated", async () =>
  setup(async (o) => {
    await create(o);
    await expect(create(o)).rejects.toThrow();
    expect((await read(o)).revision).toBe(1);
  }));
it("rejects weak permissions and symlinked database", async () =>
  setup(async (o, parent) => {
    await create(o);
    const db = join(o.directory, "control.sqlite");
    await chmod(db, 0o644);
    await expect(read(o)).rejects.toThrow(/operation failed/);
    await chmod(db, 0o600);
    const target = join(parent, "copy.sqlite");
    await symlink(db, target);
    await rm(target);
    await rm(db);
    await symlink(target, db);
    await expect(read(o)).rejects.toThrow(/operation failed/);
  }));
it("uncommitted process termination leaves previous state readable", async () =>
  setup(async (o) => {
    await create(o);
    const child = spawn(
      "python3",
      [
        "-u",
        "-c",
        "import sqlite3,sys,time; c=sqlite3.connect(sys.argv[1]); c.execute('BEGIN IMMEDIATE'); c.execute('UPDATE control SET revision=99'); print('ready',flush=True); time.sleep(20)",
        join(o.directory, "control.sqlite"),
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await once(child.stdout, "data");
      const closed = once(child, "close");
      child.kill("SIGKILL");
      await closed;
      expect((await read(o)).revision).toBe(1);
    } finally {
      child.kill("SIGKILL");
    }
  }));

it("does not inherit caller secrets into the storage worker", async () =>
  setup(async (o) => {
    process.env.RESEARCH_TEST_SECRET = "synthetic-secret-canary";
    try {
      await create(o);
      const call = vi
        .mocked(spawn)
        .mock.calls.findLast((c) => c[1]?.includes("-I"));
      expect(call).toBeDefined();
      expect(call[2].env).toEqual({
        PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
        LANG: "C.UTF-8",
      });
      expect(JSON.stringify(call)).not.toContain("synthetic-secret-canary");
    } finally {
      delete process.env.RESEARCH_TEST_SECRET;
    }
  }));
it("concurrent initialization publishes exactly one complete store", async () =>
  setup(async (o) => {
    const results = await Promise.allSettled([create(o), create(o)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await read(o)).revision).toBe(1);
  }));
