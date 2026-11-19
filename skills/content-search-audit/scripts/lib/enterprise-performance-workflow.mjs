import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import {
  enterpriseDigest,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
  stableJson,
  validateEnterpriseRun,
} from "./enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "./enterprise-provider-workflow.mjs";
import { createDataRequest } from "./data-requests.mjs";
import { evaluateCruxField } from "./performance-crux.mjs";
import { evaluateLighthouseLab } from "./performance-lighthouse.mjs";

const assert = (x, m) => {
  if (!x) throw Error(m);
};
const shape = (x, keys, label) =>
  assert(
    x &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.keys(x).every((k) => keys.includes(k)),
    `Invalid ${label}`,
  );
const id = (x) => typeof x === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(x);
const evaluatorDigest = enterpriseDigest(
  await Promise.all(
    [
      "./enterprise-performance-workflow.mjs",
      "./performance-crux.mjs",
      "./performance-lighthouse.mjs",
      "./enterprise-state.mjs",
      "./enterprise-provider-workflow.mjs",
      "./data-requests.mjs",
    ].map(async (p) => [
      p,
      await readFile(new URL(p, import.meta.url), "utf8"),
    ]),
  ),
);
const scopeKey = (entry) => {
  const dimensions = { ...entry.context };
  delete dimensions.maxAgeDays;
  delete dimensions.maxAgeSeconds;
  delete dimensions.authorizedNormalizedUrls;
  return enterpriseDigest([entry.kind, dimensions]);
};
const sameIds = (a, b) =>
  Array.isArray(a) &&
  new Set(a).size === a.length &&
  stableJson([...a].sort()) === stableJson([...b].sort());
