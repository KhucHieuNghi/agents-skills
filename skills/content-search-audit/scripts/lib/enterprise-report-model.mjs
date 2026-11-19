import { assertReviewRequestContinuity } from "./data-requests.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import process from "node:process";
import {
  enterpriseDigest,
  stableJson,
  validateEnterpriseRun,
  enterpriseCheckContextDigest,
  textValue,
  timestampValue,
} from "./enterprise-state.mjs";
import { enterpriseCoverage } from "./enterprise-coverage.mjs";

export const reportTool = {
  name: "enterprise-report",
  version: 1,
  node: process.versions.node,
  sourceDigest: enterpriseDigest(
    await Promise.all(
      [
        "enterprise-report-model.mjs",
        "enterprise-report-view.mjs",
        "enterprise-report.mjs",
        "enterprise-state.mjs",
        "enterprise-coverage.mjs",
        "../../rules/enterprise.json",
      ].map(async (name) => [
        name,
        createHash("sha256")
          .update(await readFile(new URL(name, import.meta.url)))
          .digest("hex"),
      ]),
    ),
  ),
};
const clone = (value) => globalThis.structuredClone(value);
const pick = (value, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, clone(value[key])]),
  );
const hashPattern = /^[a-f0-9]{64}$/;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
function record(value, fields, label) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).every((key) => fields.includes(key)),
    `Invalid ${label} fields`,
  );
}
function id(value) {
  assert(
    typeof value === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value),
    "Use opaque report identifiers without personal data",
  );
}
function strings(values, label) {
  assert(
    Array.isArray(values) &&
      values.every(textValue) &&
      new Set(values).size === values.length,
    `Invalid ${label}`,
  );
}
function scrubber(values) {
  assert(
    Array.isArray(values) &&
      values.every((value) => typeof value === "string" && value.length >= 4),
    "Sensitive literals must be strings of at least four characters",
  );
  const ordered = [...new Set(values)].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
  return (value) => {
    assert(textValue(value), "Report display text must be nonempty");
    let text = value;
    for (const sensitive of ordered)
      text = text.split(sensitive).join("[redacted]");
    return text
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
      .replace(/\bsk-[A-Za-z0-9_-]{16,}/g, "[redacted-token]");
  };
}
const allTargets = (report) => [
  ...report.assessment.checks
    .filter((check) => check.status !== "unknown")
    .map((value) => ({ type: "check", id: value.checkId, value })),
  ...["finding", "action", "observation", "narrative"].flatMap((type) =>
    report[type === "narrative" ? "narrative" : `${type}s`].map((value) => ({
      type,
      id: value[`${type}Id`],
      value,
    })),
  ),
];
export function enterpriseReviewTargetDigest(report, type, id) {
  const targets = allTargets(report);
  const target = targets.find((item) => item.type === type && item.id === id);
  assert(target, "Unresolved review target");
  const evidenceIds = new Set(),
    checks = new Map(),
    claims = new Map(),
    visited = new Set();
  const collect = (kind, key) => {
    const identity = `${kind}:${key}`;
    if (visited.has(identity)) return;
    visited.add(identity);
    const item = targets.find((item) => item.type === kind && item.id === key);
    assert(item, "Unresolved review dependency");
    claims.set(identity, item.value);
    for (const evidenceId of item.value.evidenceIds ?? [])
      evidenceIds.add(evidenceId);
    if (kind === "check") {
      checks.set(key, report.assessment.checkContextDigests?.[key] ?? null);
      for (const evidenceId of item.value.dependencies ?? [])
        evidenceIds.add(evidenceId);
    }
    if (kind === "finding") collect("check", item.value.checkId);
    if (kind === "action") {
      for (const findingId of item.value.findingIds)
        collect("finding", findingId);
      for (const actionId of item.value.dependencies)
        collect("action", actionId);
    }
  };
  collect(type, id);
  return enterpriseDigest({
    target: { type, id },
    claims: Object.fromEntries(claims),
    checkContexts: Object.fromEntries(checks),
    evidence: [...evidenceIds].sort().map((evidenceId) => {
      const item = report.assessment.evidence.find(
        (item) => item.evidenceId === evidenceId,
      );
      assert(item, "Unresolved review evidence");
      return item;
    }),
  });
}

