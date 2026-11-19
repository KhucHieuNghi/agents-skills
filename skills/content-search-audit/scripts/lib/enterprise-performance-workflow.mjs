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
  assert(Array.isArray(records), "Invalid performance index");
  const ids = new Set(),
    scopes = new Set();
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
      ],
      "performance index record",
    );
    assert(
      id(record.evaluationId) && !ids.has(record.evaluationId),
      "Duplicate/invalid performance index identity",
    );
    ids.add(record.evaluationId);
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
    const context = {
      ...entry.context,
      customerId: run.customerId,
      assessmentAt: content.assessmentAt,
    };
    // Re-read raw bytes; stored execution-receipt digests never become authority here.
    const result =
      entry.kind === "crux"
        ? evaluateCruxField(context, entry.sources)
        : evaluateLighthouseLab(context, entry.sources);
    const rows =
      entry.kind === "crux" ? fieldRows(result) : labRows(result, context);
    const expiries = expiryBySource(result, entry, content.assessmentAt);
    const expected = rows.map((row) => ({
      ruleId: `performance-${entry.evaluationId}-${row.ruleId}`,
      row,
    }));
    const checks = run.checks.filter(
      (c) =>
        c.moduleId === "performance" &&
        expected.some((e) => e.ruleId === c.ruleId),
    );
    assert(
      checks.length === expected.length &&
        sameIds(
          record.checkIds,
          checks.map((c) => c.checkId),
        ),
      "Performance index check ownership mismatch",
    );
    for (const check of checks) {
      const row = expected.find((e) => e.ruleId === check.ruleId).row;
      assert(
        check.entityId === context.entityId &&
          check.scenarioId === row.scenarioId &&
          check.windowId === row.windowId &&
          check.ruleVersion === row.ruleVersion &&
          check.evidenceIds.length === 1 &&
          sameIds(check.dependencies, check.evidenceIds) &&
          sameIds(check.policyIds, [`performance-${entry.evaluationId}`]),
        "Performance index check binding mismatch",
      );
      const bound = run.evidence.find(
        (e) => e.evidenceId === check.evidenceIds[0],
      );
      assert(
        bound?.content?.evaluationEvidenceId === evidence.evidenceId &&
          bound.content.row.ruleId === row.ruleId &&
          bound.content.row.scenarioId === row.scenarioId &&
          bound.content.row.windowId === row.windowId &&
          bound.evidenceId ===
            `performance-check-${enterpriseDigest(bound.content)}` &&
          bound.entityId === context.entityId,
        "Performance index row evidence mismatch",
      );
      {
        const expiry = row.sourceIds.length
          ? Math.min(...row.sourceIds.map((sourceId) => expiries.get(sourceId)))
          : Date.parse(content.assessmentAt);
        const projectedStatus =
          expiry > Date.parse(content.assessmentAt) ? row.status : "unknown";
        const projectedReason =
          projectedStatus !== row.status
            ? `Performance evidence expired. ${row.reason}`
            : row.reason;
        assert(
          enterpriseDigest(bound.content.row) === enterpriseDigest(row) &&
            bound.content.evaluatorDigest === content.evaluatorDigest &&
            bound.observedAt === content.assessmentAt &&
            Date.parse(bound.validUntil) ===
              Math.max(expiry, Date.parse(content.assessmentAt)),
          "Performance cached field/lab projection mismatch",
        );
        assert(
          check.status === "unknown" ||
            (check.status === projectedStatus &&
              check.reason === projectedReason &&
              check.assessedAt === content.assessmentAt),
          "Performance cached field/lab verdict mismatch",
        );
      }
    }
    const expectedObservationIds = [];
    for (const item of observations(
      entry,
      result,
      evidence.evidenceId,
      evidence.digest,
      content.assessmentAt,
    )) {
      const { _expires, ...observation } = item;
      const expectedContent = {
        evaluationEvidenceId: evidence.evidenceId,
        observation,
        evaluatorDigest,
      };
      const expectedId = `performance-observation-${enterpriseDigest(expectedContent)}`;
      expectedObservationIds.push(expectedId);
      const stored = run.evidence.find((e) => e.evidenceId === expectedId);
      assert(
        stored &&
          stableJson(stored.content) === stableJson(expectedContent) &&
          stored.digest === enterpriseDigest(expectedContent) &&
          stored.observedAt === content.assessmentAt &&
          Date.parse(stored.validUntil) ===
            Math.max(_expires, Date.parse(content.assessmentAt)),
        "Performance cached observation mismatch",
      );
    }
    assert(
      sameIds(
        expectedObservationIds,
        run.evidence
          .filter(
            (e) =>
              e.content?.evaluationEvidenceId === evidence.evidenceId &&
              e.content?.observation,
          )
          .map((e) => e.evidenceId),
      ),
      "Unowned performance observation",
    );
    const requiredRequests = expected
      .filter(({ row }) => {
        const expiry = row.sourceIds.length
          ? Math.min(...row.sourceIds.map((id) => expiries.get(id)))
          : Date.parse(content.assessmentAt);
        return (
          row.status === "unknown" || expiry <= Date.parse(content.assessmentAt)
        );
      })
      .map((e) => e.ruleId);
    assert(
      sameIds(record.dataRequestArtifacts, requiredRequests),
      "Incomplete performance index data requests",
    );
    const requests = run.dataRequests.filter((r) =>
      expected.some((e) => e.ruleId === r.requestedArtifact),
    );
    assert(
      sameIds(
        record.dataRequestArtifacts,
        requests.map((r) => r.requestedArtifact),
      ),
      "Performance index request ownership mismatch",
    );
    for (const request of requests) {
      const check = checks.find((c) => c.ruleId === request.requestedArtifact);
      assert(
        sameIds(request.moduleIds, ["performance"]) &&
          sameIds(request.affectedCheckIds, [check.checkId]) &&
          request.scopeKey === context.entityId &&
          request.windowId === check.windowId,
        "Performance index request binding mismatch",
      );
    }
    return {
      ...record,
      checkIds: checks.map((c) => c.checkId),
      dataRequestArtifacts: requests.map((r) => r.requestedArtifact),
    };
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
  return validated;
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
    const result =
      entry.kind === "crux"
        ? evaluateCruxField(context, entry.sources)
        : evaluateLighthouseLab(context, entry.sources);
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
    const policyId = `performance-${entry.evaluationId}`;
    next.policyVersions[policyId] = enterpriseDigest([
      entry.kind,
      entry.context,
      evaluatorDigest,
    ]);
    const expiries = expiryBySource(result, entry, bundle.assessmentAt);
    const content = {
      entry,
      assessmentAt: bundle.assessmentAt,
      evaluatorDigest,
      replayContract: "supplied-inputs-v1",
      executionReceiptDigests: [],
    };
    const digest = enterpriseDigest(content),
      evidenceId = `performance-${digest}`;
    const evidence = {
      evidenceId,
      customerId: next.customerId,
      runId: next.runId,
      entityId: context.entityId,
      source: `supplied-${entry.kind}-performance-evaluation`,
      artifactType: "performance-evaluation",
      scopeKey: context.entityId,
      windowId: entry.evaluationId,
      observedAt: bundle.assessmentAt,
      validUntil: new Date(
        Math.max(Date.parse(bundle.assessmentAt), ...expiries.values()),
      ).toISOString(),
      digest,
      content,
    };
    if (!next.evidence.some((e) => e.evidenceId === evidenceId))
      next.evidence.push(evidence);
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
        : Date.parse(bundle.assessmentAt);
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
          Math.max(expiry, Date.parse(bundle.assessmentAt)),
        ).toISOString(),
      };
      if (!next.evidence.some((e) => e.evidenceId === rowEvidence.evidenceId))
        next.evidence.push(rowEvidence);
      const ruleId = `performance-${entry.evaluationId}-${row.ruleId}`;
      next.ruleVersions[`performance/${ruleId}`] = row.ruleVersion;
      const status =
        expiry > Date.parse(bundle.assessmentAt) ? row.status : "unknown";
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
        assessedAt: ["pass", "fail"].includes(status)
          ? bundle.assessmentAt
          : null,
        review: null,
      };
      check.checkId = checkIdentity(check);
      checks.push(check);
      if (status === "unknown") {
        const request = createDataRequest({
          customerId: next.customerId,
          runId: next.runId,
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
        const prior = priorRequests.find((r) => r.requestedArtifact === ruleId);
        if (prior?.status === "declined") {
          request.status = "declined";
          request.reason = prior.reason;
        }
        requests.push(request);
      }
    }
    next.checks.push(...checks);
    replacementChecks.push(...checks);
    next.dataRequests.push(...requests);
    next.performanceEvaluations = next.performanceEvaluations.filter(
      (e) => e.evaluationId !== entry.evaluationId,
    );
    next.performanceEvaluations.push({
      evaluationId: entry.evaluationId,
      kind: entry.kind,
      scopeDigest: scopeKey(entry),
      evidenceId,
      checkIds: checks.map((c) => c.checkId),
      dataRequestArtifacts: requests.map((r) => r.requestedArtifact),
    });
    for (const item of observations(
      entry,
      result,
      evidenceId,
      digest,
      bundle.assessmentAt,
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
          Math.max(_expires, Date.parse(bundle.assessmentAt)),
        ).toISOString(),
      };
      if (
        !next.evidence.some(
          (e) => e.evidenceId === observationEvidence.evidenceId,
        )
      )
        next.evidence.push(observationEvidence);
      newObservations.push({
        ...observation,
        evidenceIds: [observationEvidence.evidenceId],
      });
    }
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
