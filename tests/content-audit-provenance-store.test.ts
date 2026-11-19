import { evaluateEnterpriseTechnicalSeo } from "../skills/content-search-audit/scripts/lib/technical-seo/workflow.mjs";
import { mkdtemp, realpath, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes, createHash, createCipheriv } from "node:crypto";
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
  compareRegisteredGeneratedReports as compare,
} from "../scripts/enterprise-provenance-store.mjs";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  saveEnterpriseRun,
  loadEnterpriseRun,
  enterpriseDigest as digest,
  stableJson,
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

async function registerPair(f) {
  await create(grant(f.base, "create"));
  const first = await register(
    grant(f.base, "register"),
    1,
    f.binding,
    "2026-11-19T11:30:00Z",
  );
  const report = {
    ...f.report,
    revisionId: "r2",
    generatedAt: "2026-11-19T11:01:00Z",
  };
  const directory = join(f.root, "second");
  const receipt = await saveEnterpriseReport(directory, report);
  const second = await register(
    grant(f.base, "register", "2026-11-19T11:01:00Z"),
    2,
    {
      ...f.binding,
      reportDirectory: directory,
      reportDigest: digest(report),
      manifestDigest: receipt.manifestDigest,
    },
    "2026-11-19T12:00:00Z",
  );
  return [first.registrationId, second.registrationId];
}
it("compares a consistent explicit selection without claiming a parent revision chain", async () =>
  setup(async (f) => {
    const ids = await registerPair(f);
    const result = await compare(
      grant(f.base, "read-history", "2026-11-19T11:02:00Z"),
      3,
      ids,
    );
    expect(result.registrationIds).toEqual(ids);
    expect(result.registryRevision).toBe(3);
    expect(
      result.transitions[0].items.every(
        (i) => i.contentState === "equal" && i.contextState === "equal",
      ),
    ).toBe(true);
    expect(result).toMatchObject({
      revisionChainVerified: false,
      historicalCoverageComplete: false,
      currentReplayVerified: false,
      persistenceAuthorized: false,
      disclosureAuthorized: false,
      remediationVerified: false,
    });
    expect(
      result.reports.every((r) => r.assessment.parentReportDigest === null),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain(f.root);
  }));
it.each(["reversed", "duplicate", "expired", "stale-revision"])(
  "rejects %s selected metadata instead of partial comparison",
  async (kind) =>
    setup(async (f) => {
      const ids = await registerPair(f);
      const chosen =
        kind === "reversed"
          ? [...ids].reverse()
          : kind === "duplicate"
            ? [ids[0], ids[0]]
            : ids;
      await expect(
        compare(
          grant(
            f.base,
            "read-history",
            kind === "expired"
              ? "2026-11-19T11:30:00Z"
              : "2026-11-19T11:02:00Z",
          ),
          kind === "stale-revision" ? 2 : 3,
          chosen,
        ),
      ).rejects.toThrow();
    }),
);
it("does not count alternate rendering manifests as distinct report revisions", async () =>
  setup(async (f) => {
    await create(grant(f.base, "create"));
    const first = await register(
      grant(f.base, "register"),
      1,
      f.binding,
      "2026-11-19T11:30:00Z",
    );
    const directory = join(f.root, "v1");
    const receipt = await saveEnterpriseReport(
      directory,
      f.report,
      "customer",
      { rendererVersion: 1 },
    );
    const second = await register(
      grant(f.base, "register"),
      2,
      {
        ...f.binding,
        reportDirectory: directory,
        manifestDigest: receipt.manifestDigest,
      },
      "2026-11-19T11:30:00Z",
    );
    await expect(
      compare(grant(f.base, "read-history"), 3, [
        first.registrationId,
        second.registrationId,
      ]),
    ).rejects.toThrow(/Duplicate logical report/);
  }));

it("keeps vanished findings distinct from remediation when an owner expectation changes", async () =>
  setup(async (f) => {
    const bundle = JSON.parse(
      await readFile(
        "skills/content-search-audit/examples/enterprise-technical-seo-evaluations.json",
        "utf8",
      ),
    );
    const source = bundle.evaluations[0].sources[0],
      raw = JSON.parse(source.artifactText);
    raw.scope.customerId = f.base.context.customerId;
    source.artifactText = JSON.stringify(raw);
    source.artifactHash = createHash("sha256")
      .update(source.artifactText)
      .digest("hex");
    const initial = resolveAuditContext(
      {
        customerId: f.base.context.customerId,
        runId: "seo-initial",
        assessmentAt: bundle.assessmentAt,
        profileIds: ["commerce"],
        entities: [{ entityId: "site", type: "site" }],
      },
      [],
    );
    await saveEnterpriseRun(join(f.root, "seo-initial"), initial);
    bundle.sourceDigest = digest(initial);
    bundle.evaluations[0].context.expectedCanonical =
      "https://example.com/wrong";
    await evaluateEnterpriseTechnicalSeo(
      join(f.root, "seo-initial"),
      bundle,
      join(f.root, "seo-first"),
    );
    async function reportFor(name, revisionId) {
      const run = await loadEnterpriseRun(join(f.root, name)),
        directory = join(f.root, name + "-report");
      const receipt = await buildStoredEnterpriseReport(
        join(f.root, name),
        {
          sourceRunDigest: digest(run),
          revisionId,
          authorId: "author",
          generatedAt: run.assessmentAt,
          brand: { name: "Synthetic", accent: "#174f7b" },
        },
        directory,
      );
      const report = await loadEnterpriseReport(directory);
      return {
        run,
        report,
        binding: {
          sourceDirectory: join(f.root, name),
          reportDirectory: directory,
          sourceRunDigest: digest(run),
          reportDigest: digest(report),
          manifestDigest: receipt.manifestDigest,
        },
      };
    }
    const first = await reportFor("seo-first", "seo-report-1");
    expect(first.report.findings.length).toBeGreaterThan(0);
    const next = {
      ...bundle,
      sourceDigest: digest(first.run),
      newRunId: "seo-next",
      assessmentAt: "2026-11-19T12:01:00Z",
      evaluations: structuredClone(bundle.evaluations),
    };
    next.evaluations[0].context.expectedCanonical = "https://example.com/";
    await evaluateEnterpriseTechnicalSeo(
      join(f.root, "seo-first"),
      next,
      join(f.root, "seo-next"),
    );
    const second = await reportFor("seo-next", "seo-report-2");
    expect(second.report.findings).toEqual([]);
    await create(grant(f.base, "create", "2026-11-19T12:01:00Z"));
    const a = await register(
      grant(f.base, "register", "2026-11-19T12:01:00Z"),
      1,
      first.binding,
      "2026-11-19T12:30:00Z",
    );
    const b = await register(
      grant(f.base, "register", "2026-11-19T12:01:00Z"),
      2,
      second.binding,
      "2026-11-19T12:30:00Z",
    );
    const result = await compare(
      grant(f.base, "read-history", "2026-11-19T12:02:00Z"),
      3,
      [a.registrationId, b.registrationId],
    );
    const findings = result.transitions[0].items.filter(
      (i) => i.collection === "findings",
    );
    expect(findings.length).toBe(first.report.findings.length);
    expect(
      findings.every(
        (i) =>
          i.contentState === "not-present" && i.contextState === "not-present",
      ),
    ).toBe(true);
    expect(result.remediationVerified).toBe(false);
    expect(result.transitions[0].additions.length).toBeGreaterThan(0);
  }));

it("reads legacy registrations without inventing missing lineage or silently migrating them", async () =>
  setup(async (f) => {
    const ids = await registerPair(f),
      readOptions = grant(f.base, "read", "2026-11-19T11:02:00Z");
    const records = [];
    for (const id of ids) records.push((await read(readOptions, id)).record);
    records[0].provenance.schemaVersion = 1;
    delete records[0].provenance.assessment;
    const state = {
      schemaVersion: 1,
      namespace: "generated-report-provenance-v1",
      customerId: f.base.context.customerId,
      storeId: f.base.context.storeId,
      records,
    };
    const scope = readOptions.authority.scopeDigest,
      nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", f.base.key, nonce);
    cipher.setAAD(
      Buffer.from(
        stableJson({
          namespace: "generated-report-provenance-v1",
          scope,
          revision: 4,
        }),
      ),
    );
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(stableJson(state))),
      cipher.final(),
    ]);
    await worker(
      "replace",
      f.base,
      scope,
      3,
      JSON.stringify({
        nonce: nonce.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64"),
      }),
    );
    const legacy = await read(readOptions, ids[0]);
    expect(legacy.record.provenance.schemaVersion).toBe(1);
    expect(legacy.record.provenance).not.toHaveProperty("assessment");
    await expect(
      compare(grant(f.base, "read-history", "2026-11-19T11:02:00Z"), 4, ids),
    ).rejects.toThrow(/Legacy provenance/);
    expect(await read(readOptions)).toEqual({ revision: 4 });
  }));
