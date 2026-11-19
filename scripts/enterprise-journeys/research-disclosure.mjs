import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { planResearchIntake } from "./research-intake.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid disclosure metadata shape",
  );
const id = (v) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const time = (v) => {
  assert(timestampValue(v), "Invalid disclosure timestamp");
  return Date.parse(v);
};
const kinds = [
  "observed-behavior",
  "participant-statement",
  "analyst-interpretation",
];

/** PRIVATE metadata only. Eligibility is neither content verification nor acquisition authority. */
export function planResearchDisclosure(
  context,
  descriptors,
  policy,
  candidates,
) {
  const intake = planResearchIntake(context, descriptors);
  const scope = {
    customerId: context.customerId,
    entityId: context.entityId,
    studyId: context.studyId,
    recipientId: context.recipientId,
    protocolDigest: context.protocolDigest,
    purposeDigest: enterpriseDigest(context.protocol.purpose),
  };
  shape(policy, [
    "schemaVersion",
    "scope",
    "allowedKinds",
    "reviewMaxAgeSeconds",
    "validUntil",
  ]);
  shape(policy.scope, Object.keys(scope));
  assert(
    policy.schemaVersion === 1 &&
      stableJson(policy.scope) === stableJson(scope),
    "Disclosure policy scope mismatch",
  );
  assert(
    Array.isArray(policy.allowedKinds) &&
      policy.allowedKinds.length > 0 &&
      policy.allowedKinds.length <= kinds.length &&
      new Set(policy.allowedKinds).size === policy.allowedKinds.length &&
      policy.allowedKinds.every((k) => kinds.includes(k)),
    "Invalid disclosure policy kinds",
  );
  assert(
    Number.isSafeInteger(policy.reviewMaxAgeSeconds) &&
      policy.reviewMaxAgeSeconds > 0 &&
      policy.reviewMaxAgeSeconds <= 31622400,
    "Invalid disclosure review freshness",
  );
  const expired = time(policy.validUntil) <= time(context.assessmentAt);
  assert(
    Array.isArray(candidates) && candidates.length <= 1000,
    "Disclosure candidate count limit",
  );
  const ids = new Set(),
    groups = new Map(),
    sourcePlan = new Map(intake.sources.map((s) => [s.sourceId, s]));
  for (const d of descriptors) {
    if (!groups.has(d.recordId)) groups.set(d.recordId, []);
    groups.get(d.recordId).push(d);
  }
  // Validate the entire metadata set before producing any acquisition decision.
  for (const c of candidates) {
    shape(c, [
      "candidateId",
      "scope",
      "kind",
      "artifactHash",
      "receiptHash",
      "supportBindings",
    ]);
    shape(c.scope, Object.keys(scope));
    assert(
      id(c.candidateId) &&
        !ids.has(c.candidateId) &&
        hash(c.artifactHash) &&
        hash(c.receiptHash) &&
        kinds.includes(c.kind),
      "Invalid disclosure candidate identity",
    );
    ids.add(c.candidateId);
    assert(
      stableJson(c.scope) === stableJson(scope),
      "Disclosure candidate scope mismatch",
    );
    assert(
      Array.isArray(c.supportBindings) &&
        c.supportBindings.length > 0 &&
        c.supportBindings.length <= 100,
      "Invalid disclosure support set",
    );
    const supports = new Set();
    for (const b of c.supportBindings) {
      shape(b, ["recordId", "recordDigest"]);
      assert(
        id(b.recordId) && hash(b.recordDigest) && !supports.has(b.recordId),
        "Invalid disclosure support binding",
      );
      supports.add(b.recordId);
    }
  }
  // An artifact must isolate a single candidate, including full review receipts.
  const owners = new Map();
  for (const c of candidates)
    for (const h of [c.artifactHash, c.receiptHash]) {
      if (!owners.has(h)) owners.set(h, new Set());
      owners.get(h).add(c.candidateId);
    }
  const researchArtifacts = new Set(descriptors.map((d) => d.artifactHash));
  const decisions = candidates.map((c) => {
    const reasons = new Set(),
      bound = new Set(c.supportBindings.map((b) => b.recordId));
    if (expired) reasons.add("policy-expired");
    if (!policy.allowedKinds.includes(c.kind))
      reasons.add("kind-not-permitted");
    if (
      [c.artifactHash, c.receiptHash].some(
        (h) => owners.get(h).size !== 1 || researchArtifacts.has(h),
      ) ||
      c.artifactHash === c.receiptHash
    )
      reasons.add("candidate-isolated-artifact-required");
    const directSessions = new Set();
    let inferenceCount = 0;
    for (const b of c.supportBindings) {
      const records = groups.get(b.recordId);
      if (!records) {
        reasons.add("unresolved-research-support");
        continue;
      }
      if (
        records.some((d) => !sourcePlan.get(d.sourceId).customerSummaryEligible)
      )
        reasons.add("support-sharing-ineligible");
      for (const d of records) {
        if (d.kind !== "analyst-inference") directSessions.add(d.sessionId);
        if (c.kind !== "analyst-interpretation" && d.kind !== c.kind)
          reasons.add("support-kind-mismatch");
        if (d.kind === "analyst-inference") {
          inferenceCount++;
          for (const dependency of d.supportingRecordIds)
            if (!bound.has(dependency))
              reasons.add("incomplete-direct-dependency-closure");
        }
      }
    }
    if (
      c.kind === "analyst-interpretation" &&
      directSessions.size > 1 &&
      !context.protocol.allowCrossSessionInference
    )
      reasons.add("cross-session-interpretation-not-declared");
    if (c.kind === "analyst-interpretation" && inferenceCount === 0)
      reasons.add("inference-record-required");
    return {
      candidateId: c.candidateId,
      artifactHash: c.artifactHash,
      receiptHash: c.receiptHash,
      metadataDigest: enterpriseDigest(c),
      fetchEligible: reasons.size === 0,
      reasons: [...reasons].sort(),
    };
  });
  return {
    schemaVersion: 1,
    namespace: "private-research-disclosure-plan",
    assessmentAt: context.assessmentAt,
    contextDigest: intake.contextDigest,
    descriptorSetDigest: intake.descriptorSetDigest,
    policyDigest: enterpriseDigest(policy),
    candidateSetDigest: enterpriseDigest(candidates),
    candidates: decisions,
    contentVerified: false,
    reviewVerified: false,
    customerExportAuthorized: false,
    storageAuthorized: false,
    actionAuthorized: false,
    limitations: [
      "Private metadata only; never publish candidate identifiers, support bindings, hashes or protected counts.",
      "Reassess current owner-supplied access before retrieval; this does not authenticate consent or grant host authorization.",
      "Content, exact support digests and complete review receipts must be validated after authorized acquisition. No customer projection is produced.",
    ],
  };
}