export function reportSummary(report) {
  const modules = Object.values(report.coverage.modules);
  const total = (key) => modules.reduce((sum, module) => sum + module[key], 0);
  const targets = allTargets(report);
  const accepted = targets.filter((target) =>
    report.decisions.some(
      (decision) =>
        decision.targetType === target.type &&
        decision.targetId === target.id &&
        decision.targetDigest ===
          enterpriseReviewTargetDigest(report, target.type, target.id) &&
        decision.verdict === "accept",
    ),
  );
  const assessedChecks = total("passed") + total("failed"),
    applicable = total("applicable");
  return {
    reportComplete: report.coverage.reportComplete,
    assessedChecks,
    unknownChecks: total("unknown"),
    failedChecks: total("failed"),
    notApplicableChecks: total("notApplicable"),
    applicableChecks: applicable,
    assessmentCoverage: applicable ? assessedChecks / applicable : null,
    findings: report.findings.length,
    untriagedFailedChecks: report.assessment.checks.filter(
      (check) =>
        check.status === "fail" &&
        !report.findings.some((finding) => finding.checkId === check.checkId),
    ).length,
    siteHealth: total("failed")
      ? "failed-checks-observed"
      : total("unknown") || !report.coverage.reportComplete
        ? "undetermined"
        : "no-failed-checks-in-declared-scope",
    implementationStatus: report.actions.length ? "proposed" : "not-started",
    historicalObservations: report.observations.filter(
      (item) => item.classification === "historical",
    ).length,
    currentObservations: report.observations.filter(
      (item) => item.classification === "current",
    ).length,
    reviewStatus:
      targets.length > 0 && accepted.length === targets.length
        ? "reviewed"
        : "pending",
    reviewTargets: targets.length,
    acceptedReviewTargets: accepted.length,
  };
}

