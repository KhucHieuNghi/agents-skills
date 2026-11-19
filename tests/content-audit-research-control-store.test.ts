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
import { randomBytes, createCipheriv } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { expect, it, vi } from "vitest";
import process from "node:process";
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, spawn: vi.fn(actual.spawn) };
});
import {
  fixture,
  bundle as encodeBundle,
} from "./helpers/research-projection.js";
import {
  enterpriseDigest,
  stableJson,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { advanceResearchAccessState } from "../scripts/enterprise-journeys/research-access-state.mjs";
import {
  createResearchControlStore as create,
  readResearchControlStore as read,
  advanceStoredResearchAccess as advance,
  registerStoredResearchReviews as register,
  planStoredResearchDisclosure as planStored,
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
    const canary = randomBytes(16).toString("hex");
    process.env.RESEARCH_TEST_CANARY = canary;
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
      expect(JSON.stringify(call)).not.toContain(canary);
    } finally {
      delete process.env.RESEARCH_TEST_CANARY;
    }
  }));
it("concurrent initialization publishes exactly one complete store", async () =>
  setup(async (o) => {
    const results = await Promise.allSettled([create(o), create(o)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await read(o)).revision).toBe(1);
  }));

async function registrationBundle(o) {
  const f = await fixture();
  f.receipt.reviewedAt = o.context.assessmentAt;
  const b = encodeBundle(f);
  return {
    f,
    bundle: {
      descriptors: f.descriptors,
      researchPayloads: f.payloads,
      policy: f.policy,
      candidates: b.candidates,
      payloads: b.payloads,
    },
  };
}
it("persists only verified review metadata and uses it in acquisition preflight", async () =>
  setup(async (o) => {
    await create(o);
    const { f, bundle } = await registrationBundle(o);
    const registered = await register(o, 1, bundle);
    expect(registered.revision).toBe(2);
    expect(registered.control.registrations).toHaveLength(1);
    expect(JSON.stringify(registered.control)).not.toContain(f.raw.summary);
    expect(JSON.stringify(registered.control)).not.toContain("artifactText");
    expect((await read(o)).control).toEqual(registered.control);
    expect(
      (
        await planStored(
          o,
          bundle.descriptors,
          bundle.policy,
          bundle.candidates,
        )
      ).plan.candidates[0].fetchEligible,
    ).toBe(true);
    expect((await register(o, 2, bundle)).revision).toBe(2);
  }));
it("retires registered identities atomically on access change and never revives them", async () =>
  setup(async (o) => {
    await create(o);
    const { bundle } = await registrationBundle(o);
    await register(o, 1, bundle);
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].customerSummaryAllowed = false;
    const denied = await advance(o, 2);
    expect(denied.control.registrations).toHaveLength(0);
    expect(denied.control.retiredCandidateIds).toEqual(["private-summary"]);
    o.context.assessmentAt = "2026-11-19T02:02:00Z";
    o.context.access[0].customerSummaryAllowed = true;
    await advance(o, 3);
    let touched = false;
    Object.defineProperty(bundle.payloads[0], "artifactText", {
      enumerable: true,
      get() {
        touched = true;
        throw Error("PRIVATE");
      },
    });
    await expect(register(o, 4, bundle)).rejects.toThrow(/Retired/);
    expect(touched).toBe(false);
    expect(
      (
        await planStored(
          o,
          bundle.descriptors,
          bundle.policy,
          bundle.candidates,
        )
      ).plan.candidates[0].fetchEligible,
    ).toBe(false);
  }));
it("does not silently reuse an active identity with changed review bytes", async () =>
  setup(async (o) => {
    await create(o);
    const { f, bundle } = await registrationBundle(o);
    await register(o, 1, bundle);
    f.receipt.reviewer.id = "different-reviewer";
    const changed = encodeBundle(f);
    await expect(register(o, 2, { ...bundle, ...changed })).rejects.toThrow(
      /identity cannot be reused/,
    );
    expect((await read(o)).revision).toBe(2);
  }));
it("rejected reviews cannot create a stored registration", async () =>
  setup(async (o) => {
    await create(o);
    const { f, bundle } = await registrationBundle(o);
    f.receipt.verdicts.disclosure = "reject";
    await expect(
      register(o, 1, { ...bundle, ...encodeBundle(f) }),
    ).rejects.toThrow(/accepted exact/);
    expect((await read(o)).control.registrations).toHaveLength(0);
  }));
