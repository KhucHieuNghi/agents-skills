import {
  enterpriseDigest,
  stableJson,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  advanceResearchAccessState,
  bindResearchAccessRevision,
  checkResearchAccessRevision,
} from "./research-access-state.mjs";
import { planResearchDisclosure } from "./research-disclosure.mjs";
import { projectResearchDisclosure } from "./research-projection.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid research revision input",
  );
const artifactDigest = (candidate, policy) =>
  enterpriseDigest({ candidate, policyDigest: enterpriseDigest(policy) });
function contributors(context, descriptors, candidate) {
  const aliases = new Map(
    context.protocol.participants.flatMap((p) =>
      [p.participantId, ...p.aliases].map((a) => [a, p.participantId]),
    ),
  );
  const support = new Set(candidate.supportBindings.map((b) => b.recordId));
  return [
    ...new Set(
      descriptors
        .filter(
          (d) => support.has(d.recordId) && d.kind !== "analyst-inference",
        )
        .map((d) => aliases.get(d.participantAlias)),
    ),
  ].sort();
}
function currentState(state, context) {
  const next = advanceResearchAccessState(
    state,
    enterpriseDigest(state),
    context,
  );
  assert(
    next.generation === state.generation &&
      next.accessDigest === state.accessDigest,
    "Research state must be advanced before projection",
  );
}
/** Trusted reviewer integration supplies actual review time. Parsed receipt is checked again during projection. */
export function bindResearchCandidateRevision(
  state,
  context,
  descriptors,
  policy,
  candidate,
  reviewedAt,
) {
  currentState(state, context);
  const plan = planResearchDisclosure(context, descriptors, policy, [
    candidate,
  ]);
  assert(
    plan.candidates[0].fetchEligible,
    "Research candidate is not currently eligible",
  );
  return {
    candidateId: candidate.candidateId,
    binding: bindResearchAccessRevision(
      state,
      context,
      artifactDigest(candidate, policy),
      reviewedAt,
      contributors(context, descriptors, candidate),
    ),
  };
}
/** Metadata before all draft/receipt acquisition; caller supplies latest trusted stored state. */
export function planResearchAtRevision(
  state,
  context,
  descriptors,
  policy,
  candidates,
  registrations,
) {
  currentState(state, context);
  const preflight = planResearchDisclosure(
    context,
    descriptors,
    policy,
    candidates,
  );
  assert(
    Array.isArray(registrations) && registrations.length <= 1000,
    "Research revision registration limit",
  );
  const candidateMap = new Map(candidates.map((c) => [c.candidateId, c])),
    registered = new Map();
  for (const r of registrations) {
    shape(r, ["candidateId", "binding"]);
    assert(
      candidateMap.has(r.candidateId) && !registered.has(r.candidateId),
      "Unknown/duplicate research registration",
    );
    registered.set(r.candidateId, r.binding);
  }
  return {
    ...preflight,
    namespace: "private-research-revision-plan",
    stateDigest: enterpriseDigest(state),
    generation: state.generation,
    candidates: preflight.candidates.map((p) => {
      const c = candidateMap.get(p.candidateId),
        binding = registered.get(p.candidateId),
        reasons = [...p.reasons];
      if (!binding) reasons.push("missing-revision-registration");
      else {
        const result = checkResearchAccessRevision(
          state,
          context,
          binding,
          artifactDigest(c, policy),
        );
        reasons.push(...result.reasons);
        if (
          stableJson(binding.contributorIds) !==
          stableJson(contributors(context, descriptors, c))
        )
          reasons.push("incomplete-contributor-closure");
      }
      return {
        ...p,
        fetchEligible: reasons.length === 0,
        reasons: [...new Set(reasons)].sort(),
      };
    }),
  };
}
/** Offline revision-aware projection, still not a persistent vault or delivery operation. */
export function projectResearchAtRevision(
  state,
  context,
  descriptors,
  researchPayloads,
  policy,
  candidates,
  payloads,
  registrations,
) {
  const plan = planResearchAtRevision(
    state,
    context,
    descriptors,
    policy,
    candidates,
    registrations,
  );
  const allowed = new Map(plan.candidates.map((c) => [c.candidateId, c])),
    registered = new Map(registrations.map((r) => [r.candidateId, r.binding]));
  assert(
    Array.isArray(payloads) && payloads.length <= 1000,
    "Research revision payload limit",
  );
  const seen = new Set();
  for (const p of payloads) {
    shape(p, ["candidateId", "artifactText", "receiptText"]);
    assert(
      allowed.has(p.candidateId) && !seen.has(p.candidateId),
      "Unknown/duplicate revision payload",
    );
    seen.add(p.candidateId);
    assert(
      allowed.get(p.candidateId).fetchEligible,
      "Ineligible revision payload; do not retrieve historical text",
    );
  }
  const result = projectResearchDisclosure(
    context,
    descriptors,
    researchPayloads,
    policy,
    candidates,
    payloads,
  );
  const rejectedRefs = new Set();
  result.privateDecision.decisions = result.privateDecision.decisions.map(
    (d) => {
      const reasons = [...allowed.get(d.candidateId).reasons];
      if (
        d.status === "included-in-draft" &&
        d.reviewedAt !== registered.get(d.candidateId)?.reviewedAt
      )
        reasons.push("registered-review-time-mismatch");
      if (!reasons.length) return d;
      if (d.reference) rejectedRefs.add(d.reference);
      return {
        candidateId: d.candidateId,
        status: "withheld",
        reasons: [...new Set([...(d.reasons ?? []), ...reasons])].sort(),
      };
    },
  );
  result.customerDraft.items = result.customerDraft.items.filter(
    (item) => !rejectedRefs.has(item.reference),
  );
  result.customerDraft.status = result.customerDraft.items.length
    ? "reviewed-material-draft"
    : "inconclusive";
  result.privateDecision.stateDigest = plan.stateDigest;
  result.privateDecision.generation = plan.generation;
  return result;
}