function validatedIndex(run) {
  const records = run.performanceEvaluations ?? [];
  const lineage = [run.runId, ...(run.parentRunIds ?? [])];
  assert(Array.isArray(records), "Invalid performance index");
  const ids = new Set(),
    scopes = new Set(),
    ownedEvidence = new Set();
  const validated = records.map((record) => {
    shape(
      record,
      [
        "evaluationId",
        "kind",
        "scopeDigest",
        "evidenceId",
        "checkIds",
        "dataRequestArtifacts",
        "historyEvidenceIds",
        "revisionRunId",
      ],
      "performance index record",
    );
    assert(
      id(record.evaluationId) && !ids.has(record.evaluationId),
      "Duplicate/invalid performance index identity",
    );
    ids.add(record.evaluationId);
    assert(
      Array.isArray(record.historyEvidenceIds) &&
        record.historyEvidenceIds.length <= 100 &&
        new Set(record.historyEvidenceIds).size ===
          record.historyEvidenceIds.length &&
        !record.historyEvidenceIds.includes(record.evidenceId),
      "Invalid performance history index",
    );
    assert(
      [run.runId, ...(run.parentRunIds ?? [])].includes(record.revisionRunId),
      "Unbound performance activation revision",
    );
    const evidence = run.evidence.find(
        (e) => e.evidenceId === record.evidenceId,
      ),
      content = evidence?.content,
      entry = content?.entry;
    assert(
      evidence &&
        evidence.artifactType === "performance-evaluation" &&
        evidence.evidenceId === `performance-${enterpriseDigest(content)}` &&
        evidence.digest === enterpriseDigest(content),
      "Unbound performance index evidence",
    );
    assert(
      entry &&
        entry.evaluationId === record.evaluationId &&
        entry.kind === record.kind &&
        ["crux", "lighthouse"].includes(entry.kind) &&
        entry.context.entityId === evidence.entityId &&
        record.scopeDigest === scopeKey(entry) &&
        !scopes.has(record.scopeDigest),
      "Performance index identity/scope mismatch",
    );
    scopes.add(record.scopeDigest);
    assert(
      content.evaluatorDigest === evaluatorDigest &&
        content.replayContract === "supplied-inputs-v1" &&
        Array.isArray(content.executionReceiptDigests) &&
        content.executionReceiptDigests.length === 0,
      "Unsupported persisted performance replay contract",
    );
    assert(
      run.policyVersions[`performance-${entry.evaluationId}`] ===
        enterpriseDigest([entry.kind, entry.context, evaluatorDigest]),
      "Performance policy mismatch",
    );
    const compiled = compilePerformance(entry, {
      customerId: run.customerId,
      runId: evidence.runId,
      assessmentAt: content.assessmentAt,
    });
    for (const baseId of [record.evidenceId, ...record.historyEvidenceIds]) {
      const base = run.evidence.find((e) => e.evidenceId === baseId);
      assert(
        base &&
          lineage.includes(base.runId) &&
          lineage.indexOf(base.runId) >= lineage.indexOf(record.revisionRunId),
        "Performance activation predates evidence origin",
      );
      assert(
        base?.content?.entry &&
          base.content.evaluatorDigest === evaluatorDigest &&
          base.content.entry.evaluationId === record.evaluationId &&
          scopeKey(base.content.entry) === record.scopeDigest &&
          Date.parse(base.observedAt) <= Date.parse(evidence.observedAt),
        "Invalid performance history scope or chronology",
      );
      const replayed =
        baseId === record.evidenceId
          ? compiled
          : compilePerformance(base.content.entry, {
              customerId: run.customerId,
              runId: base.runId,
              assessmentAt: base.content.assessmentAt,
            });
      assert(
        replayed.index.evidenceId === baseId,
        "Unbound historical performance base",
      );
      for (const expectedEvidence of replayed.evidence) {
        const actual = run.evidence.find(
          (e) => e.evidenceId === expectedEvidence.evidenceId,
        );
        assert(
          actual && stableJson(actual) === stableJson(expectedEvidence),
          "Performance compiled evidence mismatch",
        );
        ownedEvidence.add(expectedEvidence.evidenceId);
      }
    }
    for (const expectedRequest of compiled.requests) {
      const matching = run.dataRequests.filter(
        (r) => r.requestedArtifact === expectedRequest.requestedArtifact,
      );
      assert(
        matching.length === 1,
        "Incomplete or duplicate performance index data requests",
      );
      const actual = matching[0];
      const normalized = {
        ...actual,
        id: expectedRequest.id,
        runId: expectedRequest.runId,
        status: expectedRequest.status,
        reason: expectedRequest.reason,
        evidenceIds: [],
        evidenceDigests: {},
      };
      delete normalized.invalidatedEvidenceDigests;
      assert(
        stableJson(normalized) === stableJson(expectedRequest),
        "Performance index request descriptor mismatch",
      );
    }
    assert(
      sameIds(record.checkIds, compiled.index.checkIds),
      "Performance index check ownership mismatch",
    );
    assert(
      sameIds(record.dataRequestArtifacts, compiled.index.dataRequestArtifacts),
      "Incomplete performance index data requests",
    );
    for (const expected of compiled.checks) {
      const actual = run.checks.find((c) => c.checkId === expected.checkId);
      assert(actual, "Performance index check ownership mismatch");
      const normalized = { ...actual, review: null };
      if (
        actual.status === "unknown" &&
        actual.assessedAt === null &&
        actual.review === null
      ) {
        normalized.status = expected.status;
        normalized.reason = expected.reason;
        normalized.assessedAt = expected.assessedAt;
      }
      assert(
        stableJson(normalized) === stableJson(expected),
        "Performance cached field/lab verdict mismatch",
      );
      assert(
        run.ruleVersions[`performance/${expected.ruleId}`] ===
          expected.ruleVersion,
        "Performance rule version mismatch",
      );
    }
    return record;
  });
  const ownedIds = new Set(validated.flatMap((record) => record.checkIds));
  assert(
    run.checks.every(
      (check) =>
        !check.dependencies.some((dependency) =>
          dependency.startsWith("performance-check-"),
        ) || ownedIds.has(check.checkId),
    ),
    "Unindexed performance check ownership",
  );
  assert(
    run.evidence
      .filter((e) => e.artifactType === "performance-evaluation")
      .every((e) => ownedEvidence.has(e.evidenceId)),
    "Unowned performance evidence",
  );
  const ownedRequests = new Set(
    validated.flatMap((r) => r.dataRequestArtifacts),
  );
  assert(
    run.dataRequests
      .filter(
        (r) =>
          r.requestedArtifact.startsWith("performance-") &&
          r.requestedArtifact !== "performance-observations",
      )
      .every((r) => ownedRequests.has(r.requestedArtifact)),
    "Unowned performance data request",
  );
  return validated;
}
/** Original-input replay inventory; no receipt hashes restore collector authority. */
export function inspectEnterprisePerformance(run) {
  validateEnterpriseRun(run);
  const records = validatedIndex(run);
  const evaluations = [];
  for (const record of records)
    for (const id of [record.evidenceId, ...record.historyEvidenceIds]) {
      const base = run.evidence.find((e) => e.evidenceId === id);
      const compiled = compilePerformance(base.content.entry, {
        customerId: run.customerId,
        runId: base.runId,
        assessmentAt: base.content.assessmentAt,
      });
      evaluations.push({
        evidenceId: id,
        kind: record.kind,
        current: id === record.evidenceId,
        observedAt: base.observedAt,
        checkIds: compiled.checks.map((c) => c.checkId),
        observations: compiled.observations.map((o) => ({
          ...o,
          classification:
            id === record.evidenceId &&
            o.evidenceIds.every(
              (id) =>
                Date.parse(
                  run.evidence.find((e) => e.evidenceId === id).validUntil,
                ) > Date.parse(run.assessmentAt),
            )
              ? o.classification
              : "historical",
        })),
      });
    }
  return {
    sourceRunDigest: enterpriseDigest(run),
    evaluatorDigest,
    evaluations,
    assessmentAccepted: false,
  };
}