it("registration and revocation cannot both commit from one prior revision", async () =>
  setup(async (o) => {
    await create(o);
    const { bundle } = await registrationBundle(o);
    const revoked = { ...o, context: structuredClone(o.context) };
    revoked.context.assessmentAt = "2026-11-19T02:01:00Z";
    revoked.context.access[0].analysisAllowed = false;
    const results = await Promise.allSettled([
      register(o, 1, bundle),
      advance(revoked, 1),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const latest = await read(revoked);
    expect(latest.revision).toBe(2);
    if (latest.control.registrations.length) {
      await advance(revoked, 2);
      expect((await read(revoked)).control.retiredCandidateIds).toEqual([
        "private-summary",
      ]);
    } else expect(latest.control.state.generation).toBe(2);
  }));
it("unchanged access observation preserves registrations", async () =>
  setup(async (o) => {
    await create(o);
    const { bundle } = await registrationBundle(o);
    await register(o, 1, bundle);
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    const refreshed = await advance(o, 2);
    expect(refreshed.control.state.generation).toBe(1);
    expect(refreshed.control.registrations).toHaveLength(1);
    expect(
      (
        await planStored(
          o,
          bundle.descriptors,
          bundle.policy,
          bundle.candidates,
        )
      ).plan.candidates[0].fetchEligible,
    ).toBe(true);
  }));

it("reads legacy empty control state without rewriting and upgrades on mutation", async () =>
  setup(async (o) => {
    const initial = await create(o),
      legacy = {
        schemaVersion: 1,
        state: initial.control.state,
        registrations: [],
      };
    const nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", o.key, nonce);
    cipher.setAAD(
      Buffer.from(
        stableJson({
          namespace: "research-control-v1",
          scope: o.authority.scopeDigest,
          revision: 1,
        }),
      ),
    );
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(stableJson(legacy))),
      cipher.final(),
    ]);
    const envelope = JSON.stringify({
      nonce: nonce.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    });
    const db = join(o.directory, "control.sqlite");
    execFileSync(
      "python3",
      [
        "-c",
        "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('UPDATE control SET envelope=?',(sys.stdin.read(),)); c.commit()",
        db,
      ],
      { input: envelope },
    );
    const before = await readFile(db),
      loaded = await read(o);
    expect(loaded.revision).toBe(1);
    expect(loaded.control.schemaVersion).toBe(2);
    expect(loaded.control.retiredCandidateIds).toEqual([]);
    expect(await readFile(db)).toEqual(before);
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    await advance(o, 1);
    expect((await read(o)).revision).toBe(2);
  }));
it.each(["artifactHash", "receiptHash", "research-source"])(
  "rejects relabeled retired %s before reading any candidate bytes",
  async (field) =>
    setup(async (o) => {
      await create(o);
      const { bundle } = await registrationBundle(o);
      await register(o, 1, bundle);
      o.context.assessmentAt = "2026-11-19T02:01:00Z";
      o.context.access[0].customerSummaryAllowed = false;
      await advance(o, 2);
      o.context.assessmentAt = "2026-11-19T02:02:00Z";
      o.context.access[0].customerSummaryAllowed = true;
      await advance(o, 3);
      const retiredHash = bundle.candidates[0].artifactHash;
      bundle.candidates[0] = {
        ...bundle.candidates[0],
        candidateId: "renamed",
        artifactHash: "e".repeat(64),
        receiptHash: "f".repeat(64),
        ...(field === "research-source"
          ? {}
          : { [field]: bundle.candidates[0][field] }),
      };
      let readText = false;
      if (field === "research-source") {
        bundle.descriptors[0].artifactHash = retiredHash;
        bundle.researchPayloads = [
          {
            sourceId: bundle.descriptors[0].sourceId,
            get artifactText() {
              readText = true;
              throw Error("PRIVATE");
            },
          },
        ];
      }
      bundle.payloads = [
        {
          candidateId: "renamed",
          get artifactText() {
            readText = true;
            throw Error("PRIVATE");
          },
          get receiptText() {
            readText = true;
            throw Error("PRIVATE");
          },
        },
      ];
      await expect(register(o, 4, bundle)).rejects.toThrow(/Retired artifact/);
      expect(readText).toBe(false);
    }),
);
