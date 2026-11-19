// Offline attributed review evaluation. Never accepts cached packets as authority.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
import { prepareExperimentReview } from "./experiment-review-packet.mjs";
import {
  EXPERIMENT_REVIEW_GATES,
  evaluateExperimentDecision,
} from "./experiment-decision.mjs";
const ok = (v) => {
  if (!v) throw Error("Invalid experiment review evidence");
};
const shape = (v, keys) =>
  ok(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Reflect.ownKeys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
  );
const id = (v) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const txt = (v) =>
  typeof v === "string" && v.length > 0 && v.length <= 4096 && v.isWellFormed();
const sha = (v) => createHash("sha256").update(v).digest("hex");
function time(v) {
  ok(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) &&
      Number.isFinite(Date.parse(v)),
  );
  const n = Date.parse(v);
  ok(
    new Date(n).toISOString().replace(".000Z", "Z") === v.replace(".000Z", "Z"),
  );
  return n;
}
const gateRoles = {
  designReviewed: [
    "registration-history",
    "assignment-config",
    "cohort-query",
    "analysis-ledger",
    "outcome-dictionary",
  ],
  preregistered: ["registration-history"],
  randomizationVerified: ["assignment-config", "cohort-query"],
  noInterference: ["interference-evidence", "assignment-config"],
  metricFamilyReviewed: [
    "registration-history",
    "analysis-ledger",
    "outcome-dictionary",
    "metric-query",
  ],
  onePlannedAnalysis: ["analysis-ledger", "registration-history"],
  sourceScopeVerified: [
    "registration-history",
    "assignment-config",
    "cohort-query",
    "outcome-dictionary",
    "metric-query",
    "analysis-ledger",
    "quality-evidence",
    "interference-evidence",
  ],
  populationComplete: ["cohort-query", "quality-evidence", "metric-query"],
  outcomesMature: ["outcome-dictionary", "metric-query", "quality-evidence"],
  fixedHorizonCompleted: ["analysis-ledger", "registration-history"],
  metricDefinitionsVerified: ["outcome-dictionary", "metric-query"],
  qualityReviewed: [
    "quality-evidence",
    "assignment-config",
    "cohort-query",
    "metric-query",
  ],
};
export function experimentReviewRequirements(requirements, gate) {
  ok(EXPERIMENT_REVIEW_GATES.includes(gate));
  return requirements
    .filter((r) => gateRoles[gate].includes(r.kind))
    .map((r) => r.requirementId);
}
export function evaluateReviewedExperiment(
  context,
  aggregateSources,
  supportSources,
  policy,
  receipt,
) {
  const packet = prepareExperimentReview(
    context,
    aggregateSources,
    supportSources,
  );
  shape(policy, [
    "scope",
    "reviewerIds",
    "allowedTypes",
    "maxAgeSeconds",
    "validUntil",
  ]);
  ok(enterpriseDigest(policy.scope) === enterpriseDigest(context.scope));
  ok(
    Array.isArray(policy.reviewerIds) &&
      policy.reviewerIds.length > 0 &&
      policy.reviewerIds.length <= 20 &&
      policy.reviewerIds.every(id) &&
      new Set(policy.reviewerIds).size === policy.reviewerIds.length,
  );
  ok(
    Array.isArray(policy.allowedTypes) &&
      policy.allowedTypes.length > 0 &&
      policy.allowedTypes.length <= 2 &&
      policy.allowedTypes.every((t) => ["ai", "human"].includes(t)) &&
      new Set(policy.allowedTypes).size === policy.allowedTypes.length,
  );
  ok(
    Number.isSafeInteger(policy.maxAgeSeconds) &&
      policy.maxAgeSeconds > 0 &&
      policy.maxAgeSeconds <= 31622400,
  );
  const at = time(context.assessmentAt),
    policyUntil = time(policy.validUntil),
    policyDigest = enterpriseDigest(policy);
  const reasons = [];
  if (at >= policyUntil) reasons.push("expired-review-policy");
  let raw = null,
    receiptHash = null,
    effectiveValidUntil = null;
  const sources = new Map(
    [...aggregateSources, ...supportSources].map((s) => [s.sourceId, s]),
  );
  if (receipt === null) reasons.push("missing-review");
  else {
    shape(receipt, ["artifactText", "artifactHash"]);
    ok(
      typeof receipt.artifactText === "string" &&
        receipt.artifactText.isWellFormed() &&
        Buffer.byteLength(receipt.artifactText) <= 1024 * 1024 &&
        hash(receipt.artifactHash) &&
        sha(receipt.artifactText) === receipt.artifactHash,
    );
    receiptHash = receipt.artifactHash;
    raw = parseCaptureJson(receipt.artifactText);
    shape(raw, [
      "schemaVersion",
      "scope",
      "protocolDigest",
      "evidenceSetDigest",
      "policyDigest",
      "synthetic",
      "reviewer",
      "reviewedAt",
      "validUntil",
      "inventory",
      "verdicts",
    ]);
    ok(
      raw.schemaVersion === 1 &&
        hash(raw.protocolDigest) &&
        hash(raw.evidenceSetDigest) &&
        hash(raw.policyDigest) &&
        typeof raw.synthetic === "boolean",
    );
    if (
      enterpriseDigest(raw.scope) !== enterpriseDigest(context.scope) ||
      raw.protocolDigest !== context.protocolDigest ||
      raw.evidenceSetDigest !== packet.evidenceSetDigest ||
      raw.policyDigest !== policyDigest ||
      raw.synthetic !== context.protocol.synthetic
    )
      reasons.push("review-binding-mismatch");
    shape(raw.reviewer, [
      "id",
      "type",
      "relationship",
      "conflictOfInterest",
      "disclosure",
    ]);
    ok(
      id(raw.reviewer.id) &&
        ["ai", "human"].includes(raw.reviewer.type) &&
        ["declared-independent", "author", "other", "unknown"].includes(
          raw.reviewer.relationship,
        ) &&
        ["none-declared", "declared", "unknown"].includes(
          raw.reviewer.conflictOfInterest,
        ) &&
        txt(raw.reviewer.disclosure),
    );
    if (
      !policy.reviewerIds.includes(raw.reviewer.id) ||
      !policy.allowedTypes.includes(raw.reviewer.type)
    )
      reasons.push("reviewer-outside-policy");
    if (
      raw.reviewer.relationship !== "declared-independent" ||
      raw.reviewer.conflictOfInterest !== "none-declared"
    )
      reasons.push("independent-review-unestablished");
    const reviewed = time(raw.reviewedAt),
      until = time(raw.validUntil);
    const lastCapture = Math.max(
      -Infinity,
      ...[...sources.values()].map((s) => time(s.capturedAt)),
    );
    const sourceExpiry =
      time(context.protocol.enrollment.to) + context.maxAgeSeconds * 1000;
    effectiveValidUntil = new Date(
      Math.min(
        until,
        reviewed + policy.maxAgeSeconds * 1000,
        policyUntil,
        sourceExpiry,
      ),
    ).toISOString();
    if (
      reviewed < lastCapture ||
      reviewed > at ||
      until <= reviewed ||
      at >= until ||
      at >= reviewed + policy.maxAgeSeconds * 1000 ||
      until > policyUntil ||
      until > sourceExpiry
    )
      reasons.push("review-time-invalid-or-expired");
    ok(Array.isArray(raw.inventory) && raw.inventory.length <= 120);
    const inventory = new Map();
    for (const item of raw.inventory) {
      shape(item, ["sourceId", "artifactHash", "disposition", "reason"]);
      ok(
        id(item.sourceId) &&
          !inventory.has(item.sourceId) &&
          hash(item.artifactHash) &&
          ["supports", "contradicts", "unresolved", "out-of-scope"].includes(
            item.disposition,
          ) &&
          txt(item.reason),
      );
      inventory.set(item.sourceId, item);
      if (
        !sources.has(item.sourceId) ||
        item.artifactHash !== sources.get(item.sourceId).artifactHash
      )
        reasons.push(`inventory-hash-mismatch:${item.sourceId}`);
      if (["contradicts", "unresolved"].includes(item.disposition))
        reasons.push(`unresolved-inventory:${item.sourceId}`);
    }
    if (
      inventory.size !== sources.size ||
      [...sources.keys()].some((k) => !inventory.has(k))
    )
      reasons.push("inventory-coverage-mismatch");
    for (const sourceId of packet.aggregate.selectedSourceIds)
      if (inventory.get(sourceId)?.disposition !== "supports")
        reasons.push(`selected-aggregate-not-supported:${sourceId}`);
    ok(
      Array.isArray(raw.verdicts) &&
        raw.verdicts.length === EXPERIMENT_REVIEW_GATES.length,
    );
    const gates = new Set(),
      requirements = new Map(
        packet.requirements.map((r) => [r.requirementId, r]),
      );
    for (const v of raw.verdicts) {
      shape(v, ["gate", "verdict", "reason", "bindings"]);
      ok(
        EXPERIMENT_REVIEW_GATES.includes(v.gate) &&
          !gates.has(v.gate) &&
          ["accept", "reject", "pending"].includes(v.verdict) &&
          txt(v.reason) &&
          Array.isArray(v.bindings) &&
          v.bindings.length <= 100,
      );
      gates.add(v.gate);
      const covered = new Set(),
        bindings = new Set();
      for (const b of v.bindings) {
        shape(b, ["requirementId", "sourceId", "artifactHash", "locator"]);
        shape(b.locator, ["lineStart", "lineEnd"]);
        ok(hash(b.requirementId) && hash(b.artifactHash) && id(b.sourceId));
        const unique = b.requirementId + ":" + b.sourceId;
        ok(!bindings.has(unique));
        bindings.add(unique);
        const r = requirements.get(b.requirementId),
          source = sources.get(b.sourceId);
        const lines = source
          ? source.artifactText.split(/\r\n|\n|\r/).length
          : 0;
        ok(
          Number.isSafeInteger(b.locator.lineStart) &&
            Number.isSafeInteger(b.locator.lineEnd) &&
            b.locator.lineStart >= 1 &&
            b.locator.lineEnd >= b.locator.lineStart,
        );
        if (b.locator.lineEnd > lines)
          reasons.push(`invalid-source-locator:${v.gate}`);
        if (
          !r ||
          !source ||
          !r.matchingSourceIds.includes(b.sourceId) ||
          b.artifactHash !== source.artifactHash ||
          inventory.get(b.sourceId)?.disposition !== "supports"
        )
          reasons.push(`invalid-gate-binding:${v.gate}`);
        else covered.add(b.requirementId);
      }
      if (v.verdict !== "accept") reasons.push(`review-${v.verdict}:${v.gate}`);
      else if (
        experimentReviewRequirements(packet.requirements, v.gate).some(
          (r) => !covered.has(r),
        )
      )
        reasons.push(`missing-gate-support:${v.gate}`);
    }
  }
  if (packet.requirements.some((r) => r.status !== "binding-matched"))
    reasons.push("incomplete-support-packet");
  const accepted = raw !== null && reasons.length === 0;
  let decision = packet.aggregate.decision;
  if (accepted) {
    const facts = { ...decision.facts };
    for (const gate of EXPERIMENT_REVIEW_GATES) facts[gate] = true;
    facts.outcomesMature = decision.facts.outcomesMature === true;
    facts.fixedHorizonCompleted = decision.facts.fixedHorizonCompleted === true;
    const selected = new Set(packet.aggregate.selectedSourceIds);
    const original = packet.aggregate.records.find((r) =>
      selected.has(r.sourceId),
    );
    decision = evaluateExperimentDecision(
      context.protocol.decision,
      facts,
      original ? original.raw.metrics : [],
    );
  }
  const uniqueReasons = [...new Set(reasons)];
  const requests = uniqueReasons.map((condition) => ({
    requestId: enterpriseDigest({
      bindingDigest: packet.aggregate.bindingDigest,
      evidenceSetDigest: packet.evidenceSetDigest,
      policyDigest,
      condition,
      ownerRole: "independent-reviewer",
    }),
    assessedAt: context.assessmentAt,
    scope: { ...context.scope },
    ownerRole: "independent-reviewer",
    condition,
    acceptedEvidence:
      "A current original review receipt covering this exact complete packet, policy and every prerequisite with precise source lines and reasons.",
    fallback:
      "Keep the interpretation blocked; never substitute an unrelated or source-authored approval.",
  }));
  return {
    namespace: "experiment-reviewed-v1",
    packet,
    policy: JSON.parse(JSON.stringify(policy)),
    policyDigest,
    receiptHash,
    review: {
      status: accepted
        ? "accepted-attributed-review"
        : receipt === null
          ? "missing"
          : "not-accepted",
      reasons: uniqueReasons,
      effectiveValidUntil,
      receipt: raw,
    },
    decision,
    requests: [
      ...packet.requests.filter(
        (r) =>
          !accepted ||
          (r.condition !== "independent-source-bound-review-required" &&
            (!r.condition?.startsWith("unproven-") ||
              decision.blockers.includes(r.condition))),
      ),
      ...requests,
    ],
    reviewerAuthenticated: false,
    independenceAuthenticated: false,
    providerAuthenticated: false,
    causalAcceptance: false,
    actionAuthorized: false,
  };
}