export function validateEnterpriseReport(report) {
  record(
    report,
    [
      "schemaFamily",
      "schemaVersion",
      "edition",
      "revisionId",
      "parentReportDigest",
      "generatedAt",
      "authorId",
      "sourceRunDigest",
      "tool",
      "brand",
      "assessment",
      "coverage",
      "dataRequests",
      "findings",
      "actions",
      "observations",
      "narrative",
      "decisions",
      "redaction",
      "methodology",
      "summary",
    ],
    "report",
  );
  assert(
    report?.schemaFamily === "enterprise-report" &&
      report.schemaVersion === 1 &&
      report.edition === "customer",
    "Invalid enterprise report schema",
  );
  record(
    report.tool,
    ["name", "version", "node", "sourceDigest"],
    "report tool",
  );
  assert(
    report.tool.name === "enterprise-report" &&
      report.tool.version === 1 &&
      /^\d+\.\d+\.\d+$/.test(report.tool.node) &&
      hashPattern.test(report.tool.sourceDigest),
    "Invalid report tool",
  );
  id(report.revisionId);
  id(report.authorId);
  assert(
    timestampValue(report.generatedAt) &&
      Date.parse(report.generatedAt) >=
        Date.parse(report.assessment?.assessmentAt),
    "Invalid report time",
  );
  assert(
    hashPattern.test(report.sourceRunDigest) &&
      (report.parentReportDigest === null ||
        hashPattern.test(report.parentReportDigest)),
    "Invalid report source binding",
  );
  validateEnterpriseRun(report.assessment, { projectedReviewContexts: true });
  record(report.brand, ["name", "accent"], "report brand");
  record(
    report.redaction,
    ["policyDigest", "method", "reviewRequired"],
    "redaction",
  );
  assert(
    hashPattern.test(report.redaction.policyDigest) &&
      report.redaction.method === "literal-and-common-patterns" &&
      report.redaction.reviewRequired === true,
    "Invalid redaction contract",
  );
  assert(
    Array.isArray(report.methodology) && report.methodology.every(textValue),
    "Invalid methodology",
  );
  record(
    report.assessment,
    [
      "schemaFamily",
      "schemaVersion",
      "customerId",
      "runId",
      "operationMode",
      "inventoryMode",
      "assessmentAt",
      "profileVersions",
      "ruleVersions",
      "policyVersions",
      "moduleIds",
      "declaredScope",
      "parentRunIds",
      "planningStatus",
      "registryVersion",
      "entities",
      "checks",
      "evidence",
      "dataRequests",
      "history",
      "requestResponses",
      "checkContextDigests",
    ],
    "report assessment",
  );
  const checkFields = [
    "checkId",
    "moduleId",
    "ruleId",
    "ruleVersion",
    "entityId",
    "scenarioId",
    "windowId",
    "status",
    "evidenceIds",
    "dependencies",
    "policyIds",
    "assessedAt",
    "reason",
    "review",
  ];
  const checkShape = (check) => {
    record(check, checkFields, "report check");
    if (check.review)
      record(
        check.review,
        ["reviewer", "rationale", "reviewedAt", "checkBindings", "validUntil"],
        "check review",
      );
  };
  for (const entity of report.assessment.entities)
    record(
      entity,
      ["entityId", "type", "customerId", "runId"],
      "report entity",
    );
  for (const check of report.assessment.checks) checkShape(check);
  for (const evidence of report.assessment.evidence)
    record(
      evidence,
      [
        "evidenceId",
        "customerId",
        "runId",
        "entityId",
        "digest",
        "observedAt",
        "validUntil",
        "artifactType",
        "scopeKey",
        "windowId",
        "source",
      ],
      "report evidence",
    );
  for (const item of report.assessment.history ?? []) {
    record(
      item,
      [
        "customerId",
        "sourceRunId",
        "sourceDigest",
        "invalidatedAt",
        "check",
        "reasons",
      ],
      "verdict history",
    );
    checkShape(item.check);
  }
  for (const item of report.assessment.requestResponses ?? [])
    record(
      item,
      [
        "customerId",
        "sourceRunId",
        "requestId",
        "originalRequestId",
        "at",
        "outcome",
        "validUntil",
        "actor",
        "text",
        "reason",
      ],
      "response history",
    );
  for (const request of report.assessment.dataRequests ?? [])
    record(
      request,
      [
        "id",
        "customerId",
        "runId",
        "requestedArtifact",
        "scopeKey",
        "windowId",
        "moduleIds",
        "affectedCheckIds",
        "reason",
        "acceptedFormats",
        "leastPrivilegeAccess",
        "exportInstructions",
        "suggestedOwnerRole",
        "fallback",
        "priority",
        "status",
        "evidenceIds",
        "evidenceDigests",
        "revalidateOnCheckInvalidation",
        "invalidatedEvidenceDigests",
      ],
      "report request",
    );
  if (report.assessment.checkContextDigests !== undefined) {
    const contexts = report.assessment.checkContextDigests;
    assert(
      contexts &&
        !Array.isArray(contexts) &&
        Object.keys(contexts).length === report.assessment.checks.length &&
        report.assessment.checks.every((check) =>
          hashPattern.test(contexts[check.checkId]),
        ),
      "Invalid check context bindings",
    );
  }
  assert(
    stableJson(report.dataRequests) ===
      stableJson(report.assessment.dataRequests),
    "Report request projection mismatch",
  );
  assert(
    stableJson(report.coverage) ===
      stableJson(enterpriseCoverage(report.assessment)),
    "Report coverage mismatch",
  );
  assert(
    textValue(report.brand?.name) &&
      /^#[a-f0-9]{6}$/i.test(report.brand.accent),
    "Invalid report brand",
  );
  const evidence = new Map(
    report.assessment.evidence.map((item) => [item.evidenceId, item]),
  );
  const checks = new Map(
    report.assessment.checks.map((check) => [check.checkId, check]),
  );
  const ids = (items, key) => {
    assert(Array.isArray(items), `Invalid ${key} collection`);
    const seen = new Set();
    for (const item of items) {
      id(item[key]);
      assert(!seen.has(item[key]), `Duplicate ${key}`);
      seen.add(item[key]);
    }
    return seen;
  };
  const refs = (values) => {
    strings(values, "claim evidence");
    assert(
      values.length > 0 && values.every((value) => evidence.has(value)),
      "Unresolved claim evidence",
    );
  };
  const findings = ids(report.findings, "findingId");
  for (const finding of report.findings) {
    record(
      finding,
      [
        "findingId",
        "checkId",
        "evidenceIds",
        "severity",
        "confidence",
        "title",
        "description",
        "businessImpact",
        "recommendation",
        "verification",
      ],
      "finding",
    );
    assert(
      checks.get(finding.checkId)?.status === "fail",
      "Finding requires a failed check",
    );
    refs(finding.evidenceIds);
    assert(
      finding.evidenceIds.every((value) =>
        checks.get(finding.checkId).dependencies.includes(value),
      ),
      "Finding evidence is outside assessed dependencies",
    );
    assert(
      ["critical", "high", "medium", "low"].includes(finding.severity) &&
        ["high", "medium", "low"].includes(finding.confidence),
      "Invalid finding severity/confidence",
    );
    for (const field of [
      "title",
      "description",
      "businessImpact",
      "recommendation",
      "verification",
    ])
      assert(textValue(finding[field]), `Missing finding ${field}`);
  }
  const actions = ids(report.actions, "actionId");
  for (const action of report.actions) {
    record(
      action,
      [
        "actionId",
        "findingIds",
        "status",
        "ownerRole",
        "effort",
        "description",
        "verification",
        "dependencies",
      ],
      "action",
    );
    assert(
      action.status === "proposed",
      "Only proposed actions are supported before execution evidence is implemented",
    );
    strings(action.findingIds, "action findings");
    strings(action.dependencies, "action dependencies");
    assert(
      action.findingIds.length > 0 &&
        action.findingIds.every((id) => findings.has(id)) &&
        action.dependencies.every(
          (id) => actions.has(id) && id !== action.actionId,
        ),
      "Unresolved action references",
    );
    for (const field of ["ownerRole", "effort", "description", "verification"])
      assert(textValue(action[field]), `Missing action ${field}`);
  }
  const visiting = new Set(),
    visited = new Set(),
    actionMap = new Map(
      report.actions.map((action) => [action.actionId, action]),
    );
  function visit(id) {
    assert(!visiting.has(id), "Action dependency cycle");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of actionMap.get(id).dependencies) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of actions) visit(id);
  ids(report.observations, "observationId");
  for (const observation of report.observations) {
    record(
      observation,
      [
        "observationId",
        "label",
        "value",
        "unit",
        "classification",
        "precision",
        "period",
        "scopeDescription",
        "evidenceIds",
      ],
      "observation",
    );
    refs(observation.evidenceIds);
    assert(
      ["historical", "current"].includes(observation.classification) &&
        ["exact", "approximate", "range", "unknown"].includes(
          observation.precision,
        ),
      "Invalid observation classification",
    );
    for (const field of ["label", "unit", "scopeDescription"])
      assert(textValue(observation[field]), `Missing observation ${field}`);
    record(observation.period, ["from", "to"], "observation period");
    const date = (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      timestampValue(`${value}T00:00:00Z`);
    assert(
      date(observation.period.from) &&
        date(observation.period.to) &&
        observation.period.from <= observation.period.to &&
        observation.period.to <= report.generatedAt.slice(0, 10),
      "Invalid observation period",
    );
    const value = observation.value;
    if (observation.precision === "unknown")
      assert(value === null, "Unknown observation must have null value");
    else if (typeof value === "number")
      assert(
        Number.isFinite(value) && observation.precision !== "range",
        "Invalid numeric observation",
      );
    else if (observation.precision === "range") {
      record(value, ["min", "max"], "observation range");
      assert(
        Number.isFinite(value.min) &&
          Number.isFinite(value.max) &&
          value.min <= value.max,
        "Invalid observation range",
      );
    } else {
      record(value, ["numerator", "denominator"], "observation ratio");
      assert(
        Number.isFinite(value.numerator) &&
          Number.isFinite(value.denominator) &&
          value.denominator > 0,
        "Invalid observation ratio",
      );
    }
  }
  ids(report.narrative, "narrativeId");
  for (const item of report.narrative) {
    record(item, ["narrativeId", "kind", "text", "evidenceIds"], "narrative");
    assert(
      [
        "observation",
        "interpretation",
        "recommendation",
        "limitation",
      ].includes(item.kind) && textValue(item.text),
      "Invalid narrative",
    );
    refs(item.evidenceIds);
  }
  assert(Array.isArray(report.decisions), "Invalid review decisions");
  const targets = allTargets(report),
    decided = new Set();
  for (const decision of report.decisions) {
    record(
      decision,
      [
        "targetType",
        "targetId",
        "targetDigest",
        "reviewerId",
        "reviewerType",
        "reviewedAt",
        "verdict",
        "reason",
      ],
      "decision",
    );
    id(decision.reviewerId);
    const target = targets.find(
        (target) =>
          target.type === decision.targetType &&
          target.id === decision.targetId,
      ),
      key = `${decision.targetType}:${decision.targetId}`;
    assert(
      target &&
        !decided.has(key) &&
        decision.targetDigest ===
          enterpriseReviewTargetDigest(report, target.type, target.id),
      "Stale, duplicate or unresolved review target",
    );
    decided.add(key);
    assert(
      decision.reviewerId !== report.authorId &&
        ["human", "independent-ai"].includes(decision.reviewerType) &&
        timestampValue(decision.reviewedAt) &&
        Date.parse(decision.reviewedAt) <= Date.parse(report.generatedAt) &&
        Date.parse(decision.reviewedAt) >=
          Date.parse(report.assessment.assessmentAt) &&
        ["accept", "revise", "reject"].includes(decision.verdict) &&
        textValue(decision.reason),
      "Invalid independent review attribution",
    );
  }
  assert(
    stableJson(report.summary) === stableJson(reportSummary(report)),
    "Report summary mismatch",
  );
  return report;
}

