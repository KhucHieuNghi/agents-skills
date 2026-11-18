import { reviseEnterpriseRun } from "../skills/content-search-audit/scripts/lib/enterprise-revision.mjs";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
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

async function setup(root) {
  const run = resolveAuditContext(
    {
      customerId: "customer",
      runId: "initial",
      assessmentAt: "2026-11-18T12:00:00Z",
      profileIds: ["commerce"],
      entities: [
        { entityId: "site", type: "site" },
        { entityId: "property", type: "property" },
      ],
    },
    [],
  );
  await saveEnterpriseRun(path.join(root, "source"), run);
  const query = {
    dateRanges: [{ startDate: "2026-10-01", endDate: "2026-10-31" }],
    metrics: [{ name: "activeUsers" }],
  };
  const target = {
    kind: "ga4-report",
    entityId: "property",
    resource: "properties/123",
    windowId: "october",
    expectedQuery: query,
    maxAgeSeconds: 86400,
  };
  const responseText = JSON.stringify({
    metricHeaders: [{ name: "activeUsers", type: "TYPE_INTEGER" }],
    rows: [{ metricValues: [{ value: "10" }] }],
    rowCount: 1,
    metadata: { timeZone: "UTC", currencyCode: "USD" },
  });
  const input = {
    customerId: "customer",
    entityId: "property",
    payload: {
      sourceId: "sample",
      property: "properties/123",
      locator: "supplied-export",
      capturedAt: "2026-11-18T12:00:00Z",
      synthetic: true,
      pages: [
        {
          request: { ...query, limit: "10" },
          responseText,
          responseHash: createHash("sha256").update(responseText).digest("hex"),
        },
      ],
    },
  };
  return { run, target, input };
}
it("plans bound requests and imports into immutable new revisions without passing checks", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "provider-workflow-"));
  try {
    const { run, target, input } = await setup(root);
    await planProviderRequests(
      path.join(root, "source"),
      {
        sourceDigest: enterpriseDigest(run),
        newRunId: "planned",
        assessmentAt: run.assessmentAt,
        targets: [target],
      },
      path.join(root, "planned"),
    );
    const planned = await loadEnterpriseRun(path.join(root, "planned"));
    const binding = planned.providerTargets[0];
    expect(
      planned.dataRequests.find((request) => request.id === binding.requestId)
        .scopeKey,
    ).toBe("property");
    await importProviderSnapshots(
      path.join(root, "planned"),
      {
        sourceDigest: enterpriseDigest(planned),
        newRunId: "imported",
        assessmentAt: "2026-11-18T13:00:00Z",
        imports: [{ targetId: binding.targetId, input }],
      },
      path.join(root, "imported"),
    );
    const imported = await loadEnterpriseRun(path.join(root, "imported"));
    expect(
      imported.dataRequests.find(
        (request) => request.id === imported.providerTargets[0].requestId,
      ).status,
    ).toBe("provided");
    expect(imported.checks.every((check) => check.status === "unknown")).toBe(
      true,
    );
    expect(imported.evidence).toHaveLength(1);
    expect(
      (await loadEnterpriseRun(path.join(root, "planned"))).evidence,
    ).toHaveLength(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("keeps refusals and records invalid imports while independent valid inputs continue", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "provider-partial-"));
  try {
    const { run, target, input } = await setup(root);
    await planProviderRequests(
      path.join(root, "source"),
      {
        sourceDigest: enterpriseDigest(run),
        newRunId: "planned",
        assessmentAt: run.assessmentAt,
        targets: [
          target,
          { ...target, kind: "ga4-config", windowId: "configuration" },
        ],
      },
      path.join(root, "planned"),
    );
    const planned = await loadEnterpriseRun(path.join(root, "planned"));
    const result = await importProviderSnapshots(
      path.join(root, "planned"),
      {
        sourceDigest: enterpriseDigest(planned),
        newRunId: "partial",
        assessmentAt: "2026-11-18T13:00:00Z",
        imports: [
          { targetId: planned.providerTargets[0].targetId, input },
          { targetId: planned.providerTargets[1].targetId, input },
        ],
      },
      path.join(root, "partial"),
    );
    expect(result.imports.map((item) => item.status)).toEqual([
      "imported",
      "invalid",
    ]);
    const partial = await loadEnterpriseRun(path.join(root, "partial"));
    partial.dataRequests.find(
      (request) => request.id === partial.providerTargets[0].requestId,
    ).status = "declined";
    await saveEnterpriseRun(path.join(root, "declined"), partial);
    const refused = await importProviderSnapshots(
      path.join(root, "declined"),
      {
        sourceDigest: enterpriseDigest(partial),
        newRunId: "refused",
        assessmentAt: "2026-11-18T14:00:00Z",
        imports: [{ targetId: partial.providerTargets[0].targetId, input }],
      },
      path.join(root, "refused"),
    );
    expect(refused.imports[0].status).toBe("declined");
    const refusedRun = await loadEnterpriseRun(path.join(root, "refused"));
    await reviseEnterpriseRun(
      path.join(root, "refused"),
      {
        sourceDigest: enterpriseDigest(refusedRun),
        newRunId: "reopened",
        assessmentAt: "2026-11-18T15:00:00Z",
        responses: [
          {
            requestId: refusedRun.providerTargets[0].requestId,
            outcome: "reopen",
            actor: "owner",
            at: "2026-11-18T15:00:00Z",
            reason: "Owner explicitly supplies export now",
          },
        ],
      },
      path.join(root, "reopened"),
    );
    const reopened = await loadEnterpriseRun(path.join(root, "reopened"));
    const retried = await importProviderSnapshots(
      path.join(root, "reopened"),
      {
        sourceDigest: enterpriseDigest(reopened),
        newRunId: "retried",
        assessmentAt: "2026-11-18T16:00:00Z",
        imports: [{ targetId: reopened.providerTargets[0].targetId, input }],
      },
      path.join(root, "retried"),
    );
    expect(retried.imports[0].status).toBe("imported");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("exposes the provider plan/import workflow through the installed-style CLI", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "provider-cli-"));
  try {
    const { run, target, input } = await setup(root);
    const cli = (...args) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          ["skills/content-search-audit/scripts/audit.mjs", ...args],
          { encoding: "utf8" },
        ),
      );
    await writeFile(
      path.join(root, "plan.json"),
      JSON.stringify({
        sourceDigest: enterpriseDigest(run),
        newRunId: "planned",
        assessmentAt: run.assessmentAt,
        targets: [target],
      }),
    );
    cli(
      "enterprise-provider-plan",
      path.join(root, "source"),
      path.join(root, "plan.json"),
      path.join(root, "planned"),
    );
    const planned = await loadEnterpriseRun(path.join(root, "planned"));
    await writeFile(
      path.join(root, "imports.json"),
      JSON.stringify({
        sourceDigest: enterpriseDigest(planned),
        newRunId: "imported",
        assessmentAt: "2026-11-18T13:00:00Z",
        imports: [{ targetId: planned.providerTargets[0].targetId, input }],
      }),
    );
    expect(
      cli(
        "enterprise-provider-import",
        path.join(root, "planned"),
        path.join(root, "imports.json"),
        path.join(root, "result"),
      ).imports[0].status,
    ).toBe("imported");
    expect(
      JSON.parse(
        await readFile(path.join(root, "result/enterprise-run.json"), "utf8"),
      ).evidence,
    ).toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("archives assessed verdicts when replacement evidence arrives and rejects stale import bindings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "provider-replace-"));
  try {
    const { run, target, input } = await setup(root);
    await planProviderRequests(
      path.join(root, "source"),
      {
        sourceDigest: enterpriseDigest(run),
        newRunId: "planned",
        assessmentAt: run.assessmentAt,
        targets: [target],
      },
      path.join(root, "planned"),
    );
    const planned = await loadEnterpriseRun(path.join(root, "planned"));
    await importProviderSnapshots(
      path.join(root, "planned"),
      {
        sourceDigest: enterpriseDigest(planned),
        newRunId: "first",
        assessmentAt: "2026-11-18T13:00:00Z",
        imports: [{ targetId: planned.providerTargets[0].targetId, input }],
      },
      path.join(root, "first"),
    );
    const assessed = await loadEnterpriseRun(path.join(root, "first"));
    const request = assessed.dataRequests.find(
      (r) => r.id === assessed.providerTargets[0].requestId,
    );
    const check = assessed.checks.find((c) =>
      request.affectedCheckIds.includes(c.checkId),
    );
    Object.assign(check, {
      status: "pass",
      reason: "Synthetic assessed control",
      assessedAt: assessed.assessmentAt,
      evidenceIds: [...request.evidenceIds],
      dependencies: [...request.evidenceIds],
    });
    await saveEnterpriseRun(path.join(root, "assessed"), assessed);
    const bundle = {
      sourceDigest: enterpriseDigest(assessed),
      newRunId: "replacement",
      assessmentAt: "2026-11-18T14:00:00Z",
      imports: [{ targetId: assessed.providerTargets[0].targetId, input }],
    };
    await expect(
      importProviderSnapshots(
        path.join(root, "assessed"),
        { ...bundle, sourceDigest: "0".repeat(64) },
        path.join(root, "bad"),
      ),
    ).rejects.toThrow(/binding/);
    await importProviderSnapshots(
      path.join(root, "assessed"),
      bundle,
      path.join(root, "replacement"),
    );
    const replaced = await loadEnterpriseRun(path.join(root, "replacement"));
    expect(
      replaced.checks.find((c) => c.checkId === check.checkId).status,
    ).toBe("unknown");
    expect(
      replaced.history.some(
        (item) =>
          item.check.checkId === check.checkId && item.check.status === "pass",
      ),
    ).toBe(true);
    expect(replaced.evidence).toHaveLength(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("rejects unsatisfiable provider obligations before writing a run", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "provider-plan-contract-"));
  try {
    const { run, target } = await setup(root);
    const invalid = [
      { ...target, kind: "gsc-inspection", resource: "sc-domain:example.com" },
      { ...target, expectedQuery: {} },
      {
        ...target,
        expectedQuery: {
          ...target.expectedQuery,
          metrics: [{ name: "activeUsers" }, { name: "activeUsers" }],
        },
      },
      {
        ...target,
        kind: "gsc-search",
        resource: "sc-domain:example.com",
        expectedQuery: { startDate: "2026-10-01", endDate: "2026-10-31" },
        expectedTimezone: "UTC",
      },
      { ...target, expectedQuery: { ...target.expectedQuery, limit: "10" } },
      {
        ...target,
        expectedQuery: {
          ...target.expectedQuery,
          dateRanges: [{ startDate: "2026-02-30", endDate: "2026-03-01" }],
        },
      },
      {
        ...target,
        kind: "gsc-search",
        resource: "sc-domain:example.com",
        expectedQuery: { startDate: "2026-11-01", endDate: "2026-10-01" },
      },
      {
        ...target,
        kind: "bing-search",
        resource: "https://example.com",
        expectedScope: {},
      },
      {
        ...target,
        kind: "business-observations",
        resource: "orders",
        dictionary: { version: "1", sourceSystem: "orders" },
        window: { from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" },
      },
      {
        ...target,
        kind: "business-observations",
        resource: "orders",
        dictionary: {
          version: "1",
          sourceSystem: "orders",
          outcomes: [
            {
              outcomeId: "sale",
              businessModel: "commerce",
              allowedStatuses: ["settled"],
              successStatuses: ["settled"],
            },
          ],
        },
        window: { from: "2026-11-01T00:00:00Z", to: "2026-10-01T00:00:00Z" },
      },
    ];
    for (const [index, invalidTarget] of invalid.entries()) {
      const destination = path.join(root, "invalid-" + index);
      await expect(
        planProviderRequests(
          path.join(root, "source"),
          {
            sourceDigest: enterpriseDigest(run),
            newRunId: "planned-" + index,
            assessmentAt: run.assessmentAt,
            targets: [invalidTarget],
          },
          destination,
        ),
      ).rejects.toThrow();
      await expect(
        readFile(path.join(destination, "enterprise-run.json")),
      ).rejects.toThrow();
    }
    expect((await loadEnterpriseRun(path.join(root, "source"))).checks).toEqual(
      run.checks,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("canonicalizes valid GSC defaults and imports a business dictionary without inventing acceptance", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "provider-valid-contract-"));
  try {
    const { run } = await setup(root);
    const query = { startDate: "2026-10-01", endDate: "2026-10-31" };
    const dictionary = {
      version: "1",
      sourceSystem: "orders",
      outcomes: [
        {
          outcomeId: "sale",
          businessModel: "commerce",
          allowedStatuses: ["settled", "refunded"],
          successStatuses: ["settled"],
        },
      ],
    };
    await planProviderRequests(
      path.join(root, "source"),
      {
        sourceDigest: enterpriseDigest(run),
        newRunId: "planned",
        assessmentAt: run.assessmentAt,
        targets: [
          {
            kind: "gsc-search",
            entityId: "site",
            resource: "sc-domain:example.com",
            windowId: "oct-search",
            maxAgeSeconds: 86400,
            expectedQuery: query,
          },
          {
            kind: "business-observations",
            entityId: "site",
            resource: "orders",
            windowId: "oct-orders",
            maxAgeSeconds: 86400,
            dictionary,
            window: {
              from: "2026-10-01T00:00:00Z",
              to: "2026-11-01T00:00:00Z",
            },
          },
        ],
      },
      path.join(root, "planned"),
    );
    const planned = await loadEnterpriseRun(path.join(root, "planned"));
    expect(planned.providerTargets[0].configuration.expectedQuery).toEqual({
      ...query,
      dimensions: [],
      type: "web",
      aggregationType: "auto",
      dataState: "final",
    });
    const responseText = JSON.stringify({
      rows: [],
      responseAggregationType: "byProperty",
    });
    const input = {
      customerId: "customer",
      entityId: "site",
      payload: {
        sourceId: "search",
        property: "sc-domain:example.com",
        locator: "supplied-export",
        capturedAt: run.assessmentAt,
        synthetic: true,
        pages: [
          {
            request: query,
            responseText,
            responseHash: createHash("sha256")
              .update(responseText)
              .digest("hex"),
          },
        ],
      },
    };
    const business = {
      customerId: "customer",
      entityId: "site",
      sourceId: "orders",
      sourceSystem: "orders",
      sourceKind: "export",
      dictionaryVersion: "1",
      capturedAt: run.assessmentAt,
      synthetic: true,
      records: [
        {
          recordId: "o1",
          subjectId: null,
          outcomeId: "sale",
          status: "refunded",
          occurredAt: "2026-10-15T00:00:00Z",
        },
      ],
    };
    const result = await importProviderSnapshots(
      path.join(root, "planned"),
      {
        sourceDigest: enterpriseDigest(planned),
        newRunId: "imported",
        assessmentAt: run.assessmentAt,
        imports: [
          { targetId: planned.providerTargets[0].targetId, input },
          { targetId: planned.providerTargets[1].targetId, input: business },
        ],
      },
      path.join(root, "imported"),
    );
    expect(result.imports.map((x) => x.status)).toEqual([
      "imported",
      "imported",
    ]);
    const imported = await loadEnterpriseRun(path.join(root, "imported"));
    expect(imported.checks.every((x) => x.status === "unknown")).toBe(true);
    expect(
      imported.evidence[1].content.normalized.records[0].matchesDeclaredSuccess,
    ).toBe(false);
    expect(imported.providerTargets[0].targetId).toBe(
      planned.providerTargets[0].targetId,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
