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
    "Invalid research access state",
  );
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const time = (v) => {
  assert(timestampValue(v), "Invalid research access time");
  return Date.parse(v);
};
function snapshot(context) {
  planResearchIntake(context, []);
  const scope = {
    customerId: context.customerId,
    entityId: context.entityId,
    studyId: context.studyId,
    recipientId: context.recipientId,
    protocolDigest: context.protocolDigest,
    purposeDigest: enterpriseDigest(context.protocol.purpose),
  };
  // Access freshness policy is part of the state, not merely a caller hint.
  const accessDigest = enterpriseDigest({
    access: [...context.access].sort((a, b) =>
      a.participantId < b.participantId ? -1 : 1,
    ),
    maxAccessAgeSeconds: context.maxAccessAgeSeconds,
  });
  return { scope, accessDigest };
}
function contributorExpiry(context, scope, contributorIds) {
  assert(
    Array.isArray(contributorIds) &&
      contributorIds.length > 0 &&
      contributorIds.length <= 1000 &&
      new Set(contributorIds).size === contributorIds.length,
    "Invalid contributor closure",
  );
  const participants = new Set(
    context.protocol.participants.map((p) => p.participantId),
  );
  assert(
    contributorIds.every((id) => participants.has(id)),
    "Unknown research contributor",
  );
  const access = new Map(context.access.map((a) => [a.participantId, a]));
  const deadlines = contributorIds.map((id) => {
    const a = access.get(id);
    if (
      !a ||
      a.analysisAllowed !== true ||
      a.customerSummaryAllowed !== true ||
      stableJson(a.scope) !== stableJson(scope)
    )
      return 0;
    return Math.min(
      time(a.validUntil),
      time(a.stateObservedAt) + context.maxAccessAgeSeconds * 1000,
    );
  });
  return new Date(Math.min(...deadlines)).toISOString();
}
function validate(state) {
  shape(state, [
    "schemaVersion",
    "scope",
    "generation",
    "accessDigest",
    "changedAt",
    "observedAt",
    "parentDigest",
  ]);
  shape(state.scope, [
    "customerId",
    "entityId",
    "studyId",
    "recipientId",
    "protocolDigest",
    "purposeDigest",
  ]);
  assert(
    state.schemaVersion === 1 &&
      Number.isSafeInteger(state.generation) &&
      state.generation > 0 &&
      hash(state.accessDigest),
    "Invalid research access generation",
  );
  assert(
    ["customerId", "entityId", "studyId", "recipientId"].every(
      (k) =>
        typeof state.scope[k] === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(state.scope[k]),
    ) &&
      hash(state.scope.protocolDigest) &&
      hash(state.scope.purposeDigest),
    "Invalid research access scope",
  );
  assert(
    time(state.changedAt) <= time(state.observedAt),
    "Invalid research access chronology",
  );
  assert(
    state.generation === 1
      ? state.parentDigest === null
      : hash(state.parentDigest),
    "Invalid research access ancestry",
  );
}
/** Pure private reducer. Caller must atomically persist with CAS in a trusted store. */
export function advanceResearchAccessState(previous, expectedDigest, context) {
  const current = snapshot(context);
  if (previous === null) {
    assert(expectedDigest === null, "Research access creation conflict");
    return {
      schemaVersion: 1,
      ...current,
      generation: 1,
      changedAt: context.assessmentAt,
      observedAt: context.assessmentAt,
      parentDigest: null,
    };
  }
  validate(previous);
  assert(
    hash(expectedDigest) && enterpriseDigest(previous) === expectedDigest,
    "Research access compare-and-swap conflict",
  );
  assert(
    stableJson(previous.scope) === stableJson(current.scope),
    "Research access scope cannot be rebound",
  );
  assert(
    time(context.assessmentAt) >= time(previous.observedAt),
    "Research access time cannot move backwards",
  );
  const changed = previous.accessDigest !== current.accessDigest;
  if (!changed)
    return {
      ...globalThis.structuredClone(previous),
      observedAt: context.assessmentAt,
    };
  assert(
    time(context.assessmentAt) > time(previous.observedAt),
    "Research access changes require strictly increasing observation time",
  );
  assert(
    previous.generation < Number.MAX_SAFE_INTEGER,
    "Research access generation exhausted",
  );
  return {
    schemaVersion: 1,
    ...current,
    generation: previous.generation + 1,
    changedAt: context.assessmentAt,
    observedAt: context.assessmentAt,
    parentDigest: enterpriseDigest(previous),
  };
}
/** Bind a freshly reviewed artifact to current trusted state; never grants delivery. */
export function bindResearchAccessRevision(
  state,
  context,
  artifactDigest,
  reviewedAt,
  contributorIds,
) {
  validate(state);
  const current = snapshot(context);
  assert(
    stableJson(state.scope) === stableJson(current.scope) &&
      state.accessDigest === current.accessDigest,
    "Research access snapshot mismatch",
  );
  assert(
    time(context.assessmentAt) >= time(state.observedAt),
    "Research access snapshot expired or future",
  );
  assert(
    hash(artifactDigest) &&
      time(reviewedAt) >= time(state.changedAt) &&
      time(reviewedAt) <= time(context.assessmentAt),
    "Research review predates current access generation",
  );
  const validUntil = contributorExpiry(context, current.scope, contributorIds);
  assert(
    time(context.assessmentAt) < time(validUntil),
    "Research contributors expired or ineligible",
  );
  return {
    schemaVersion: 1,
    contributorIds: [...contributorIds].sort(),
    validUntil,
    scope: globalThis.structuredClone(state.scope),
    generation: state.generation,
    accessDigest: state.accessDigest,
    artifactDigest,
    reviewedAt,
  };
}
/** Revision consistency only, alongside current permission preflight; never a grant. */
export function checkResearchAccessRevision(
  state,
  context,
  binding,
  artifactDigest,
) {
  validate(state);
  const current = snapshot(context);
  shape(binding, [
    "schemaVersion",
    "scope",
    "generation",
    "accessDigest",
    "artifactDigest",
    "reviewedAt",
    "contributorIds",
    "validUntil",
  ]);
  const reasons = [];
  if (
    binding.schemaVersion !== 1 ||
    stableJson(binding.scope) !== stableJson(state.scope) ||
    stableJson(state.scope) !== stableJson(current.scope)
  )
    reasons.push("scope-mismatch");
  if (
    !Number.isSafeInteger(binding.generation) ||
    binding.generation !== state.generation ||
    binding.accessDigest !== state.accessDigest ||
    state.accessDigest !== current.accessDigest
  )
    reasons.push("access-generation-mismatch");
  if (!hash(artifactDigest) || binding.artifactDigest !== artifactDigest)
    reasons.push("artifact-mismatch");
  if (
    time(binding.reviewedAt) < time(state.changedAt) ||
    time(binding.reviewedAt) > time(context.assessmentAt)
  )
    reasons.push("review-generation-mismatch");
  if (
    time(context.assessmentAt) < time(state.observedAt) ||
    time(context.assessmentAt) >= time(binding.validUntil)
  )
    reasons.push("access-state-expired-or-future");
  if (
    binding.validUntil !==
    contributorExpiry(context, current.scope, binding.contributorIds)
  )
    reasons.push("contributor-access-mismatch");
  return {
    revisionMatches: reasons.length === 0,
    reasons,
    deliveryAuthorized: false,
    storageAuthorized: false,
  };
}
