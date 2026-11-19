import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { Buffer } from "node:buffer";
import {
  readResearchControlStore,
  planStoredResearchDisclosure,
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
  // Keep authority and metadata on one caller-independent snapshot. Do not clone
  // payload text before revision/eligibility checks: even getters may acquire it.
  options = {
    ...options,
    key: Buffer.from(options.key),
    context: globalThis.structuredClone(options.context),
    authority: globalThis.structuredClone(options.authority),
  };
  bundle = {
    ...bundle,
    descriptors: globalThis.structuredClone(bundle.descriptors),
    policy: globalThis.structuredClone(bundle.policy),
    candidates: globalThis.structuredClone(bundle.candidates),
  };
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
  // Construct provenance only from this owning projection and authoritative store.
  // Private linkage is never spread into customer artifacts or accepted from callers.
  const included = result.privateDecision.decisions.filter(
    (d) => d.status === "included-in-draft",
  );
  assert(
    included.length === result.customerDraft.items.length,
    "Incomplete research item provenance",
  );
  const privateProvenance = {
    schemaFamily: "private-governed-report-provenance",
    schemaVersion: 1,
    audience: "private",
    editionId: result.customerDraft.editionId,
    reportDigest: enterpriseDigest(result.customerDraft),
    manifestDigest: enterpriseDigest(artifacts.manifest),
    controller: {
      scopeDigest: enterpriseDigest(stored.control.state.scope),
      storageRevision: stored.revision,
      stateDigest: enterpriseDigest(stored.control.state),
      generation: stored.control.state.generation,
    },
    contextDigest: result.privateDecision.contextDigest,
    policyDigest: result.privateDecision.policyDigest,
    descriptorSetDigest: result.privateDecision.descriptorSetDigest,
    candidateSetDigest: result.privateDecision.candidateSetDigest,
    items: result.customerDraft.items.map((item) => {
      const matches = included.filter((d) => d.reference === item.reference);
      assert(matches.length === 1, "Missing or ambiguous research item origin");
      const decision = matches[0],
        registration = stored.control.registrations.find(
          (r) => r.candidateId === decision.candidateId,
        ),
        candidate = bundle.candidates.find(
          (c) => c.candidateId === decision.candidateId,
        );
      assert(
        registration &&
          candidate &&
          registration.candidateArtifactHash === candidate.artifactHash &&
          registration.receiptArtifactHash === decision.receiptHash,
        "Research item registration binding mismatch",
      );
      return {
        collection: "items",
        itemId: item.reference,
        itemDigest: enterpriseDigest(item),
        origin: {
          kind: "governed",
          candidateId: decision.candidateId,
          candidateDigest: decision.candidateDigest,
          registrationDigest: enterpriseDigest(registration),
          artifactHash: registration.candidateArtifactHash,
          receiptHash: registration.receiptArtifactHash,
          supportBindings: globalThis.structuredClone(decision.supportBindings),
        },
      };
    }),
    persistenceAuthorized: false,
    deliveryAuthorized: false,
  };

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
    privateProvenance,
    privateDecision: {
      ...result.privateDecision,
      storageRevision: stored.revision,
      storageRechecked: true,
      deliveryAuthorized: false,
    },
  };
}

/** Metadata-first orchestration. Host loaders retain responsibility for actual
 * acquisition authorization. No network, persistence or delivery is performed here.
 * Revision checks are optimistic; already-read bytes cannot be recalled. */
export async function acquireStoredResearchDraft(
  options,
  expectedRevision,
  metadata,
  loaders,
) {
  assert(
    Number.isSafeInteger(expectedRevision) && expectedRevision > 0,
    "Expected research storage revision required",
  );
  const exact = (v, keys) =>
    v &&
    Object.getPrototypeOf(v) === Object.prototype &&
    Object.keys(v).length === keys.length &&
    keys.every((k) => Object.hasOwn(v, k));
  assert(
    exact(metadata, ["descriptors", "policy", "candidates"]),
    "Invalid research acquisition metadata",
  );
  assert(
    exact(loaders, ["research", "candidate"]) &&
      typeof loaders.research === "function" &&
      typeof loaders.candidate === "function",
    "Host research loaders required",
  );
  // Snapshot caller-owned metadata before the first await; callbacks receive copies.
  const input = globalThis.structuredClone(metadata),
    storedOptions = {
      ...options,
      key: Buffer.from(options.key),
      context: globalThis.structuredClone(options.context),
      authority: globalThis.structuredClone(options.authority),
    },
    readResearch = loaders.research,
    readCandidate = loaders.candidate;
  const preflight = await planStoredResearchDisclosure(
    storedOptions,
    input.descriptors,
    input.policy,
    input.candidates,
  );
  assert(
    preflight.revision === expectedRevision,
    "Research acquisition source revision changed; repeat preflight",
  );
  const eligible = new Set(
    preflight.plan.candidates
      .filter((c) => c.fetchEligible)
      .map((c) => c.candidateId),
  );
  const candidates = input.candidates.filter((c) =>
    eligible.has(c.candidateId),
  );
  const support = new Set(
    candidates.flatMap((c) => c.supportBindings.map((b) => b.recordId)),
  );
  const descriptors = input.descriptors.filter((d) => support.has(d.recordId));
  const researchPayloads = [],
    payloads = [];
  const recheck = async () => {
    const latest = await readResearchControlStore(storedOptions);
    assert(
      latest.revision === expectedRevision,
      "Research acquisition source revision changed; discard bytes and repeat preflight",
    );
    assertUnretiredResearchArtifacts(latest.control, descriptors, candidates);
  };
  for (const d of descriptors) {
    await recheck();
    const payload = await readResearch(globalThis.structuredClone(d));
    assert(
      exact(payload, ["sourceId", "artifactText"]) &&
        payload.sourceId === d.sourceId &&
        typeof payload.artifactText === "string",
      "Research loader returned mismatched payload",
    );
    researchPayloads.push(globalThis.structuredClone(payload));
  }
  for (const c of candidates) {
    await recheck();
    const payload = await readCandidate(globalThis.structuredClone(c));
    assert(
      exact(payload, ["candidateId", "artifactText", "receiptText"]) &&
        payload.candidateId === c.candidateId &&
        typeof payload.artifactText === "string" &&
        typeof payload.receiptText === "string",
      "Candidate loader returned mismatched payload",
    );
    payloads.push(globalThis.structuredClone(payload));
  }
  await recheck();
  return buildStoredResearchDraft(storedOptions, expectedRevision, {
    ...input,
    researchPayloads,
    payloads,
  });
}
