import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import {
  enterpriseDigest as digest,
  stableJson,
  timestampValue,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "../../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs";
import { createDataRequest } from "../../skills/content-search-audit/scripts/lib/data-requests.mjs";
import { evaluateCanonicalCapture } from "./canonical.mjs";
import { evaluateUrlInspection } from "./url-inspection.mjs";
import { evaluateHreflangCapture } from "./hreflang.mjs";
import { evaluateIndexControls } from "./index-controls.mjs";
const assert = (x, m) => {
  if (!x) throw Error(m);
};
const shape = (x, keys, label) =>
  assert(
    x &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.keys(x).length === keys.length &&
      keys.every((k) => Object.hasOwn(x, k)),
    `Invalid ${label}`,
  );
const id = (x) => typeof x === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(x);
const fingerprint = digest(
  await Promise.all(
    [
      "./workflow.mjs",
      "./canonical.mjs",
      "./url-inspection.mjs",
      "./index-controls.mjs",
      "./hreflang.mjs",
      "./hreflang-graph.mjs",
      "./hreflang-language.mjs",
      "./language-registry.json",
      "../../skills/content-search-audit/scripts/lib/robots.mjs",
      "./strict-json.mjs",
      "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs",
      "../../skills/content-search-audit/scripts/lib/enterprise-provider-workflow.mjs",
      "../../skills/content-search-audit/scripts/lib/data-requests.mjs",
    ].map(async (p) => [
      p,
      await readFile(new URL(p, import.meta.url), "utf8"),
    ]),
  ),
);
function canonical(entry) {
  shape(
    entry,
    ["evaluationId", "kind", "window", "context", "sources"],
    "canonical entry",
  );
  assert(
    id(entry.evaluationId) &&
      [
        "canonical",
        "gsc-url-inspection",
        "index-controls",
        "hreflang",
      ].includes(entry.kind),
    "Invalid evaluation identity",
  );
  assert(
    entry.context &&
      typeof entry.context === "object" &&
      !Object.hasOwn(entry.context, "customerId") &&
      !Object.hasOwn(entry.context, "assessmentAt"),
    "Invalid entry context",
  );
  const e = globalThis.structuredClone(entry);
  assert(
    Array.isArray(e.sources) && e.sources.length === 1,
    "Exactly one canonical capture required",
  );
  shape(e.window, ["from", "to"], "observation window");
  assert(
    timestampValue(e.window.from) &&
      timestampValue(e.window.to) &&
      Date.parse(e.window.from) < Date.parse(e.window.to),
    "Invalid observation window",
  );
  return e;
}
function scope(entry) {
  const c = { ...entry.context };
  delete c.maxAgeSeconds;
  delete c.expectedCanonical;
  delete c.expectedIndexed;
  delete c.expectedCrawlAllowed;
  delete c.expectedIndexable;
  delete c.expectedHttpStatus;
  return digest([entry.kind, entry.window, c]);
}
function project(
  original,
  customerId,
  at,
  revisionRunId,
  version = fingerprint,
) {
  const entry = canonical(original);
  assert(
    timestampValue(at) && Date.parse(entry.window.to) <= Date.parse(at),
    "Observation window not complete",
  );
  const context = { ...entry.context, customerId, assessmentAt: at };
  const provider = entry.kind === "gsc-url-inspection";
  const result = provider
    ? evaluateUrlInspection(context, entry.sources[0])
    : entry.kind === "index-controls"
      ? evaluateIndexControls(context, entry.sources[0])
      : entry.kind === "hreflang"
        ? evaluateHreflangCapture(context, entry.sources[0])
        : evaluateCanonicalCapture(context, entry.sources[0]);
  const observedAt = provider ? result.retrievedAt : result.capturedAt;
  const scopeDescription = provider
    ? `property ${entry.context.property}; provider verdict ${result.unsupportedFields.includes("verdict") ? "unsupported" : (result.observation.verdict ?? "unavailable")}; retrieval ${result.retrievedAt}; last crawl ${result.observation.lastCrawlTime ?? "unavailable"}; not a live URL test`
    : `profile ${entry.context.profileId}; state ${entry.context.stateId}${entry.kind === "hreflang" ? `; method ${entry.context.method}; root-only labels/mapping and direct return links; target eligibility and content equivalence unverified` : ""}`;
  assert(
    Date.parse(observedAt) >= Date.parse(entry.window.from) &&
      Date.parse(observedAt) < Date.parse(entry.window.to),
    "Evidence outside observation window",
  );
  if (entry.kind === "index-controls") {
    const observedRobots = Date.parse(result.observation.robotsCapturedAt);
    assert(
      observedRobots >= Date.parse(entry.window.from) &&
        observedRobots < Date.parse(entry.window.to),
      "Robots evidence outside observation window",
    );
  }
  if (entry.kind === "hreflang") {
    for (const capturedAt of result.pageCapturedAt)
      assert(
        Date.parse(capturedAt) >= Date.parse(entry.window.from) &&
          Date.parse(capturedAt) < Date.parse(entry.window.to),
        "Hreflang page outside observation window",
      );
  }
  const content = {
      entry,
      assessmentAt: at,
      revisionRunId,
      evaluatorDigest: version,
    },
    baseId = `canonical-${digest(content)}`,
    policyId = `canonical-${entry.evaluationId}`;
  const rows = result.checks.map((c) => ({
    key: c.ruleId,
    moduleId: "technical-seo",
    scenarioId: digest([scope(entry), c.ruleId]),
    status: c.status,
    reason: `${provider ? "single-supplied-url-inspection" : entry.kind === "index-controls" ? "single-supplied-index-controls" : "single-supplied-capture"}; ${entry.context.targetUrl}; environment ${entry.context.environment}; ${scopeDescription}; window ${entry.window.from} to ${entry.window.to} (exclusive); ${c.reason}. Supplied attribution; no authenticated execution or independent acceptance.`,
    validUntil: new Date(
      Math.max(Date.parse(at), Date.parse(c.validUntil ?? result.validUntil)),
    ).toISOString(),
    sourceIds: c.sourceIds,
    detail: c,
  }));
  if (!provider)
    rows.push({
      key: "provider-index-state",
      moduleId: "technical-seo",
      scenarioId: digest([scope(entry), "provider-index-state"]),
      status: "unknown",
      reason:
        "This local capture alone does not establish provider index state or Google-selected canonical; consult separately scoped URL Inspection evidence.",
      validUntil: at,
      sourceIds: [],
      detail: null,
    });
  const windowId = digest(entry.window);
  const compiled = rows.map((row) => {
    const rowContent = {
      evaluationEvidenceId: baseId,
      row,
      evaluatorDigest: version,
    };
    const evidenceId = `canonical-row-${digest(rowContent)}`;
    const check = {
      moduleId: row.moduleId,
      ruleId: `canonical-eval-${entry.evaluationId}-${row.key}`,
      ruleVersion: "1",
      entityId: context.entityId,
      scenarioId: row.scenarioId,
      windowId,
      status: row.status,
      reason: row.reason,
      evidenceIds: [evidenceId],
      dependencies: [evidenceId],
      policyIds: [policyId],
      assessedAt: row.status === "unknown" ? null : at,
      review: null,
    };
    check.checkId = checkIdentity(check);
    return { row, content: rowContent, evidenceId, check };
  });
  return {
    entry,
    result,
    scopeDescription,
    content,
    baseId,
    policyId,
    policyVersion: digest([entry.context, entry.window, version]),
    compiled,
  };
}
function evidence(run, p, content, evidenceId, validUntil, type) {
  return {
    evidenceId,
    customerId: run.customerId,
    runId: run.runId,
    entityId: p.entry.context.entityId,
    source: `supplied-${p.entry.kind}-canonical`,
    artifactType: type,
    scopeKey: p.entry.context.entityId,
    windowId: digest(p.entry.window),
    observedAt: p.content.assessmentAt,
    validUntil,
    digest: digest(content),
    content,
  };
}
function validateIndex(run) {
  const indexes = run.technicalSeoEvaluations ?? [];
  assert(Array.isArray(indexes), "Invalid canonical index");
  const seen = new Set(),
    populations = new Set(),
    checks = new Set(),
    requestArtifacts = new Set();
  const projects = [];
  for (const index of indexes) {
    shape(index, ["evaluationId", "evidenceId"], "canonical index record");
    assert(
      id(index.evaluationId) && !seen.has(index.evaluationId),
      "Duplicate canonical index",
    );
    seen.add(index.evaluationId);
    const base = run.evidence.find((e) => e.evidenceId === index.evidenceId);
    assert(
      base?.artifactType === "canonical-evaluation" &&
        base.evidenceId === `canonical-${digest(base.content)}`,
      "Unbound canonical index evidence",
    );
    const lineage = [run.runId, ...(run.parentRunIds ?? [])];
    for (const other of run.evidence.filter(
      (e) =>
        e.artifactType === "canonical-evaluation" &&
        e.content?.entry?.evaluationId === index.evaluationId,
    )) {
      assert(
        Date.parse(other.content.assessmentAt) <
          Date.parse(base.content.assessmentAt) ||
          (Date.parse(other.content.assessmentAt) ===
            Date.parse(base.content.assessmentAt) &&
            lineage.indexOf(other.runId) >= lineage.indexOf(base.runId)),
        "Canonical index points to superseded evidence",
      );
    }
    shape(
      base.content,
      ["entry", "assessmentAt", "revisionRunId", "evaluatorDigest"],
      "indexed content",
    );
    assert(
      /^[a-f0-9]{64}$/.test(base.content.evaluatorDigest) &&
        base.content.revisionRunId === base.runId,
      "Invalid evaluator fingerprint",
    );
    const p = project(
      base.content.entry,
      run.customerId,
      base.content.assessmentAt,
      base.content.revisionRunId,
      base.content.evaluatorDigest,
    );
    assert(
      p.entry.evaluationId === index.evaluationId &&
        p.baseId === base.evidenceId,
      "Canonical index identity mismatch",
    );
    assert(
      !populations.has(scope(p.entry, true)),
      "Duplicate indexed population",
    );
    populations.add(scope(p.entry, true));
    const expectedBase = evidence(
      { ...run, runId: base.runId },
      p,
      p.content,
      p.baseId,
      base.content.assessmentAt,
      "canonical-evaluation",
    );
    assert(
      stableJson(base) === stableJson(expectedBase),
      "Canonical base metadata mismatch",
    );
    assert(
      run.policyVersions[p.policyId] === p.policyVersion,
      "Canonical policy mismatch",
    );
    for (const item of p.compiled) {
      const actual = run.checks.find((c) => c.checkId === item.check.checkId);
      assert(actual, "Missing indexed canonical check");
      checks.add(actual.checkId);
      const expected = { ...item.check };
      const actualComparable = { ...actual, review: null };
      if (actual.status === "unknown") {
        actualComparable.status = expected.status;
        actualComparable.reason = expected.reason;
        actualComparable.assessedAt = expected.assessedAt;
      }
      assert(
        stableJson(actualComparable) === stableJson(expected),
        "Canonical cached check mismatch",
      );
      const rowEvidence = run.evidence.find(
        (e) => e.evidenceId === item.evidenceId,
      );
      const expectedEvidence = evidence(
        { ...run, runId: base.runId },
        p,
        item.content,
        item.evidenceId,
        item.row.validUntil,
        "canonical-check",
      );
      assert(
        stableJson(rowEvidence) === stableJson(expectedEvidence),
        "Canonical cached row mismatch",
      );
      if (item.check.status === "unknown")
        requestArtifacts.add(item.check.ruleId);
    }
    projects.push(p);
  }
  // Retained base evidence must never disappear merely because its index/checks were removed together.
  for (const base of run.evidence.filter(
    (e) => e.artifactType === "canonical-evaluation",
  ))
    assert(
      seen.has(base.content?.entry?.evaluationId),
      "Missing canonical index for retained evidence",
    );
  for (const check of run.checks)
    if (
      check.ruleId.startsWith("canonical-eval-") ||
      check.evidenceIds.some((e) => e.startsWith("canonical-row-"))
    )
      assert(checks.has(check.checkId), "Unindexed canonical check");
  for (const request of run.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith("canonical-eval-"),
  )) {
    assert(
      requestArtifacts.has(request.requestedArtifact),
      "Foreign canonical request",
    );
    const expected = projects
      .flatMap((p) => p.compiled)
      .find((x) => x.check.ruleId === request.requestedArtifact).check;
    assert(
      stableJson(request.affectedCheckIds) === stableJson([expected.checkId]) &&
        stableJson(request.moduleIds) === stableJson([expected.moduleId]) &&
        request.scopeKey === expected.entityId &&
        request.windowId === expected.windowId,
      "Canonical request ownership mismatch",
    );
    requestArtifacts.delete(request.requestedArtifact);
  }
  assert(requestArtifacts.size === 0, "Missing canonical request");
  return { projects, checks };
}
export async function evaluateEnterpriseTechnicalSeo(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory),
    prior = validateIndex(previous);
  // Reassessment may supply no replacement captures, but must retain a validated population.
  const forkBundle =
    Array.isArray(bundle?.evaluations) && bundle.evaluations.length === 0
      ? { ...bundle, evaluations: prior.projects.map((p) => p.entry) }
      : bundle;
  let next = forkEnterpriseEvidenceRun(previous, forkBundle, "evaluations");
  assert(bundle.evaluations.length <= 50, "Canonical evaluation count limit");
  assert(
    bundle.evaluations.reduce(
      (n, e) =>
        n +
        (Array.isArray(e.sources)
          ? e.sources.reduce(
              (m, s) =>
                m +
                (typeof s?.artifactText === "string"
                  ? Buffer.byteLength(s.artifactText)
                  : 0),
              0,
            )
          : 0),
      0,
    ) <=
      16 * 1024 * 1024,
    "Canonical byte budget exceeded",
  );
  const supplied = bundle.evaluations.map(canonical);
  assert(
    new Set(supplied.map((e) => e.evaluationId)).size === supplied.length,
    "Duplicate evaluation ID",
  );
  for (const entry of supplied) {
    const old = prior.projects.find(
      (p) => p.entry.evaluationId === entry.evaluationId,
    );
    assert(
      !old || scope(old.entry) === scope(entry),
      "Cannot rebind canonical scope",
    );
  }
  const entries = [
    ...supplied,
    ...prior.projects
      .filter(
        (p) => !supplied.some((e) => e.evaluationId === p.entry.evaluationId),
      )
      .map((p) => p.entry),
  ].sort((a, b) => a.evaluationId.localeCompare(b.evaluationId));
  assert(
    new Set(entries.map((e) => scope(e, true))).size === entries.length,
    "Duplicate canonical population",
  );
  assert(entries.length <= 50, "Retained canonical evaluation count limit");
  assert(
    entries.reduce(
      (n, e) =>
        n +
        e.sources.reduce((m, s) => m + Buffer.byteLength(s.artifactText), 0),
      0,
    ) <=
      16 * 1024 * 1024,
    "Retained canonical byte budget exceeded",
  );
  const projects = entries.map((entry) =>
    project(entry, next.customerId, bundle.assessmentAt, next.runId),
  );
  for (const p of projects) {
    assert(
      next.entities.some((e) => e.entityId === p.entry.context.entityId),
      "Canonical entity mismatch",
    );
    assert(
      p.compiled.every((x) => next.moduleIds.includes(x.check.moduleId)),
      "Canonical module out of scope",
    );
  }
  const priorRequests = next.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith("canonical-eval-"),
  );
  next.checks = next.checks.filter((c) => !prior.checks.has(c.checkId));
  next.dataRequests = next.dataRequests.filter(
    (r) => !r.requestedArtifact.startsWith("canonical-eval-"),
  );
  next.technicalSeoEvaluations = [];
  const replacement = [],
    observations = [];
  const addEvidence = (e) => {
    if (!next.evidence.some((x) => x.evidenceId === e.evidenceId))
      next.evidence.push(e);
  };
  for (const p of projects) {
    next.policyVersions[p.policyId] = p.policyVersion;
    addEvidence(
      evidence(
        next,
        p,
        p.content,
        p.baseId,
        bundle.assessmentAt,
        "canonical-evaluation",
      ),
    );
    next.technicalSeoEvaluations.push({
      evaluationId: p.entry.evaluationId,
      evidenceId: p.baseId,
    });
    for (const item of p.compiled) {
      addEvidence(
        evidence(
          next,
          p,
          item.content,
          item.evidenceId,
          item.row.validUntil,
          "canonical-check",
        ),
      );
      next.ruleVersions[`${item.check.moduleId}/${item.check.ruleId}`] = "1";
      next.checks.push(item.check);
      replacement.push(item.check);
      if (item.check.status === "unknown") {
        const details = p.result.dataRequests
          .map(
            (r) =>
              `${r.ownerRole}: ${r.requestedArtifact}; formats ${r.acceptedFormats.join(", ")}; ${r.fallback}`,
          )
          .join(" ");
        const request = createDataRequest({
          customerId: next.customerId,
          runId: next.runId,
          requestedArtifact: item.check.ruleId,
          scopeKey: item.check.entityId,
          windowId: item.check.windowId,
          moduleIds: [item.check.moduleId],
          affectedCheckIds: [item.check.checkId],
          reason: item.check.reason,
          acceptedFormats: [
            "canonical-capture-v1",
            "gsc-url-inspection-v1",
            "index-controls-v1",
            "hreflang-capture-v1",
            "hreflang-capture-v2",
            "owner-language-policy-markdown",
            "owner-canonical-policy-json",
            "scoped-url-inspection-export",
          ],
          leastPrivilegeAccess:
            "Read-only scoped exports; no passwords, tokens, production submissions or website changes.",
          exportInstructions: `Target ${p.entry.context.targetUrl}; ${p.scopeDescription}; environment ${p.entry.context.environment}; window ${JSON.stringify(p.entry.window)}. ${item.row.key === "provider-index-state" ? "Supply property, inspection timestamp and exact URL with provider-returned index state and selected canonical." : details}`,
          suggestedOwnerRole: "SEO and website engineering owners",
          fallback:
            "Keep the affected checks unknown; continue unrelated modules.",
          priority: "medium",
        });
        const old = priorRequests.find(
          (r) => r.requestedArtifact === request.requestedArtifact,
        );
        if (old?.status === "declined") {
          request.status = "declined";
          request.reason = old.reason;
        }
        next.dataRequests.push(request);
      }
    }
    observations.push({
      observationId: `canonical-${p.entry.evaluationId}-${digest(p.content)}`,
      label:
        p.entry.kind === "canonical"
          ? "Supplied canonical capture count"
          : p.entry.kind === "index-controls"
            ? "Supplied index-control capture count"
            : p.entry.kind === "hreflang"
              ? "Supplied hreflang graph count"
              : "Supplied URL Inspection record count",
      value: 1,
      unit: "supplied captures",
      classification: "historical",
      precision: "exact",
      period: {
        from: p.entry.window.from.slice(0, 10),
        to: p.entry.window.to.slice(0, 10),
      },
      scopeDescription: `${p.entry.context.targetUrl}; ${p.scopeDescription}; exact observation window ${p.entry.window.from} to ${p.entry.window.to} (exclusive). One supplied capture, not an independent execution or quality score.`,
      evidenceIds: [p.baseId],
    });
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
  const mapped = new Map(replacement.map((c) => [c.checkId, c]));
  next.checks = next.checks.map((c) => mapped.get(c.checkId) ?? c);
  const findings = replacement
    .filter((c) => c.status === "fail")
    .map((c) => ({
      findingId: `canonical-${c.checkId}`,
      checkId: c.checkId,
      evidenceIds: c.evidenceIds,
      severity: "medium",
      confidence: "low",
      title:
        "Supplied technical search evidence differs from the stated expectation",
      description: c.reason,
      businessImpact:
        "Impact on users and business outcomes is unquantified; no site-wide indexing, ranking or revenue claim.",
      recommendation:
        "Independently confirm the cited source, tested state and interpretation before prioritizing a scoped correction.",
      verification:
        "Retest the same authorized URL, profile and state; retain original evidence and obtain a fresh independent verdict.",
    }));
  assert(
    Buffer.byteLength(stableJson(next)) + 1 <= 32 * 1024 * 1024,
    "Canonical run exceeds readable limit",
  );
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: digest(next),
    observations,
    findings,
    assessmentAccepted: false,
    executionAuthenticated: false,
  };
}
