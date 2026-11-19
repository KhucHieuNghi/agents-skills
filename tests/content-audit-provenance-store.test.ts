import { mkdtemp, realpath, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { it, expect, vi } from "vitest";
vi.mock(
  "../scripts/enterprise-report-provenance.mjs",
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      inspectStoredGeneratedReportProvenance: vi.fn(
        actual.inspectStoredGeneratedReportProvenance,
      ),
    };
  },
);
vi.mock("../scripts/private-control-transport.mjs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runPrivateControlOperation: vi.fn(actual.runPrivateControlOperation),
  };
});
import { inspectStoredGeneratedReportProvenance as inspect } from "../scripts/enterprise-report-provenance.mjs";
import { runPrivateControlOperation as worker } from "../scripts/private-control-transport.mjs";
import {
  createGeneratedProvenanceRegistry as create,
  registerGeneratedProvenance as register,
  readGeneratedProvenance as read,
  removeGeneratedProvenance as remove,
} from "../scripts/enterprise-provenance-store.mjs";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  saveEnterpriseRun,
  loadEnterpriseRun,
  enterpriseDigest as digest,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { importEnterpriseBrowserCaptures } from "../skills/content-search-audit/scripts/lib/enterprise-browser-workflow.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import {
  loadEnterpriseReport,
  saveEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
