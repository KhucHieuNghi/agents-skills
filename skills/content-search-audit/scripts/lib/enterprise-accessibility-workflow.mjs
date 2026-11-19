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
  validateEnterpriseRun,
} from "./enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "./enterprise-provider-workflow.mjs";
import { createDataRequest } from "./data-requests.mjs";
import { evaluateAxe } from "./accessibility-axe.mjs";
import { evaluateAccessibilityScenarios } from "./accessibility-scenarios.mjs";
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
      "./enterprise-accessibility-workflow.mjs",
      "./accessibility-axe.mjs",
      "./accessibility-scenarios.mjs",
      "./accessibility-scenario-rules.mjs",
      "./enterprise-state.mjs",
      "./enterprise-provider-workflow.mjs",
      "./data-requests.mjs",
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
    "accessibility entry",
  );
  assert(
    id(entry.evaluationId) && ["axe", "scenario"].includes(entry.kind),
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
  if (Array.isArray(e.context.expectedRuleIds))
    e.context.expectedRuleIds.sort();
  if (Array.isArray(e.context.requiredSteps)) {
    e.context.requiredSteps.sort((a, b) =>
      String(a.stepId) < String(b.stepId)
        ? -1
        : String(a.stepId) > String(b.stepId)
          ? 1
          : 0,
    );
    for (const s of e.context.requiredSteps)
      if (Array.isArray(s.ruleIds)) s.ruleIds.sort();
  }
  shape(e.window, ["from", "to"], "observation window");
  assert(
    timestampValue(e.window.from) &&
      timestampValue(e.window.to) &&
      Date.parse(e.window.from) < Date.parse(e.window.to),
    "Invalid observation window",
  );
  return e;
}
function scope(entry, population = false) {
  const c = { ...entry.context };
  delete c.maxAgeSeconds;
  if (population) {
    delete c.expectedRuleIds;
    delete c.requiredSteps;
  }
  return digest([entry.kind, entry.window, c]);
}
function project(original, customerId, at, version = fingerprint) {
  const entry = canonical(original);
  assert(
    timestampValue(at) && Date.parse(entry.window.to) <= Date.parse(at),
    "Observation window not complete",
  );
  const context = { ...entry.context, customerId, assessmentAt: at };
  const result =
    entry.kind === "axe"
      ? evaluateAxe(context, entry.sources)
      : evaluateAccessibilityScenarios(context, entry.sources);
  const inside = (t) =>
    Date.parse(t) >= Date.parse(entry.window.from) &&
    Date.parse(t) < Date.parse(entry.window.to);
  assert(
    result.records.every((r) =>
      entry.kind === "axe"
        ? inside(r.observedAt)
        : r.attachments.every((a) => inside(a.observedAt)) &&
          r.steps.every((s) => inside(s.observedAt)),
    ),
    "Evidence outside observation window",
  );
  const content = { entry, assessmentAt: at, evaluatorDigest: version },
    baseId = `accessibility-${digest(content)}`,
    policyId = `accessibility-${entry.evaluationId}`;
  const rows = result.checks.map((c) => {
    let expiry = Date.parse(at);
    if (c.status !== "unknown") {
      const values =
        entry.kind === "axe"
          ? result.records
              .filter((r) => r.eligible && c.sourceIds.includes(r.sourceId))
              .map((r) => Date.parse(r.validUntil))
          : c.resolutions
              .filter((r) => r.status === c.status && r.validUntil)
              .map((r) => Date.parse(r.validUntil));
      assert(values.length > 0, "Missing accessibility verdict support");
      expiry = Math.min(...values);
    }
    const namespace = entry.kind === "axe" ? "supplied-automated" : c.namespace;
    const moduleId =
      entry.kind === "scenario" && !c.criterion ? "ux-cro" : "accessibility";
    const label =
      entry.kind === "axe"
        ? `reported-tested-elements; state ${entry.context.stateId}`
        : `declared step ${c.stepId}; state ${c.stateId}; journey ${entry.context.journeyId}; protocol ${entry.context.protocolId}/${entry.context.protocolVersion}; expected outcome scope ${c.expectedOutcomeScope ?? "not applicable"}; criterion ${c.criterion ?? "product diagnostic, no WCAG mapping"}`;
    return {
      key: digest([c.ruleId, c.stepId ?? null]),
      moduleId,
      scenarioId: digest([scope(entry), namespace, c.ruleId, c.stepId ?? null]),
      status: c.status,
      reason: `${namespace}; ${label}; ${entry.context.targetUrl}; environment ${entry.context.environment}; viewport ${entry.context.viewport.width}x${entry.context.viewport.height}; window ${entry.window.from} to ${entry.window.to} (exclusive); ${c.reason}. Supplied evidence only; no conformance, authenticated execution or independent acceptance.`,
      validUntil: new Date(Math.max(Date.parse(at), expiry)).toISOString(),
      sourceIds: c.sourceIds,
      detail: c,
    };
  });
  rows.push({
    key: "manual-coverage",
    moduleId: "accessibility",
    scenarioId: digest([scope(entry), "manual-coverage"]),
    status: "unknown",
    reason: `Full manual accessibility coverage remains unknown for ${entry.context.targetUrl}; ${entry.kind} evidence covers declared samples only. Request keyboard, focus, assistive technology, hidden states and complete journeys.`,
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
    const evidenceId = `accessibility-row-${digest(rowContent)}`;
    const check = {
      moduleId: row.moduleId,
      ruleId: `accessibility-eval-${entry.evaluationId}-${row.key}`,
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
    source: `supplied-${p.entry.kind}-accessibility`,
    artifactType: type,
    scopeKey: p.entry.context.entityId,
    windowId: digest(p.entry.window),
    observedAt: p.content.assessmentAt,
    validUntil,
    digest: digest(content),
    content,
  };
}
function requestFor(run, p, item) {
  const details = p.result.dataRequests
    .map((r) => r.exportInstructions ?? r.acceptedFormat ?? r.reason)
    .join(" ");
  const request = createDataRequest({
    customerId: run.customerId,
    runId: run.runId,
    requestedArtifact: item.check.ruleId,
    scopeKey: item.check.entityId,
    windowId: item.check.windowId,
    moduleIds: [item.check.moduleId],
    affectedCheckIds: [item.check.checkId],
    reason: item.check.reason,
    acceptedFormats: [
      p.entry.kind === "axe"
        ? "Native axe-core 4.14.1 JSON with invocation context"
        : "accessibility-scenario-v1 trace with original attachments",
    ],
    leastPrivilegeAccess:
      "Read-only scoped exports; no passwords, tokens, production submissions or website changes.",
    exportInstructions: `Target ${p.entry.context.targetUrl}; viewport ${stableJson(p.entry.context.viewport)}; window ${stableJson(p.entry.window)}; obligations ${stableJson(p.entry.context.expectedRuleIds ?? p.entry.context.requiredSteps)}. ${details}`,
    suggestedOwnerRole: "Accessibility and website owners",
    fallback:
      "Keep unknown scope and arrange targeted manual review; continue unrelated modules.",
    priority: "medium",
  });

  return request;
}
function observationFor(p) {
  return {
    observationId: `accessibility-${p.entry.evaluationId}-${digest(p.content)}`,
    label: `Supplied ${p.entry.kind} semantic record count`,
    value:
      p.entry.kind === "axe"
        ? p.result.uniqueMeasurementCount
        : p.result.uniqueTraceCount,
    unit: "supplied records",
    classification: "historical",
    precision: "exact",
    period: {
      from: p.entry.window.from.slice(0, 10),
      to: p.entry.window.to.slice(0, 10),
    },
    scopeDescription: `${p.entry.context.targetUrl}; viewport ${p.entry.context.viewport.width}x${p.entry.context.viewport.height}; exact observation window ${p.entry.window.from} to ${p.entry.window.to} (exclusive). Deduplicated supplied records, not independent executions or a quality score.`,
    evidenceIds: [p.baseId],
  };
}
function validateIndex(run) {
  const indexes = run.accessibilityEvaluations ?? [];
  assert(Array.isArray(indexes), "Invalid accessibility index");
  const seen = new Set(),
    populations = new Set(),
    checks = new Set(),
    requestArtifacts = new Set(),
    ownedEvidence = new Set();
  const projects = [],
    verifiedProjects = [];
  for (const index of indexes) {
    shape(
      index,
      ["evaluationId", "evidenceId", "historyEvidenceIds", "revisionRunId"],
      "accessibility index record",
    );
    assert(
      Array.isArray(index.historyEvidenceIds) &&
        index.historyEvidenceIds.length <= 100 &&
        new Set(index.historyEvidenceIds).size ===
          index.historyEvidenceIds.length &&
        !index.historyEvidenceIds.includes(index.evidenceId),
      "Invalid accessibility history index",
    );
    assert(
      id(index.evaluationId) && !seen.has(index.evaluationId),
      "Duplicate accessibility index",
    );
    seen.add(index.evaluationId);
    const base = run.evidence.find((e) => e.evidenceId === index.evidenceId);
    assert(
      base?.artifactType === "accessibility-evaluation" &&
        base.evidenceId === `accessibility-${digest(base.content)}`,
      "Unbound accessibility index evidence",
    );
    const lineage = [run.runId, ...(run.parentRunIds ?? [])];
    assert(
      lineage.includes(index.revisionRunId),
      "Invalid accessibility activation revision",
    );
    shape(
      base.content,
      ["entry", "assessmentAt", "evaluatorDigest"],
      "indexed content",
    );
    assert(
      base.content.evaluatorDigest === fingerprint,
      "Unsupported accessibility evaluator fingerprint",
    );
    const p = project(
      base.content.entry,
      run.customerId,
      base.content.assessmentAt,
      base.content.evaluatorDigest,
    );
    assert(
      p.entry.evaluationId === index.evaluationId &&
        p.baseId === base.evidenceId,
      "Accessibility index identity mismatch",
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
      "accessibility-evaluation",
    );
    assert(
      stableJson(base) === stableJson(expectedBase),
      "Accessibility base metadata mismatch",
    );
    assert(
      run.policyVersions[p.policyId] === p.policyVersion,
      "Accessibility policy mismatch",
    );
    for (const baseId of [index.evidenceId, ...index.historyEvidenceIds]) {
      const retained = run.evidence.find((e) => e.evidenceId === baseId);
      assert(
        retained?.content?.entry &&
          retained.content.evaluatorDigest === fingerprint &&
          lineage.includes(retained.runId) &&
          lineage.indexOf(retained.runId) >=
            lineage.indexOf(index.revisionRunId) &&
          Date.parse(retained.observedAt) <= Date.parse(base.observedAt),
        "Accessibility index points to superseded or unbound evidence",
      );
      const historical =
        baseId === index.evidenceId
          ? p
          : project(
              retained.content.entry,
              run.customerId,
              retained.content.assessmentAt,
            );
      assert(
        historical.baseId === baseId &&
          historical.entry.evaluationId === index.evaluationId &&
          scope(historical.entry) === scope(p.entry),
        "Invalid accessibility history scope",
      );
      const origin = { ...run, runId: retained.runId };
      const expectedArtifacts = [
        evidence(
          origin,
          historical,
          historical.content,
          historical.baseId,
          historical.content.assessmentAt,
          "accessibility-evaluation",
        ),
        ...historical.compiled.map((item) =>
          evidence(
            origin,
            historical,
            item.content,
            item.evidenceId,
            item.row.validUntil,
            "accessibility-check",
          ),
        ),
      ];
      for (const expected of expectedArtifacts) {
        assert(
          stableJson(
            run.evidence.find((e) => e.evidenceId === expected.evidenceId),
          ) === stableJson(expected),
          "Accessibility historical artifact mismatch",
        );
        ownedEvidence.add(expected.evidenceId);
      }
      verifiedProjects.push({
        project: historical,
        current: baseId === index.evidenceId,
      });
    }
    for (const item of p.compiled) {
      const actual = run.checks.find((c) => c.checkId === item.check.checkId);
      assert(actual, "Missing indexed accessibility check");
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
        "Accessibility cached check mismatch",
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
        "accessibility-check",
      );
      assert(
        stableJson(rowEvidence) === stableJson(expectedEvidence),
        "Accessibility cached row mismatch",
      );
      if (item.check.status === "unknown")
        requestArtifacts.add(item.check.ruleId);
    }
    projects.push(p);
  }
  // Retained base evidence must never disappear merely because its index/checks were removed together.
  for (const base of run.evidence.filter(
    (e) => e.artifactType === "accessibility-evaluation",
  ))
    assert(
      seen.has(base.content?.entry?.evaluationId),
      "Missing accessibility index for retained evidence",
    );
  for (const check of run.checks)
    if (
      check.ruleId.startsWith("accessibility-eval-") ||
      check.evidenceIds.some((e) => e.startsWith("accessibility-row-"))
    )
      assert(checks.has(check.checkId), "Unindexed accessibility check");
  for (const request of run.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith("accessibility-eval-"),
  )) {
    assert(
      requestArtifacts.has(request.requestedArtifact),
      "Foreign accessibility request",
    );
    const expected = projects
      .flatMap((p) => p.compiled)
      .find((x) => x.check.ruleId === request.requestedArtifact).check;
    assert(
      stableJson(request.affectedCheckIds) === stableJson([expected.checkId]) &&
        stableJson(request.moduleIds) === stableJson([expected.moduleId]) &&
        request.scopeKey === expected.entityId &&
        request.windowId === expected.windowId,
      "Accessibility request ownership mismatch",
    );
    const owner = projects.find((p) =>
      p.compiled.some((x) => x.check.ruleId === request.requestedArtifact),
    );
    const item = owner.compiled.find(
      (x) => x.check.ruleId === request.requestedArtifact,
    );
    const expectedRequest = requestFor(run, owner, item);
    const normalized = {
      ...request,
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
      "Accessibility request descriptor mismatch",
    );
    requestArtifacts.delete(request.requestedArtifact);
  }
  assert(requestArtifacts.size === 0, "Missing accessibility request");
  assert(
    run.evidence
      .filter((e) =>
        ["accessibility-evaluation", "accessibility-check"].includes(
          e.artifactType,
        ),
      )
      .every((e) => ownedEvidence.has(e.evidenceId)),
    "Unowned accessibility evidence",
  );
  return { projects, checks, verifiedProjects };
}
/** Complete source replay inventory, not accessibility conformance or execution authentication. */
export function inspectEnterpriseAccessibility(run) {
  validateEnterpriseRun(run);
  const inspected = validateIndex(run);
  return {
    sourceRunDigest: digest(run),
    evaluatorDigest: fingerprint,
    evaluations: inspected.verifiedProjects.map(({ project: p, current }) => ({
      evidenceId: p.baseId,
      kind: p.entry.kind,
      current,
      observedAt: p.content.assessmentAt,
      checkIds: p.compiled.map((x) => x.check.checkId),
      observations: [observationFor(p)],
    })),
    assessmentAccepted: false,
  };
}
export async function evaluateEnterpriseAccessibility(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory),
    prior = validateIndex(previous);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  assert(
    bundle.evaluations.length <= 50,
    "Accessibility evaluation count limit",
  );
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
    "Accessibility byte budget exceeded",
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
      "Cannot rebind accessibility scope",
    );
  }
  const entries = [
    ...supplied,
    ...prior.projects
      .filter(
        (p) => !supplied.some((e) => e.evaluationId === p.entry.evaluationId),
      )
      .map((p) => p.entry),
  ].sort((a, b) =>
    a.evaluationId < b.evaluationId
      ? -1
      : a.evaluationId > b.evaluationId
        ? 1
        : 0,
  );
  assert(
    new Set(entries.map((e) => scope(e, true))).size === entries.length,
    "Duplicate accessibility population",
  );
  const projects = entries.map((entry) =>
    project(entry, next.customerId, bundle.assessmentAt),
  );
  for (const p of projects) {
    assert(
      next.entities.some((e) => e.entityId === p.entry.context.entityId),
      "Accessibility entity mismatch",
    );
    assert(
      p.compiled.every((x) => next.moduleIds.includes(x.check.moduleId)),
      "Accessibility module out of scope",
    );
  }
  const priorRequests = next.dataRequests.filter((r) =>
    r.requestedArtifact.startsWith("accessibility-eval-"),
  );
  next.checks = next.checks.filter((c) => !prior.checks.has(c.checkId));
  next.dataRequests = next.dataRequests.filter(
    (r) => !r.requestedArtifact.startsWith("accessibility-eval-"),
  );
  next.accessibilityEvaluations = [];
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
        "accessibility-evaluation",
      ),
    );
    next.accessibilityEvaluations.push({
      evaluationId: p.entry.evaluationId,
      evidenceId: p.baseId,
      historyEvidenceIds: [
        ...new Set(
          (previous.accessibilityEvaluations ?? [])
            .filter((i) => i.evaluationId === p.entry.evaluationId)
            .flatMap((i) => [i.evidenceId, ...i.historyEvidenceIds]),
        ),
      ].filter((id) => id !== p.baseId),
      revisionRunId: next.runId,
    });
    for (const item of p.compiled) {
      addEvidence(
        evidence(
          next,
          p,
          item.content,
          item.evidenceId,
          item.row.validUntil,
          "accessibility-check",
        ),
      );
      next.ruleVersions[`${item.check.moduleId}/${item.check.ruleId}`] = "1";
      next.checks.push(item.check);
      replacement.push(item.check);
      if (item.check.status === "unknown") {
        const request = requestFor(next, p, item);
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
    observations.push(observationFor(p));
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
      findingId: `accessibility-${c.checkId}`,
      checkId: c.checkId,
      evidenceIds: c.evidenceIds,
      severity: "medium",
      confidence: "low",
      title:
        c.moduleId === "ux-cro"
          ? "Supplied journey diagnostic requires investigation"
          : "Supplied accessibility check reports a scoped failure",
      description: c.reason,
      businessImpact:
        "Impact on users and business outcomes is unquantified; no site-wide conformance or revenue claim.",
      recommendation:
        "Independently confirm the cited source, tested state and interpretation before prioritizing a scoped correction.",
      verification:
        "Retest the same authorized state, viewport and protocol; retain original evidence and obtain a fresh independent verdict.",
    }));
  assert(
    Buffer.byteLength(stableJson(next)) + 1 <= 32 * 1024 * 1024,
    "Accessibility run exceeds readable limit",
  );
  validateIndex(next);
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
