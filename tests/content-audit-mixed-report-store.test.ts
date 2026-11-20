import { mkdtemp, realpath, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
const trace = vi.hoisted(() => ({ aad: [] }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createDecipheriv: (...args) => {
      const cipher = actual.createDecipheriv(...args);
      const set = cipher.setAAD.bind(cipher);
      cipher.setAAD = (value, ...rest) => {
        trace.aad.push(value.toString());
        return set(value, ...rest);
      };
      return cipher;
    },
  };
});
import {
  fixture,
  bundle as encodeBundle,
} from "./helpers/research-projection.js";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  planProviderRequests,
  importProviderSnapshots,
} from "../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";
import { buildStoredEnterpriseReport } from "../scripts/enterprise-report-assembly.mjs";
import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { advanceResearchAccessState } from "../scripts/enterprise-journeys/research-access-state.mjs";
import {
  createResearchControlStore,
  registerStoredResearchReviews,
  advanceStoredResearchAccess,
} from "../scripts/enterprise-journeys/research-control-store.mjs";
import {
  createResearchContentStore,
  storeResearchContentEdition,
} from "../scripts/enterprise-journeys/research-content-store.mjs";
import {
  createMixedReportStore,
  readMixedReportStore,
} from "../scripts/enterprise-mixed-report-store.mjs";