function grant(base, operation, at = base.context.assessmentAt) {
  const context = { ...base.context, assessmentAt: at };
  const { customerId, storeId, purpose } = context;
  return {
    ...base,
    context,
    authority: {
      scopeDigest: digest({
        namespace: "generated-report-provenance-v1",
        customerId,
        storeId,
        purpose,
      }),
      directory: base.directory,
      stagingDirectory: dirname(base.directory),
      artifactClass: "generated-report-provenance-metadata",
      operation,
      allowed: true,
      observedAt: at,
      validUntil: new Date(Date.parse(at) + 3600000).toISOString(),
      maxAgeSeconds: 3600,
      retainUntil: operation === "register" ? "2026-11-19T13:00:00Z" : null,
    },
  };
}
async function setup(fn) {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "provenance-registry-")),
  );
  try {
    const sample = JSON.parse(
      await readFile(
        "skills/content-search-audit/examples/enterprise-browser-capture.json",
        "utf8",
      ),
    );
    const initial = resolveAuditContext(sample.config, []);
    await saveEnterpriseRun(join(root, "initial"), initial);
    await importEnterpriseBrowserCaptures(
      join(root, "initial"),
      {
        sourceDigest: digest(initial),
        newRunId: "captured",
        assessmentAt: initial.assessmentAt,
        captures: [sample.entry],
      },
      join(root, "run"),
    );
    const run = await loadEnterpriseRun(join(root, "run"));
    const receipt = await buildStoredEnterpriseReport(
      join(root, "run"),
      {
        sourceRunDigest: digest(run),
        revisionId: "r1",
        authorId: "author",
        generatedAt: run.assessmentAt,
        brand: { name: "Synthetic", accent: "#174f7b" },
      },
      join(root, "report"),
    );
    const report = await loadEnterpriseReport(join(root, "report"));
    const binding = {
      sourceDirectory: join(root, "run"),
      reportDirectory: join(root, "report"),
      sourceRunDigest: digest(run),
      reportDigest: digest(report),
      manifestDigest: receipt.manifestDigest,
    };
    const base = {
      directory: join(root, "registry"),
      key: randomBytes(32),
      context: {
        customerId: run.customerId,
        storeId: "primary",
        purpose: "enterprise-report-history",
        assessmentAt: run.assessmentAt,
      },
    };
    await fn({ root, base, binding, report });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
it("persists only encrypted inspector-produced metadata and retrieves historical bindings", async () =>
  setup(async ({ base, binding, root }) => {
    expect(await create(grant(base, "create"))).toEqual({ revision: 1 });
    const result = await register(
      grant(base, "register"),
      1,
      binding,
      "2026-11-19T11:30:00Z",
    );
    expect(result.created).toBe(true);
    const stored = await read(grant(base, "read"), result.registrationId);
    expect(stored.record.provenance.artifactBinding.manifestDigest).toBe(
      binding.manifestDigest,
    );
    expect(stored).toMatchObject({
      revision: 2,
      currentReplayVerified: false,
      disclosureAuthorized: false,
    });
    const bytes = await readFile(join(base.directory, "control.sqlite"));
    expect(bytes.includes(Buffer.from(base.context.customerId))).toBe(false);
    expect(bytes.includes(Buffer.from(binding.manifestDigest))).toBe(false);
    expect(JSON.stringify(stored)).not.toContain(root);
    expect(await readdir(base.directory)).toEqual(["control.sqlite"]);
  }));
it("denies before source inspection or storage transport", async () =>
  setup(async ({ base, binding }) => {
    vi.mocked(inspect).mockClear();
    vi.mocked(worker).mockClear();
    const denied = grant(base, "register");
    denied.authority.allowed = false;
    await expect(
      register(denied, 1, binding, "2026-11-19T11:30:00Z"),
    ).rejects.toThrow(/authority/);
    expect(inspect).not.toHaveBeenCalled();
    expect(worker).not.toHaveBeenCalled();
  }));
it("does not extend duplicate registrations or accept stale write revisions", async () =>
  setup(async ({ base, binding }) => {
    await create(grant(base, "create"));
    const first = await register(
      grant(base, "register"),
      1,
      binding,
      "2026-11-19T11:30:00Z",
    );
    expect(
      await register(
        grant(base, "register"),
        2,
        binding,
        "2026-11-19T11:30:00Z",
      ),
    ).toEqual({ ...first, created: false });
    await expect(
      register(grant(base, "register"), 2, binding, "2026-11-19T12:00:00Z"),
    ).rejects.toThrow(/retention extension/);
    await expect(
      register(grant(base, "register"), 1, binding, "2026-11-19T11:30:00Z"),
    ).rejects.toThrow(/revision conflict/);
    expect(await read(grant(base, "read"))).toEqual({ revision: 2 });
  }));
it("keeps live registrations readable while expired entries require authorized cleanup", async () =>
  setup(async ({ base, binding, report, root }) => {
    await create(grant(base, "create"));
    const first = await register(
      grant(base, "register"),
      1,
      binding,
      "2026-11-19T11:30:00Z",
    );
    const next = {
      ...report,
      revisionId: "r2",
      generatedAt: "2026-11-19T11:01:00Z",
    };
    const receipt = await saveEnterpriseReport(join(root, "second"), next);
    const second = await register(
      grant(base, "register", "2026-11-19T11:01:00Z"),
      2,
      {
        ...binding,
        reportDirectory: join(root, "second"),
        reportDigest: digest(next),
        manifestDigest: receipt.manifestDigest,
      },
      "2026-11-19T12:00:00Z",
    );
    const at = "2026-11-19T11:30:00Z";
    await expect(
      read(grant(base, "read", at), first.registrationId),
    ).rejects.toThrow(/expired/);
    expect(
      (await read(grant(base, "read", at), second.registrationId)).record
        .registrationId,
    ).toBe(second.registrationId);
    expect(await remove(grant(base, "purge-expired", at), 3)).toMatchObject({
      revision: 4,
      removed: 1,
      physicalErasureVerified: false,
      revocationEnforced: false,
    });
    await expect(
      read(grant(base, "read", at), first.registrationId),
    ).rejects.toThrow(/Missing/);
  }));
it("logical removal permits explicit re-registration and is not a denylist", async () =>
  setup(async ({ base, binding }) => {
    await create(grant(base, "create"));
    const first = await register(
      grant(base, "register"),
      1,
      binding,
      "2026-11-19T11:30:00Z",
    );
    await remove(grant(base, "remove"), 2, first.registrationId);
    expect(
      (
        await register(
          grant(base, "register"),
          3,
          binding,
          "2026-11-19T11:30:00Z",
        )
      ).created,
    ).toBe(true);
  }));
it("rejects wrong keys, foreign customers and colliding worker namespaces", async () =>
  setup(async ({ base, binding }) => {
    await create(grant(base, "create"));
    await register(grant(base, "register"), 1, binding, "2026-11-19T11:30:00Z");
    await expect(
      read(grant({ ...base, key: randomBytes(32) }, "read")),
    ).rejects.toThrow(/authentication/);
    const foreign = {
      ...base,
      context: { ...base.context, customerId: "foreign" },
    };
    await expect(read(grant(foreign, "read"))).rejects.toThrow();
    const otherScope = digest({
      namespace: "research-control-v1",
      customerId: base.context.customerId,
      storeId: base.context.storeId,
      purpose: base.context.purpose,
    });
    await expect(
      worker("read", base, otherScope, null, null),
    ).rejects.toThrow();
    await expect(
      worker("replace", base, otherScope, 2, "forged"),
    ).rejects.toThrow();
    expect(await read(grant(base, "read"))).toEqual({ revision: 2 });
  }));

it("uses CAS for competing registrations", async () =>
  setup(async ({ base, binding }) => {
    await create(grant(base, "create"));
    const results = await Promise.allSettled([
      register(grant(base, "register"), 1, binding, "2026-11-19T11:30:00Z"),
      register(grant(base, "register"), 1, binding, "2026-11-19T11:30:00Z"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await read(grant(base, "read"))).toEqual({ revision: 2 });
  }));
it("allows cleanup with a fresh cleanup grant after the registration grant expires", async () =>
  setup(async ({ base, binding }) => {
    await create(grant(base, "create"));
    await register(grant(base, "register"), 1, binding, "2026-11-19T11:30:00Z");
    const expired = grant(base, "purge-expired");
    expired.context.assessmentAt = "2026-11-19T12:01:00Z";
    await expect(remove(expired, 2)).rejects.toThrow(/expired/);
    expect(
      await remove(grant(base, "purge-expired", "2026-11-19T12:01:00Z"), 2),
    ).toMatchObject({ revision: 3, removed: 1 });
  }));
it("preserves uncertain commit outcomes and never retries a mutation automatically", async () =>
  setup(async ({ base, binding }) => {
    await create(grant(base, "create"));
    const actual = await vi.importActual(
      "../scripts/private-control-transport.mjs",
    );
    let writes = 0;
    vi.mocked(worker).mockImplementation(async (...args) => {
      const result = await actual.runPrivateControlOperation(...args);
      if (args[0] === "replace") {
        writes++;
        throw Error(
          "Private storage response unavailable; commit outcome unknown",
        );
      }
      return result;
    });
    try {
      await expect(
        register(grant(base, "register"), 1, binding, "2026-11-19T11:30:00Z"),
      ).rejects.toThrow(/outcome unknown/);
      expect(writes).toBe(1);
      expect(await read(grant(base, "read"))).toEqual({ revision: 2 });
    } finally {
      vi.mocked(worker).mockImplementation(actual.runPrivateControlOperation);
    }
  }));
it.each(["retention", "operation", "directory"])(
  "rejects invalid %s authority before inspection and transport",
  async (kind) =>
    setup(async ({ base, binding }) => {
      vi.mocked(inspect).mockClear();
      vi.mocked(worker).mockClear();
      const options = grant(base, "register");
      let retainUntil = "2026-11-19T11:30:00Z";
      if (kind === "retention") retainUntil = "2026-11-19T14:00:00Z";
      if (kind === "operation") options.authority.operation = "read";
      if (kind === "directory")
        options.authority.directory = dirname(base.directory);
      await expect(
        register(options, 1, binding, retainUntil),
      ).rejects.toThrow();
      expect(inspect).not.toHaveBeenCalled();
      expect(worker).not.toHaveBeenCalled();
    }),
);

it("rejects registration time preceding the bound report generation", async () =>
  setup(async ({ base, binding, report, root }) => {
    await create(grant(base, "create"));
    const next = {
      ...report,
      revisionId: "future-report",
      generatedAt: "2026-11-19T11:01:00Z",
    };
    const receipt = await saveEnterpriseReport(join(root, "future"), next);
    await expect(
      register(
        grant(base, "register"),
        1,
        {
          ...binding,
          reportDirectory: join(root, "future"),
          reportDigest: digest(next),
          manifestDigest: receipt.manifestDigest,
        },
        "2026-11-19T11:30:00Z",
      ),
    ).rejects.toThrow(/predates report/);
    expect(await read(grant(base, "read"))).toEqual({ revision: 1 });
  }));