/** Preserve verified parent observations, demoting expired or superseded snapshots only. */
export function mergePerformanceObservations(run, previous, additions) {
  const byId = new Map();
  for (const observation of previous) {
    const dependencies = observation.evidenceIds.map((id) =>
      run.evidence.find((e) => e.evidenceId === id),
    );
    assert(dependencies.every(Boolean), "Missing prior observation evidence");
    const stale = dependencies.some(
      (e) =>
        e.validUntil !== null &&
        Date.parse(e.validUntil) <= Date.parse(run.assessmentAt),
    );
    const superseded = dependencies.some((e) => {
      const evaluationId = e.content?.evaluationEvidenceId;
      if (!evaluationId) return false;
      const source = run.evidence.find(
        (item) => item.evidenceId === evaluationId,
      );
      const entry = source?.content?.entry;
      return (
        entry &&
        run.performanceEvaluations?.some(
          (record) =>
            record.evaluationId === entry.evaluationId &&
            record.evidenceId !== evaluationId,
        )
      );
    });
    byId.set(observation.observationId, {
      ...observation,
      classification:
        stale || superseded ? "historical" : observation.classification,
    });
  }
  for (const observation of additions) {
    const old = byId.get(observation.observationId);
    if (old)
      assert(
        enterpriseDigest({
          ...old,
          classification: observation.classification,
        }) === enterpriseDigest(observation),
        "Conflicting observation revision",
      );
    else byId.set(observation.observationId, observation);
  }
  return [...byId.values()];
}
function fieldRows(result) {
  const metrics = result.checks.filter((c) => c.ruleId !== "cwv-all-three-v1");
  return result.checks.map((c) => ({
    ...c,
    sourceIds:
      c.ruleId === "cwv-all-three-v1" && c.status === "fail"
        ? [
            ...new Set(
              metrics
                .filter((m) => m.status === "fail")
                .flatMap((m) => m.evidenceIds),
            ),
          ]
        : c.evidenceIds,
    reason: `Field ${c.ruleId}: ${c.reason}${c.classification ? `; ${c.classification}` : ""}. ${c.missingReasons?.join(", ") ?? ""} Scoped CrUX population only; not a whole-site or business-impact conclusion.`,
  }));
}
function labRows(result, context) {
  const complete =
    result.groups.length > 0 &&
    result.groups.every((g) => g.statistics !== null) &&
    result.accounting.partial === 0 &&
    result.accounting.unsupported === 0 &&
    result.accounting.conflicted === 0 &&
    result.accounting.runtimeFailed === 0;
  return [
    {
      ruleId: "lab-repeat-evidence",
      ruleVersion: "1",
      scenarioId: enterpriseDigest([
        "lab",
        context.targetUrl,
        context.formFactor,
        context.environment,
        context.protocolDigest,
      ]),
      windowId: enterpriseDigest(context.window),
      status: complete ? "pass" : "unknown",
      sourceIds: result.measurements.flatMap((m) => m.sourceIds),
      reason: `Lab measurement evidence ${complete ? "supports comparable repeated diagnostics" : "is incomplete or requires investigation"}. Successful ${result.accounting.successful}; runtime failures ${result.accounting.runtimeFailed}; unsupported ${result.accounting.unsupported}; partial ${result.accounting.partial}; conflicted ${result.accounting.conflicted}. This checks measurement evidence, not website health or field CWV.`,
    },
  ];
}
function expiryBySource(result, entry, at) {
  if (entry.kind === "crux")
    return new Map(
      result.records.map((r) => [
        r.sourceId,
        r.validUntil ? Date.parse(r.validUntil) : Date.parse(at),
      ]),
    );
  return new Map(
    result.measurements.flatMap((m) =>
      m.sourceIds.map((sourceId) => [
        sourceId,
        m.validUntil ? Date.parse(m.validUntil) : Date.parse(at),
      ]),
    ),
  );
}
function observations(entry, result, evidenceId, digest, at) {
  const output = [],
    prefix = `performance-${entry.evaluationId}-${digest.slice(0, 16)}`;
  const add = (
    key,
    label,
    value,
    unit,
    period,
    scope,
    fresh,
    precision = "exact",
    expires = Math.max(
      Date.parse(at),
      ...expiryBySource(result, entry, at).values(),
    ),
  ) =>
    output.push({
      observationId: `${prefix}-${key}`,
      label,
      value,
      unit,
      precision,
      period,
      scopeDescription: scope,
      classification:
        fresh && expires > Date.parse(at) ? "current" : "historical",
      _expires: expires,
      evidenceIds: [evidenceId],
    });
  if (entry.kind === "crux") {
    for (const record of result.records.filter((r) => r.status === "record"))
      for (const [name, metric] of Object.entries(record.metrics)) {
        add(
          `${record.sourceId}-${name}`,
          `Field CrUX ${name.toUpperCase()} p75`,
          Number(metric.p75),
          metric.unit,
          record.period,
          `Supplied CrUX ${record.returnedTarget.kind} ${record.returnedTarget.value}; ${record.formFactor}; collection dates UTC-08:00. Native ${metric.classification}; requested assessment eligibility ${record.eligible}. Available Chrome population, not all visitors; hash integrity is not provider authentication.`,
          record.fresh,
          "approximate",
          Date.parse(record.validUntil),
        );
      }
  } else {
    for (const m of result.measurements) {
      const period = {
          from: m.fetchTime.slice(0, 10),
          to: m.fetchTime.slice(0, 10),
        },
        fresh = Boolean(
          m.validUntil && Date.parse(m.validUntil) > Date.parse(at),
        );
      const description = `Supplied Lighthouse ${m.lighthouseVersion}; requested ${entry.context.targetUrl}; displayed ${m.finalDisplayedUrl ?? "unresolved"}; scoring form factor ${entry.context.formFactor}; ${m.status}${m.conflicting ? "; conflicting aliases" : ""}. Lab diagnostics only; no field CWV or business impact. Issues: ${m.issues.join(", ") || "none reported"}.`;
      if (!m.conflicting) {
        for (const [name, metric] of Object.entries(m.metrics))
          add(
            `${m.measurementId}-${name}`,
            `Lab Lighthouse ${name}`,
            metric.value,
            metric.unit,
            period,
            description,
            fresh,
            "approximate",
            Date.parse(m.validUntil ?? at),
          );
        if (typeof m.performanceScore === "number")
          add(
            `${m.measurementId}-score`,
            "Lab Lighthouse performance score",
            m.performanceScore,
            "native 0–1 score",
            period,
            description,
            fresh,
            "exact",
            Date.parse(m.validUntil ?? at),
          );
      }
    }
    const period = {
      from: entry.context.window.from.slice(0, 10),
      to: entry.context.window.to.slice(0, 10),
    };
    for (const [name, value] of Object.entries(result.accounting))
      add(
        `accounting-${name}`,
        `Lab supplied-record accounting: ${name}`,
        value,
        "records",
        period,
        `Declared lab window for ${entry.context.targetUrl}; ${entry.context.formFactor}. Counts describe supplied records, not all visits or website quality.`,
        true,
      );
    for (const g of result.groups.filter((g) => g.statistics))
      for (const [name, statistics] of Object.entries(g.statistics))
        for (const statistic of ["min", "median", "max"]) {
          add(
            `${g.groupId}-${name}-${statistic}`,
            `Lab repeated ${name} ${statistic}`,
            statistics[statistic],
            name === "performanceScore"
              ? "native 0–1 score"
              : name === "cls"
                ? "unitless"
                : "millisecond",
            period,
            `Collector-bound lab protocol ${entry.context.protocolDigest}; ${entry.context.targetUrl}; ${entry.context.formFactor}. ${g.successful} successful of ${g.attempts} supplied attempts, ${g.runtimeFailures} runtime failures. Summary only of successful comparable runs; no field or causal claim.`,
            true,
            "approximate",
            Math.min(
              ...result.measurements
                .filter(
                  (m) =>
                    g.measurements.includes(m.measurementId) &&
                    m.status === "measured" &&
                    !m.conflicting,
                )
                .map((m) => Date.parse(m.validUntil)),
            ),
          );
        }
  }
  return output;
}

