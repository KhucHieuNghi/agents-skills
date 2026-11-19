import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
import { planResearchDisclosure } from "./research-disclosure.mjs";
import { evaluateResearchRecords } from "./research-records.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid research disclosure content shape",
  );
const time = (v) => {
  assert(timestampValue(v), "Invalid research review timestamp");
  return Date.parse(v);
};
const fields = [
  "taskContext",
  "summary",
  "limitation",
  "recommendation",
  "retest",
];
const sha = (v) => createHash("sha256").update(v).digest("hex");
const bindings = (v) =>
  [...v].sort((a, b) =>
    a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0,
  );
const parse = (bytes, expectedHash) => {
  assert(
    typeof bytes === "string" &&
      bytes.isWellFormed() &&
      Buffer.byteLength(bytes) <= 1024 * 1024,
    "Disclosure payload limit",
  );
  assert(sha(bytes) === expectedHash, "Disclosure payload hash mismatch");
  return parseCaptureJson(bytes);
};

/** Offline private response containing an allowlisted CUSTOMER DRAFT, never delivery authority. */
export function projectResearchDisclosure(
  context,
  descriptors,
  researchPayloads,
  policy,
  candidates,
  payloads,
) {
  const plan = planResearchDisclosure(context, descriptors, policy, candidates);
  assert(
    Array.isArray(payloads) && payloads.length <= 1000,
    "Disclosure payload count limit",
  );
  const metadata = new Map(candidates.map((c) => [c.candidateId, c])),
    decisions = new Map(plan.candidates.map((c) => [c.candidateId, c])),
    supplied = new Map();
  // Entire identity/access set before any candidate or receipt text is accessed.
  for (const p of payloads) {
    shape(p, ["candidateId", "artifactText", "receiptText"]);
    assert(
      metadata.has(p.candidateId) && !supplied.has(p.candidateId),
      "Unknown/duplicate disclosure payload",
    );
    assert(
      decisions.get(p.candidateId).fetchEligible,
      "Ineligible disclosure payload; do not supply restricted text",
    );
    supplied.set(p.candidateId, p);
  }
  const research = evaluateResearchRecords(
    context,
    descriptors,
    researchPayloads,
  );
  const records = new Map(research.records.map((r) => [r.recordId, r]));
  const aliases = new Map(
    context.protocol.participants.flatMap((p) =>
      [p.participantId, ...p.aliases].map((a) => [a, p.participantId]),
    ),
  );
  const access = new Map(context.access.map((a) => [a.participantId, a]));
  const customerItems = [],
    privateDecisions = [];
  let totalBytes = 0;
  for (const c of candidates) {
    const p = supplied.get(c.candidateId),
      decision = decisions.get(c.candidateId);
    const reasons = [...decision.reasons];
    if (!p && decision.fetchEligible)
      reasons.push("candidate-content-not-supplied");
    const supported = c.supportBindings.every((b) => {
      const r = records.get(b.recordId);
      return (
        r?.status === "available" &&
        r.customerSummaryEligible &&
        r.recordDigest === b.recordDigest
      );
    });
    if (!supported) reasons.push("exact-content-support-unavailable");
    // Missing/changed evidence invalidates the entire candidate before reading text.
    if (reasons.length) {
      privateDecisions.push({
        candidateId: c.candidateId,
        status: "withheld",
        reasons,
      });
      continue;
    }
    const artifactText = p.artifactText,
      receiptText = p.receiptText;
    assert(
      typeof artifactText === "string" && typeof receiptText === "string",
      "Invalid disclosure payload bytes",
    );
    totalBytes +=
      Buffer.byteLength(artifactText) + Buffer.byteLength(receiptText);
    assert(totalBytes <= 16 * 1024 * 1024, "Disclosure total byte limit");
    const raw = parse(artifactText, c.artifactHash),
      receipt = parse(receiptText, c.receiptHash);
    shape(raw, [
      "schemaVersion",
      "candidateId",
      "scope",
      "kind",
      "supportBindings",
      ...fields,
    ]);
    assert(
      raw.schemaVersion === 1 &&
        raw.candidateId === c.candidateId &&
        stableJson(raw.scope) === stableJson(c.scope) &&
        raw.kind === c.kind &&
        stableJson(raw.supportBindings) === stableJson(c.supportBindings),
      "Disclosure candidate metadata mismatch",
    );
    for (const field of fields)
      assert(
        typeof raw[field] === "string" &&
          raw[field].trim().length > 0 &&
          raw[field].length <= 8192 &&
          raw[field].isWellFormed(),
        "Invalid disclosure paraphrase",
      );
    const candidateDigest = enterpriseDigest({
      ...raw,
      supportBindings: bindings(raw.supportBindings),
    });
    shape(receipt, [
      "schemaVersion",
      "candidateDigest",
      "policyDigest",
      "scope",
      "reviewedAt",
      "validUntil",
      "reviewer",
      "verdicts",
    ]);
    shape(receipt.reviewer, ["id", "type"]);
    assert(
      typeof receipt.reviewer.id === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(receipt.reviewer.id) &&
        ["ai", "human"].includes(receipt.reviewer.type),
      "Invalid declared reviewer",
    );
    shape(receipt.verdicts, ["meaning", "disclosure", "recommendation"]);
    assert(
      Object.values(receipt.verdicts).every((v) =>
        ["accept", "reject", "pending"].includes(v),
      ),
      "Invalid review verdict",
    );
    const reviewed = time(receipt.reviewedAt),
      until = time(receipt.validUntil),
      assessment = time(context.assessmentAt);
    assert(
      reviewed <= assessment && until > reviewed,
      "Invalid review chronology",
    );
    const supportIds = new Set(c.supportBindings.map((b) => b.recordId));
    const supportingDescriptors = descriptors.filter((d) =>
      supportIds.has(d.recordId),
    );
    const latestCapture = Math.max(
      ...supportingDescriptors.map((d) => time(d.capturedAt)),
    );
    const supportingParticipants = new Set(
      supportingDescriptors
        .filter((d) => d.participantAlias !== null)
        .map((d) => aliases.get(d.participantAlias)),
    );
    const accessExpiry = Math.min(
      ...[...supportingParticipants].map((id) =>
        Math.min(
          time(access.get(id).validUntil),
          time(access.get(id).stateObservedAt) +
            context.maxAccessAgeSeconds * 1000,
        ),
      ),
    );
    if (
      receipt.schemaVersion !== 1 ||
      receipt.candidateDigest !== candidateDigest ||
      receipt.policyDigest !== plan.policyDigest ||
      stableJson(receipt.scope) !== stableJson(c.scope)
    )
      reasons.push("review-binding-mismatch");
    if (
      reviewed < latestCapture ||
      reviewed + policy.reviewMaxAgeSeconds * 1000 <= assessment ||
      until <= assessment ||
      until > accessExpiry ||
      until > time(policy.validUntil)
    )
      reasons.push("review-validity-mismatch");
    if (Object.values(receipt.verdicts).some((v) => v !== "accept"))
      reasons.push("review-not-accepted");
    if (reasons.length) {
      privateDecisions.push({
        candidateId: c.candidateId,
        status: "withheld",
        reasons,
      });
      continue;
    }
    const reference = randomUUID();
    // Explicit allowlist: never spread a private record, metadata or review object.
    customerItems.push({
      reference,
      kind: raw.kind,
      taskContext: raw.taskContext,
      summary: raw.summary,
      limitation: raw.limitation,
      recommendation: raw.recommendation,
      retest: raw.retest,
      reviewType: receipt.reviewer.type,
    });
    privateDecisions.push({
      candidateId: c.candidateId,
      status: "included-in-draft",
      reference,
      candidateDigest,
      receiptHash: c.receiptHash,
      supportBindings: globalThis.structuredClone(c.supportBindings),
    });
  }
  return {
    customerDraft: {
      schemaVersion: 1,
      editionId: randomUUID(),
      assessmentDate: context.assessmentAt.slice(0, 10),
      status: customerItems.length ? "reviewed-material-draft" : "inconclusive",
      synthetic: research.synthetic,
      items: customerItems,
      limitations: [
        "This draft contains only currently permitted, structurally matched reviewed material and may omit other material. It does not establish complete study coverage or population prevalence.",
        "Review identities and decisions are declared, not authenticated. Paraphrases still require qualified disclosure judgment; this is not an anonymization guarantee.",
        "No UX-quality pass, conversion uplift or causal conclusion is established. Delivery requires a fresh authorization check and controlled withdrawal handling.",
      ],
    },
    privateDecision: {
      namespace: "private-research-disclosure-evaluation",
      contextDigest: plan.contextDigest,
      policyDigest: plan.policyDigest,
      candidateSetDigest: plan.candidateSetDigest,
      descriptorSetDigest: plan.descriptorSetDigest,
      decisions: privateDecisions,
      semanticAcceptance: false,
      reviewerAuthenticated: false,
      customerExportAuthorized: false,
      storageAuthorized: false,
      actionAuthorized: false,
    },
  };
}