export function buildEnterpriseReport(run, bundle, parent = null) {
  if (bundle?.parentReportDigest != null) {
    assert(parent, "Report parent must be verified before revision");
    validateEnterpriseReport(parent);
    if (run.runId === parent.assessment.runId)
      assert(
        bundle.sourceRunDigest === parent.sourceRunDigest,
        "Same source run cannot be rewritten",
      );
    assert(
      bundle.parentReportDigest === enterpriseDigest(parent),
      "Stale report parent binding",
    );
    assert(
      run.customerId === parent.assessment.customerId &&
        (run.runId === parent.assessment.runId ||
          run.parentRunIds?.includes(parent.assessment.runId)),
      "Invalid report parent customer/run lineage",
    );
    assert(
      bundle.revisionId !== parent.revisionId &&
        Date.parse(bundle.generatedAt) > Date.parse(parent.generatedAt),
      "Invalid report parent revision/time",
    );
    for (const prior of parent.observations) {
      const next = bundle.observations?.find(
        (item) => item.observationId === prior.observationId,
      );
      assert(
        next &&
          (stableJson(next) === stableJson(prior) ||
            (prior.classification === "current" &&
              next.classification === "historical" &&
              stableJson({ ...next, classification: "current" }) ===
                stableJson(prior))),
        "Prior observation must be retained unchanged or archived as historical",
      );
    }
  } else assert(parent === null, "Missing report parent binding");
  validateEnterpriseRun(run);
  record(
    bundle,
    [
      "sourceRunDigest",
      "revisionId",
      "generatedAt",
      "authorId",
      "brand",
      "findings",
      "actions",
      "observations",
      "narrative",
      "decisions",
      "sensitiveValues",
      "parentReportDigest",
    ],
    "report bundle",
  );
  assert(
    bundle.sourceRunDigest === enterpriseDigest(run),
    "Stale report source binding",
  );
  const clean = scrubber(bundle.sensitiveValues ?? []);
  const protectedId = (value) => {
    id(value);
    assert(
      clean(value) === value,
      "Sensitive structural identifier; use an opaque ID",
    );
    return value;
  };
  for (const value of [
    run.customerId,
    run.runId,
    ...(run.parentRunIds ?? []),
    ...run.entities.map((entity) => entity.entityId),
    ...run.evidence.map((item) => item.evidenceId),
  ])
    protectedId(value);
  protectedId(bundle.revisionId);
  protectedId(bundle.authorId);
  const assessment = {};
  for (const key of [
    "schemaFamily",
    "schemaVersion",
    "customerId",
    "runId",
    "operationMode",
    "inventoryMode",
    "assessmentAt",
    "profileVersions",
    "ruleVersions",
    "policyVersions",
    "moduleIds",
    "declaredScope",
    "parentRunIds",
    "planningStatus",
    "registryVersion",
  ])
    if (run[key] !== undefined) assessment[key] = clone(run[key]);
  assessment.entities = run.entities.map((entity) => ({
    entityId: entity.entityId,
    type: entity.type,
    customerId: entity.customerId,
    runId: entity.runId,
  }));
  const projectCheck = (check) => ({
    ...pick(check, [
      "checkId",
      "moduleId",
      "ruleId",
      "ruleVersion",
      "entityId",
      "scenarioId",
      "windowId",
      "status",
      "evidenceIds",
      "dependencies",
      "policyIds",
      "assessedAt",
    ]),
    reason: clean(check.reason),
    ...(check.review
      ? {
          review: {
            reviewer: clean(check.review.reviewer),
            rationale: clean(check.review.rationale),
            reviewedAt: check.review.reviewedAt,
            ...pick(check.review, ["checkBindings", "validUntil"]),
          },
        }
      : {}),
  });
  assessment.checks = run.checks.map(projectCheck);
  assessment.checkContextDigests = Object.fromEntries(
    run.checks.map((check) => [
      check.checkId,
      enterpriseCheckContextDigest(run, check.checkId),
    ]),
  );
  assessment.history = (run.history ?? []).map((item) => ({
    ...pick(item, [
      "customerId",
      "sourceRunId",
      "sourceDigest",
      "invalidatedAt",
    ]),
    check: projectCheck(item.check),
    reasons: item.reasons.map(clean),
  }));
  assessment.requestResponses = (run.requestResponses ?? []).map((item) => ({
    ...pick(item, [
      "customerId",
      "sourceRunId",
      "requestId",
      "originalRequestId",
      "at",
      "outcome",
      "validUntil",
    ]),
    actor: clean(item.actor),
    ...(item.outcome === "answer"
      ? { text: clean(item.text) }
      : { reason: clean(item.reason) }),
  }));
  assessment.evidence = run.evidence.map((item) => {
    const value = {};
    for (const key of [
      "evidenceId",
      "customerId",
      "runId",
      "entityId",
      "digest",
      "observedAt",
      "validUntil",
      "artifactType",
      "scopeKey",
      "windowId",
    ])
      if (item[key] !== undefined) value[key] = clone(item[key]);
    value.source = clean(item.source);
    return value;
  });
  assessment.dataRequests = (run.dataRequests ?? []).map((request) => {
    const value = pick(request, [
      "id",
      "customerId",
      "runId",
      "requestedArtifact",
      "scopeKey",
      "windowId",
      "moduleIds",
      "affectedCheckIds",
      "reason",
      "acceptedFormats",
      "leastPrivilegeAccess",
      "exportInstructions",
      "suggestedOwnerRole",
      "fallback",
      "priority",
      "status",
      "evidenceIds",
      "evidenceDigests",
      "revalidateOnCheckInvalidation",
      "invalidatedEvidenceDigests",
    ]);
    for (const field of [
      "reason",
      "leastPrivilegeAccess",
      "exportInstructions",
      "suggestedOwnerRole",
      "fallback",
    ])
      value[field] = clean(value[field]);
    value.acceptedFormats = value.acceptedFormats.map(clean);
    return value;
  });
  function collection(key, fields) {
    assert(Array.isArray(bundle[key] ?? []), `Invalid ${key}`);
    return (bundle[key] ?? []).map((item) => {
      const value = clone(item);
      for (const field of fields) value[field] = clean(value[field]);
      return value;
    });
  }
  const report = {
    schemaFamily: "enterprise-report",
    schemaVersion: 1,
    edition: "customer",
    revisionId: bundle.revisionId,
    parentReportDigest: bundle.parentReportDigest ?? null,
    generatedAt: bundle.generatedAt,
    authorId: bundle.authorId,
    sourceRunDigest: bundle.sourceRunDigest,
    tool: clone(reportTool),
    brand: {
      name: clean(bundle.brand?.name ?? "Website audit"),
      accent: bundle.brand?.accent ?? "#234e52",
    },
    assessment,
    coverage: enterpriseCoverage(assessment),
    dataRequests: assessment.dataRequests,
    findings: collection("findings", [
      "title",
      "description",
      "businessImpact",
      "recommendation",
      "verification",
    ]),
    actions: collection("actions", [
      "ownerRole",
      "effort",
      "description",
      "verification",
    ]),
    observations: collection("observations", [
      "label",
      "unit",
      "scopeDescription",
    ]),
    narrative: collection("narrative", ["text"]),
    decisions: collection("decisions", ["reason"]),
    redaction: {
      policyDigest: enterpriseDigest(
        [...(bundle.sensitiveValues ?? [])].sort(),
      ),
      method: "literal-and-common-patterns",
      reviewRequired: true,
    },
    methodology: [
      "Coverage concerns declared checks, not every possible website defect.",
      "Historical measurements are retained separately from current observations.",
      "Structural validation and attributed review do not independently authenticate provider data.",
      "No raw evidence payloads are included; inspect the source run using its recorded digest.",
      "Redaction requires review; pattern matching is not a guarantee that every confidential value was identified.",
    ],
  };
  if (parent) {
    const previous = parent.assessment;
    assertReviewRequestContinuity(
      previous.dataRequests,
      assessment.dataRequests,
    );
    for (const request of previous.dataRequests ?? []) {
      if (request.revalidateOnCheckInvalidation !== true) continue;
      const changed = request.affectedCheckIds.some((id) => {
        const oldCheck = previous.checks.find((check) => check.checkId === id);
        const newCheck = assessment.checks.find(
          (check) => check.checkId === id,
        );
        return (
          !oldCheck ||
          !newCheck ||
          !previous.checkContextDigests?.[id] ||
          previous.checkContextDigests[id] !==
            assessment.checkContextDigests[id] ||
          oldCheck.status !== newCheck.status ||
          stableJson(oldCheck.review ?? null) !==
            stableJson(newCheck.review ?? null)
        );
      });
      if (!changed) continue;
      const current = assessment.dataRequests.find(
        (item) =>
          item.customerId === request.customerId &&
          item.requestedArtifact === request.requestedArtifact &&
          item.scopeKey === request.scopeKey &&
          item.windowId === request.windowId,
      );
      const denied = new Set(current.invalidatedEvidenceDigests ?? []);
      const oldReceipts = previous.evidence.filter(
        (item) =>
          item.customerId === request.customerId &&
          item.artifactType === request.requestedArtifact &&
          item.scopeKey === request.scopeKey &&
          item.windowId === request.windowId,
      );
      assert(
        oldReceipts.every((item) => denied.has(item.digest)) &&
          Object.values(request.evidenceDigests).every((digest) =>
            denied.has(digest),
          ),
        "Changed review request context requires invalidating prior receipt content",
      );
    }
    const retained = (items, value) =>
      items.some((item) => stableJson(item) === stableJson(value));
    for (const item of previous.history ?? [])
      assert(
        retained(assessment.history, item),
        "Prior verdict history must be retained",
      );
    for (const item of previous.requestResponses ?? [])
      assert(
        retained(assessment.requestResponses, item),
        "Prior response history must be retained",
      );
    for (const declared of previous.declaredScope.checks)
      assert(
        retained(assessment.declaredScope.checks, declared),
        "Prior declared scope must be retained",
      );
    for (const module of previous.declaredScope.moduleIds)
      assert(
        assessment.declaredScope.moduleIds.includes(module),
        "Prior module scope must be retained",
      );
    for (const check of previous.checks.filter(
      (item) => item.status !== "unknown",
    )) {
      const unchanged = assessment.checks.some(
        (item) => stableJson(item) === stableJson(check),
      );
      if (unchanged && previous.runId !== run.runId)
        assert(
          previous.checkContextDigests?.[check.checkId] ===
            assessment.checkContextDigests[check.checkId],
          "Changed assessment dependencies/context require invalidation and reassessment",
        );
      const archived = assessment.history.some(
        (item) =>
          item.sourceRunId === previous.runId &&
          item.sourceDigest === parent.sourceRunDigest &&
          stableJson(item.check) === stableJson(check),
      );
      assert(
        unchanged || archived,
        "Changed prior verdict requires bound historical record",
      );
    }
    for (const observation of parent.observations)
      for (const evidenceId of observation.evidenceIds) {
        const oldEvidence = previous.evidence.find(
          (item) => item.evidenceId === evidenceId,
        );
        const newEvidence = assessment.evidence.find(
          (item) => item.evidenceId === evidenceId,
        );
        assert(
          stableJson(oldEvidence) === stableJson(newEvidence),
          "Historical observation evidence binding changed",
        );
      }
  }
  const inspect = (value) => {
    if (typeof value === "string")
      assert(
        clean(value) === value,
        "Sensitive structural field; use an opaque identifier or redact the source",
      );
    else if (Array.isArray(value)) value.forEach(inspect);
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value)) {
        inspect(key);
        inspect(item);
      }
  };
  inspect(report);
  report.summary = reportSummary(report);
  return validateEnterpriseReport(report);
}