/** Deterministic persisted compilation; never receives trusted collector state. */
function compilePerformance(entry, owner) {
  const context = {
    ...entry.context,
    customerId: owner.customerId,
    assessmentAt: owner.assessmentAt,
  };
  const result =
    entry.kind === "crux"
      ? evaluateCruxField(context, entry.sources)
      : evaluateLighthouseLab(context, entry.sources);
  const policyId = `performance-${entry.evaluationId}`;
  const policyDigest = enterpriseDigest([
    entry.kind,
    entry.context,
    evaluatorDigest,
  ]);
  const expiries = expiryBySource(result, entry, owner.assessmentAt);
  const content = {
    entry,
    assessmentAt: owner.assessmentAt,
    evaluatorDigest,
    replayContract: "supplied-inputs-v1",
    executionReceiptDigests: [],
  };
  const digest = enterpriseDigest(content),
    evidenceId = `performance-${digest}`;
  const evidence = {
    evidenceId,
    customerId: owner.customerId,
    runId: owner.runId,
    entityId: context.entityId,
    source: `supplied-${entry.kind}-performance-evaluation`,
    artifactType: "performance-evaluation",
    scopeKey: context.entityId,
    windowId: entry.evaluationId,
    observedAt: owner.assessmentAt,
    validUntil: new Date(
      Math.max(Date.parse(owner.assessmentAt), ...expiries.values()),
    ).toISOString(),
    digest,
    content,
  };
  const evidenceRecords = [evidence],
    ruleVersions = {},
    projectedObservations = [];
  const rows =
      entry.kind === "crux" ? fieldRows(result) : labRows(result, context),
    checks = [],
    requests = [];
  for (const row of rows) {
    assert(
      row.sourceIds.every((sourceId) => expiries.has(sourceId)),
      "Unresolved performance source",
    );
    const expiry = row.sourceIds.length
      ? Math.min(...row.sourceIds.map((k) => expiries.get(k)))
      : Date.parse(owner.assessmentAt);
    const rowContent = {
      evaluationEvidenceId: evidenceId,
      row,
      evaluatorDigest,
    };
    const rowEvidence = {
      ...evidence,
      evidenceId: `performance-check-${enterpriseDigest(rowContent)}`,
      digest: enterpriseDigest(rowContent),
      content: rowContent,
      validUntil: new Date(
        Math.max(expiry, Date.parse(owner.assessmentAt)),
      ).toISOString(),
    };
    evidenceRecords.push(rowEvidence);
    const ruleId = `performance-${entry.evaluationId}-${row.ruleId}`;
    ruleVersions[`performance/${ruleId}`] = row.ruleVersion;
    const status =
      expiry > Date.parse(owner.assessmentAt) ? row.status : "unknown";
    const check = {
      moduleId: "performance",
      ruleId,
      ruleVersion: row.ruleVersion,
      entityId: context.entityId,
      scenarioId: row.scenarioId,
      windowId: row.windowId,
      status,
      reason:
        status !== row.status
          ? `Performance evidence expired. ${row.reason}`
          : row.reason,
      evidenceIds: [rowEvidence.evidenceId],
      dependencies: [rowEvidence.evidenceId],
      policyIds: [policyId],
      assessedAt: ["pass", "fail"].includes(status) ? owner.assessmentAt : null,
      review: null,
    };
    check.checkId = checkIdentity(check);
    checks.push(check);
    if (status === "unknown") {
      const request = createDataRequest({
        customerId: owner.customerId,
        runId: owner.runId,
        requestedArtifact: ruleId,
        scopeKey: context.entityId,
        windowId: row.windowId,
        moduleIds: ["performance"],
        affectedCheckIds: [check.checkId],
        reason: check.reason,
        acceptedFormats: ["Native JSON", "Scoped measurement receipt"],
        leastPrivilegeAccess:
          "Read-only exports and collector evidence; never send passwords or API keys. No website change is authorized.",
        exportInstructions: `Target ${entry.kind === "crux" ? JSON.stringify(context.target) : context.targetUrl}; device ${context.formFactor}; window ${JSON.stringify(context.period ?? context.window)}. ${entry.kind === "crux" ? "Supply exact native CrUX response/request with all three p75 metrics and capture time; preserve no-record, stale, origin-only and conflict states. Never replace INP with lab TBT." : "Supply native Lighthouse 13.6.0 navigation JSON, full settings and at least three sequential comparable runs with authorized collector receipts. Retain failed/unsupported attempts and warnings; imported receipt JSON is not execution authority."}`,
        suggestedOwnerRole: "Website performance and analytics owners",
        fallback:
          "Keep the affected check unknown and continue independent checks. Field and lab cannot substitute for each other.",
        priority: "medium",
      });
      requests.push(request);
    }
  }
  const index = {
    evaluationId: entry.evaluationId,
    kind: entry.kind,
    scopeDigest: scopeKey(entry),
    evidenceId,
    checkIds: checks.map((c) => c.checkId),
    dataRequestArtifacts: requests.map((r) => r.requestedArtifact),
  };
  for (const item of observations(
    entry,
    result,
    evidenceId,
    digest,
    owner.assessmentAt,
  )) {
    const { _expires, ...observation } = item;
    const observationContent = {
      evaluationEvidenceId: evidenceId,
      observation,
      evaluatorDigest,
    };
    const observationEvidence = {
      ...evidence,
      evidenceId: `performance-observation-${enterpriseDigest(observationContent)}`,
      digest: enterpriseDigest(observationContent),
      content: observationContent,
      validUntil: new Date(
        Math.max(_expires, Date.parse(owner.assessmentAt)),
      ).toISOString(),
    };
    evidenceRecords.push(observationEvidence);
    projectedObservations.push({
      ...observation,
      evidenceIds: [observationEvidence.evidenceId],
    });
  }
  return {
    index,
    policyId,
    policyDigest,
    ruleVersions,
    evidence: evidenceRecords,
    checks,
    requests,
    observations: projectedObservations,
  };
}

