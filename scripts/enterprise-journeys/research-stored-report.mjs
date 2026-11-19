import {
  readResearchControlStore,
  assertUnretiredResearchArtifacts,
} from "./research-control-store.mjs";
import { projectResearchAtRevision } from "./research-revision-workflow.mjs";
import { renderResearchDraft } from "./research-report.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
/** Build in memory from current persistent review metadata. No customer artifact is written or delivered. */
export async function buildStoredResearchDraft(
  options,
  expectedRevision,
  bundle,
) {
  assert(
    Number.isSafeInteger(expectedRevision) && expectedRevision > 0,
    "Expected research storage revision required",
  );
  assert(
    bundle &&
      Object.getPrototypeOf(bundle) === Object.prototype &&
      Object.keys(bundle).length === 5 &&
      [
        "descriptors",
        "researchPayloads",
        "policy",
        "candidates",
        "payloads",
      ].every((k) => Object.hasOwn(bundle, k)),
    "Invalid stored research report bundle",
  );
  const stored = await readResearchControlStore(options);
  assert(
    stored.revision === expectedRevision,
    "Research report source revision changed; repeat preflight",
  );
  assert(
    Array.isArray(bundle.researchPayloads) &&
      bundle.researchPayloads.length <= 10000 &&
      Array.isArray(bundle.payloads) &&
      bundle.payloads.length <= 1000,
    "Invalid stored research payload lists",
  );
  const suppliedSources = new Set(
      bundle.researchPayloads.map((p) => p.sourceId),
    ),
    suppliedCandidates = new Set(bundle.payloads.map((p) => p.candidateId));
  assertUnretiredResearchArtifacts(
    stored.control,
    bundle.descriptors.filter((d) => suppliedSources.has(d.sourceId)),
    bundle.candidates.filter((c) => suppliedCandidates.has(c.candidateId)),
  );
  const ids = new Set(bundle.candidates.map((c) => c.candidateId));
  const registrations = stored.control.registrations
    .filter((r) => ids.has(r.candidateId))
    .map((r) => r.registration);
  const result = projectResearchAtRevision(
    stored.control.state,
    options.context,
    bundle.descriptors,
    bundle.researchPayloads,
    bundle.policy,
    bundle.candidates,
    bundle.payloads,
    registrations,
  );
  const artifacts = renderResearchDraft(result.customerDraft);
  // Another process may have changed the authoritative state during CPU work.
  // This final read is a consistency boundary, not a lock through future delivery.
  const latest = await readResearchControlStore(options);
  assert(
    latest.revision === stored.revision,
    "Research report source revision changed; discard draft and repeat preflight",
  );
  return {
    ...result,
    customerArtifacts: artifacts,
    privateDecision: {
      ...result.privateDecision,
      storageRevision: stored.revision,
      storageRechecked: true,
      deliveryAuthorized: false,
    },
  };
}