async function setup(fn) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "mixed-report-")));
  try {
    const f = await fixture();
    f.receipt.reviewedAt = f.context.assessmentAt;
    const b = encodeBundle(f),
      policyScope = f.policy.scope;
    const controlDir = join(root, "control");
    const control = {
      directory: controlDir,
      key: randomBytes(32),
      context: f.context,
      authority: {
        scopeDigest: enterpriseDigest(
          advanceResearchAccessState(null, null, f.context).scope,
        ),
        directory: controlDir,
        stagingDirectory: root,
        artifactClass: "research-control-metadata",
        allowed: true,
        observedAt: f.context.assessmentAt,
        validUntil: "2026-11-20T00:00:00Z",
        maxAgeSeconds: 3600,
      },
    };
    await createResearchControlStore(control);
    await registerStoredResearchReviews(control, 1, {
      descriptors: f.descriptors,
      researchPayloads: f.payloads,
      policy: f.policy,
      candidates: b.candidates,
      payloads: b.payloads,
    });
    const context = {
      customerId: policyScope.customerId,
      recipientId: policyScope.recipientId,
      purposeDigest: policyScope.purposeDigest,
      storeId: "research",
      assessmentAt: f.context.assessmentAt,
    };
    const contentDir = join(root, "research-content");
    const contentScope = enterpriseDigest({
      namespace: "research-report-content-v1",
      customerId: context.customerId,
      recipientId: context.recipientId,
      purposeDigest: context.purposeDigest,
      storeId: context.storeId,
      directory: contentDir,
    });
    const content = {
      directory: contentDir,
      key: randomBytes(32),
      context,
      authority: {
        scopeDigest: contentScope,
        directory: contentDir,
        stagingDirectory: root,
        artifactClass: "governed-report-content",
        operation: "create",
        allowed: true,
        observedAt: context.assessmentAt,
        validUntil: "2026-11-20T00:00:00Z",
        maxAgeSeconds: 3600,
        retainUntil: "2026-11-19T02:45:00Z",
      },
    };
    const op = (name) => ({
      ...content,
      authority: { ...content.authority, operation: name },
    });
    await createResearchContentStore(content);
    await storeResearchContentEdition(
      op("store"),
      1,
      control,
      2,
      {
        descriptors: f.descriptors,
        policy: f.policy,
        candidates: b.candidates,
      },
      {
        research: async (d) =>
          structuredClone(f.payloads.find((x) => x.sourceId === d.sourceId)),
        candidate: async (c) =>
          structuredClone(
            b.payloads.find((x) => x.candidateId === c.candidateId),
          ),
      },
    );
    const sample = JSON.parse(
      await readFile(
        "skills/content-search-audit/examples/enterprise-ga4-config.json",
        "utf8",
      ),
    );
    sample.input.customerId = context.customerId;
    const run = resolveAuditContext(
      {
        customerId: context.customerId,
        runId: "initial",
        assessmentAt: sample.input.payload.capturedAt,
        profileIds: ["commerce"],
        entities: [{ entityId: "site", type: "site" }],
      },
      [],
    );
    await saveEnterpriseRun(join(root, "initial"), run);
    await planProviderRequests(
      join(root, "initial"),
      {
        sourceDigest: enterpriseDigest(run),
        newRunId: "planned",
        assessmentAt: run.assessmentAt,
        targets: [sample.target],
      },
      join(root, "planned"),
    );
    const planned = await loadEnterpriseRun(join(root, "planned"));
    await importProviderSnapshots(
      join(root, "planned"),
      {
        sourceDigest: enterpriseDigest(planned),
        newRunId: "imported",
        assessmentAt: run.assessmentAt,
        imports: [
          {
            targetId: planned.providerTargets[0].targetId,
            input: sample.input,
          },
        ],
      },
      join(root, "run"),
    );
    const imported = await loadEnterpriseRun(join(root, "run"));
    const receipt = await buildStoredEnterpriseReport(
      join(root, "run"),
      {
        sourceRunDigest: enterpriseDigest(imported),
        revisionId: "generated-r1",
        authorId: "fixture",
        generatedAt: imported.assessmentAt,
        brand: { name: "Synthetic", accent: "#174f7b" },
      },
      join(root, "generated"),
    );
    const report = await loadEnterpriseReport(join(root, "generated"));
    const generatedBindings = [
      {
        sourceDirectory: join(root, "run"),
        reportDirectory: join(root, "generated"),
        sourceRunDigest: enterpriseDigest(imported),
        reportDigest: enterpriseDigest(report),
        manifestDigest: receipt.manifestDigest,
      },
    ];
    const mixedDir = join(root, "mixed");
    const mixedContext = {
      customerId: context.customerId,
      recipientId: context.recipientId,
      purposeDigest: context.purposeDigest,
      editionId: "edition-1",
      assessmentAt: context.assessmentAt,
    };
    const scopeDigest = enterpriseDigest({
      namespace: "enterprise-mixed-membership-v1",
      customerId: mixedContext.customerId,
      recipientId: mixedContext.recipientId,
      purposeDigest: mixedContext.purposeDigest,
      editionId: mixedContext.editionId,
      directory: mixedDir,
    });
    const mixed = {
      directory: mixedDir,
      key: randomBytes(32),
      context: mixedContext,
      authority: {
        scopeDigest,
        directory: mixedDir,
        stagingDirectory: root,
        artifactClass: "mixed-report-membership",
        operation: "create",
        allowed: true,
        observedAt: mixedContext.assessmentAt,
        validUntil: "2026-11-20T00:00:00Z",
        maxAgeSeconds: 3600,
        retainUntil: "2026-11-19T02:40:00Z",
      },
    };
    const sourceGrant = {
      customerId: mixedContext.customerId,
      recipientId: mixedContext.recipientId,
      purposeDigest: mixedContext.purposeDigest,
      bindingsDigest: enterpriseDigest(generatedBindings),
      artifactClass: "generated-report-source",
      operation: "read",
      allowed: true,
      observedAt: mixedContext.assessmentAt,
      validUntil: "2026-11-20T00:00:00Z",
      maxAgeSeconds: 3600,
    };
    const member = {
      memberId: "private-member",
      role: "current",
      inspectOptions: op("inspect"),
      readOptions: op("assemble-read"),
      expectedStoreRevision: 2,
      researchOptions: control,
      currentResearchRevision: 2,
    };
    await fn({
      f,
      root,
      control,
      content,
      mixed,
      sourceGrant,
      generatedBindings,
      member,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const mixedOp = (o, name) => ({
  ...o,
  authority: { ...o.authority, operation: name },
});
it(
  "builds a mixed report and withholds revoked research without decrypting it",
  async () =>
    setup(
      async ({
        f,
        control,
        content,
        mixed,
        sourceGrant,
        generatedBindings,
        member,
      }) => {
        await createMixedReportStore(mixed, {
          generatedBindings,
          sourceGrant,
          researchMembers: [member],
          predecessor: null,
        });
        const first = await readMixedReportStore(
          mixedOp(mixed, "read"),
          1,
          sourceGrant,
          [member],
        );
        expect(first.artifacts.json).toContain(f.raw.summary);
        expect(first.artifacts.markdown).toContain(f.raw.summary);
        expect(first.artifacts.html).toContain(f.raw.summary);
        expect(JSON.parse(first.artifacts.json).research.withheld).toBe(false);
        expect(first).toMatchObject({
          disclosureAuthorized: false,
          deliveryAuthorized: false,
        });
        await expect(
          readMixedReportStore(mixedOp(mixed, "read"), 1, sourceGrant, []),
        ).rejects.toThrow(/membership/i);
        control.context.assessmentAt = "2026-11-19T02:01:00Z";
        mixed.context.assessmentAt = control.context.assessmentAt;
        content.context.assessmentAt = control.context.assessmentAt;
        control.context.access[0].customerSummaryAllowed = false;
        await advanceStoredResearchAccess(control, 2);
        member.currentResearchRevision = 3;
        trace.aad.length = 0;
        const after = await readMixedReportStore(
          mixedOp(mixed, "read"),
          1,
          sourceGrant,
          [member],
        );
        expect(trace.aad.some((x) => x.includes('"part":"content"'))).toBe(
          false,
        );
        for (const text of [
          after.artifacts.json,
          after.artifacts.markdown,
          after.artifacts.html,
        ])
          expect(text).not.toContain(f.raw.summary);
        const report = JSON.parse(after.artifacts.json);
        expect(report.research.withheld).toBe(true);
        expect(report.generated).toEqual(
          JSON.parse(first.artifacts.json).generated,
        );
        expect(JSON.stringify(report)).not.toContain("private-member");
      },
    ),
  60_000,
);