/** New immutable source-run revision. Trusted host state is separate from the imported bundle. */
export async function evaluateEnterprisePerformance(
  sourceDirectory,
  bundle,
  outputDirectory,
  host = { evaluations: {} },
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  const priorIndex = validatedIndex(previous);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  assert(
    next.moduleIds.includes("performance") && bundle.evaluations.length <= 50,
    "Invalid performance scope/count",
  );
  shape(host, ["evaluations"], "performance host");
  assert(
    host.evaluations &&
      typeof host.evaluations === "object" &&
      !Array.isArray(host.evaluations),
    "Invalid performance host evaluations",
  );
  assert(
    Object.keys(host.evaluations).every((k) =>
      bundle.evaluations.some(
        (e) => e.evaluationId === k && e.kind === "lighthouse",
      ),
    ),
    "Unbound performance host state",
  );
  assert(
    bundle.evaluations.reduce(
      (sum, e) =>
        sum +
        (Array.isArray(e.sources)
          ? e.sources.reduce(
              (n, s) =>
                n +
                (typeof s?.artifactText === "string"
                  ? Buffer.byteLength(s.artifactText)
                  : 0),
              0,
            )
          : 0),
      0,
    ) <=
      16 * 1024 * 1024,
    "Performance import exceeds byte budget",
  );
  next.performanceEvaluations = priorIndex;
  const seen = new Set(),
    replacementChecks = [],
    newObservations = [],
    liveCollectorResults = [];
  // Rebuild untouched evaluations too. In particular, past lab receipt digests
  // cannot carry live execution authority into this assessment.
  const evaluations = [
    ...bundle.evaluations,
    ...priorIndex
      .filter(
        (record) =>
          !bundle.evaluations.some(
            (entry) => entry.evaluationId === record.evaluationId,
          ),
      )
      .map(
        (record) =>
          previous.evidence.find((e) => e.evidenceId === record.evidenceId)
            .content.entry,
      ),
  ];
  for (const entry of evaluations) {
    shape(
      entry,
      ["evaluationId", "kind", "context", "sources"],
      "performance entry",
    );
    assert(
      id(entry.evaluationId) &&
        !seen.has(entry.evaluationId) &&
        ["crux", "lighthouse"].includes(entry.kind),
      "Invalid/duplicate performance evaluation",
    );
    seen.add(entry.evaluationId);
    shape(
      entry.context,
      [
        "entityId",
        "environment",
        "formFactor",
        ...(entry.kind === "crux"
          ? ["target", "period", "maxAgeDays", "authorizedNormalizedUrls"]
          : ["targetUrl", "window", "maxAgeSeconds", "protocolDigest"]),
      ],
      "performance entry context",
    );
    assert(
      next.entities.some((e) => e.entityId === entry.context.entityId),
      "Performance entity mismatch",
    );
    const context = {
      ...entry.context,
      customerId: next.customerId,
      assessmentAt: bundle.assessmentAt,
    };
    if (entry.kind === "lighthouse" && host.evaluations[entry.evaluationId])
      liveCollectorResults.push({
        evaluationId: entry.evaluationId,
        result: evaluateLighthouseLab(
          context,
          entry.sources,
          host.evaluations[entry.evaluationId],
        ),
      });
    const old = next.performanceEvaluations.find(
      (e) => e.evaluationId === entry.evaluationId,
    );
    assert(
      !old || old.scopeDigest === scopeKey(entry),
      "Cannot rebind performance evaluation scope; use a new evaluation ID",
    );
    assert(
      !next.performanceEvaluations.some(
        (e) =>
          e.evaluationId !== entry.evaluationId &&
          e.scopeDigest === scopeKey(entry),
      ),
      "Duplicate performance scope under a new ID",
    );
    const priorRequests = old
      ? next.dataRequests.filter((r) =>
          old.dataRequestArtifacts.includes(r.requestedArtifact),
        )
      : [];
    if (old) {
      next.checks = next.checks.filter(
        (c) => !old.checkIds.includes(c.checkId),
      );
      next.dataRequests = next.dataRequests.filter(
        (r) => !old.dataRequestArtifacts.includes(r.requestedArtifact),
      );
    }
    const compiled = compilePerformance(entry, {
      customerId: next.customerId,
      runId: next.runId,
      assessmentAt: bundle.assessmentAt,
    });
    next.policyVersions[compiled.policyId] = compiled.policyDigest;
    Object.assign(next.ruleVersions, compiled.ruleVersions);
    for (const evidence of compiled.evidence)
      if (!next.evidence.some((e) => e.evidenceId === evidence.evidenceId))
        next.evidence.push(evidence);
    next.checks.push(...compiled.checks);
    replacementChecks.push(...compiled.checks);
    for (const request of compiled.requests) {
      const prior = priorRequests.find(
        (r) => r.requestedArtifact === request.requestedArtifact,
      );
      if (prior?.status === "declined") {
        request.status = "declined";
        request.reason = prior.reason;
      }
      next.dataRequests.push(request);
    }
    next.performanceEvaluations = next.performanceEvaluations.filter(
      (e) => e.evaluationId !== entry.evaluationId,
    );
    compiled.index.historyEvidenceIds = [
      ...new Set([
        ...(old?.historyEvidenceIds ?? []),
        ...(old ? [old.evidenceId] : []),
      ]),
    ].filter((id) => id !== compiled.index.evidenceId);
    compiled.index.revisionRunId = next.runId;
    next.performanceEvaluations.push(compiled.index);
    newObservations.push(...compiled.observations);
  }
  next.declaredScope = {
    moduleIds: [
      ...new Set([...(next.declaredScope?.moduleIds ?? []), ...next.moduleIds]),
    ],
    checks: [
      ...new Map(
        [
          ...(next.declaredScope?.checks ?? []),
          ...next.checks.map(({ checkId, moduleId, entityId }) => ({
            checkId,
            moduleId,
            entityId,
          })),
        ].map((c) => [c.checkId, c]),
      ).values(),
    ],
  };
  next = reconcileEnterpriseChecks(previous, next, bundle.assessmentAt).run;
  const replacement = new Map(replacementChecks.map((c) => [c.checkId, c]));
  next.checks = next.checks.map((c) => replacement.get(c.checkId) ?? c);
  const findings = next.checks
    .filter(
      (c) =>
        c.status === "fail" &&
        c.ruleId.startsWith("performance-") &&
        !c.ruleId.endsWith("cwv-all-three-v1"),
    )
    .map((c) => ({
      findingId: `performance-${c.checkId}`,
      checkId: c.checkId,
      evidenceIds: c.evidenceIds,
      severity: "medium",
      confidence: "low",
      title: "Scoped field performance threshold exceeded",
      description: c.reason,
      businessImpact:
        "The supplied field population exceeds a declared good threshold; impact on revenue, conversion or ranking has not been measured.",
      recommendation:
        "Independently confirm the source scope and metric, investigate representative traces, and prioritize the cause supported by evidence.",
      verification:
        "Repeat comparable field measurement after an authorized change; retain before/after periods and do not infer causality from the comparison alone.",
    }));
  assert(
    Buffer.byteLength(stableJson(next)) + 1 <= 32 * 1024 * 1024,
    "Performance run exceeds readable artifact limit",
  );
  validatedIndex(next);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    observations: newObservations,
    liveCollectorResults,
    findings,
    assessmentAccepted: false,
    providerAuthenticated: false,
  };
}
