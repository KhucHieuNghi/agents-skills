import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  enterpriseDigest,
  stableJson,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { parseCaptureJson } from "../../skills/content-search-audit/scripts/lib/technical-seo/strict-json.mjs";
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
    "Invalid research content shape",
  );
const hash = (text) => createHash("sha256").update(text).digest("hex");
const text = (v, max = 2048) =>
  typeof v === "string" && v.length > 0 && v.length <= max && v.isWellFormed();
const directKinds = ["observed-behavior", "participant-statement"];
const recordKeys = [
  "recordId",
  "kind",
  "sessionId",
  "participantAlias",
  "taskId",
  "promptId",
  "observedAt",
  "supportingRecordIds",
];
function parse(bytes) {
  assert(
    typeof bytes === "string" &&
      bytes.isWellFormed() &&
      Buffer.byteLength(bytes) <= 1024 * 1024,
    "Research payload byte/Unicode limit",
  );
  const raw = parseCaptureJson(bytes);
  const walk = (v) => {
    if (typeof v === "string")
      assert(v.isWellFormed(), "Invalid research JSON Unicode");
    if (typeof v === "number")
      assert(Number.isFinite(v), "Nonfinite research JSON");
    if (v && typeof v === "object")
      for (const [k, value] of Object.entries(v)) {
        assert(k.isWellFormed(), "Invalid research JSON key");
        walk(value);
      }
  };
  walk(raw);
  return raw;
}
function normalize(raw, descriptor, aliases) {
  shape(raw, [
    "schemaVersion",
    "scope",
    "capturedAt",
    "synthetic",
    "provenance",
    "record",
  ]);
  assert(
    raw.schemaVersion === 1 &&
      stableJson(raw.scope) === stableJson(descriptor.scope) &&
      raw.capturedAt === descriptor.capturedAt &&
      typeof raw.synthetic === "boolean",
    "Research payload scope/capture mismatch",
  );
  shape(raw.provenance, ["actor", "method", "locator"]);
  assert(
    text(raw.provenance.actor) &&
      text(raw.provenance.locator) &&
      ["session-note", "transcript-excerpt", "analyst-note"].includes(
        raw.provenance.method,
      ),
    "Invalid research provenance",
  );
  const r = raw.record;
  shape(r, [...recordKeys, "representation", "text", "supportBindings"]);
  for (const key of recordKeys) {
    const actual =
      key === "participantAlias"
        ? r[key] === null
          ? null
          : aliases.get(r[key])
        : key === "supportingRecordIds" && Array.isArray(r[key])
          ? [...r[key]].sort()
          : r[key];
    const expected =
      key === "participantAlias"
        ? descriptor[key] === null
          ? null
          : aliases.get(descriptor[key])
        : key === "supportingRecordIds"
          ? [...descriptor[key]].sort()
          : descriptor[key];
    assert(
      stableJson(actual) === stableJson(expected),
      "Research record/descriptor mismatch",
    );
  }
  assert(text(r.text, 16384), "Invalid research record text");
  const representations = {
    "observed-behavior": ["behavior-description"],
    "participant-statement": ["verbatim-declared", "paraphrase"],
    "analyst-inference": ["interpretation"],
  };
  assert(
    representations[r.kind].includes(r.representation) &&
      (r.kind === "analyst-inference"
        ? raw.provenance.method === "analyst-note"
        : raw.provenance.method !== "analyst-note"),
    "Research kind/representation mismatch",
  );
  assert(
    Array.isArray(r.supportBindings) && r.supportBindings.length <= 100,
    "Invalid research dependency bindings",
  );
  for (const b of r.supportBindings) {
    shape(b, ["recordId", "recordDigest"]);
    assert(
      typeof b.recordId === "string" &&
        typeof b.recordDigest === "string" &&
        /^[a-f0-9]{64}$/.test(b.recordDigest),
      "Invalid research support digest",
    );
  }
  assert(
    new Set(r.supportBindings.map((b) => b.recordId)).size ===
      r.supportBindings.length &&
      stableJson(r.supportBindings.map((b) => b.recordId).sort()) ===
        stableJson([...descriptor.supportingRecordIds].sort()),
    "Research dependency set mismatch",
  );
  const record = {
    scope: globalThis.structuredClone(raw.scope),
    recordId: r.recordId,
    kind: r.kind,
    sessionId: r.sessionId,
    participantId:
      r.participantAlias === null ? null : aliases.get(r.participantAlias),
    taskId: r.taskId,
    promptId: r.promptId,
    observedAt: r.observedAt,
    supportingRecordIds: [...r.supportingRecordIds].sort(),
    representation: r.representation,
    text: r.text,
    supportBindings: globalThis
      .structuredClone(r.supportBindings)
      .sort((a, b) =>
        a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0,
      ),
  };
  return {
    record,
    recordDigest: enterpriseDigest(record),
    synthetic: raw.synthetic,
    provenance: globalThis.structuredClone(raw.provenance),
  };
}

/** Validate already-authorized, isolated records; this function never fetches or persists bytes. */
export function evaluateResearchRecords(context, descriptors, payloads) {
  const intake = planResearchIntake(context, descriptors);
  assert(
    Array.isArray(payloads) && payloads.length <= 10000,
    "Research payload count limit",
  );
  const expected = new Map(descriptors.map((d) => [d.sourceId, d])),
    plan = new Map(intake.sources.map((s) => [s.sourceId, s])),
    seen = new Set();
  // Complete access/identity checks before reading ANY artifactText property.
  for (const p of payloads) {
    shape(p, ["sourceId", "artifactText"]);
    assert(
      expected.has(p.sourceId) && !seen.has(p.sourceId),
      "Unknown/duplicate research payload",
    );
    seen.add(p.sourceId);
    assert(
      plan.get(p.sourceId).fetchEligible,
      "Ineligible research payload; do not supply restricted content",
    );
  }
  let totalBytes = 0;
  const rawByHash = new Map();
  for (const p of payloads) {
    const bytes = p.artifactText;
    assert(typeof bytes === "string", "Invalid research payload bytes");
    totalBytes += Buffer.byteLength(bytes);
    assert(totalBytes <= 16 * 1024 * 1024, "Research total byte limit");
    assert(
      hash(bytes) === expected.get(p.sourceId).artifactHash,
      "Research payload hash mismatch",
    );
    if (!rawByHash.has(expected.get(p.sourceId).artifactHash))
      rawByHash.set(expected.get(p.sourceId).artifactHash, parse(bytes));
  }
  const aliases = new Map(
    context.protocol.participants.flatMap((p) =>
      [p.participantId, ...p.aliases].map((a) => [a, p.participantId]),
    ),
  );
  const normalized = new Map(),
    sources = [];
  for (const d of descriptors) {
    const access = plan.get(d.sourceId),
      raw = rawByHash.get(d.artifactHash);
    if (!access.fetchEligible)
      sources.push({
        sourceId: d.sourceId,
        recordId: d.recordId,
        artifactHash: d.artifactHash,
        status: "withheld",
        reasons: access.reasons,
      });
    else if (!raw)
      sources.push({
        sourceId: d.sourceId,
        recordId: d.recordId,
        artifactHash: d.artifactHash,
        status: "missing-content",
        reasons: ["payload-not-supplied"],
      });
    else {
      normalized.set(d.sourceId, normalize(raw, d, aliases));
      sources.push({
        sourceId: d.sourceId,
        recordId: d.recordId,
        artifactHash: d.artifactHash,
        status: "payload-validated",
        reasons: [],
        bytesReused: !seen.has(d.sourceId),
      });
    }
  }
  const syntheticStates = new Set(
    [...normalized.values()].map((v) => v.synthetic),
  );
  assert(syntheticStates.size <= 1, "Mixed synthetic research payloads");
  const synthetic = syntheticStates.size ? [...syntheticStates][0] : null;
  const groups = new Map();
  for (const d of descriptors) {
    if (!groups.has(d.recordId)) groups.set(d.recordId, []);
    groups.get(d.recordId).push(d);
  }
  const records = [];
  for (const [recordId, versions] of groups) {
    const sourceIds = versions.map((d) => d.sourceId),
      members = sourceIds.map((id) => sources.find((s) => s.sourceId === id));
    let status = members.some((s) => s.status === "withheld")
      ? "withheld"
      : members.some((s) => s.status === "missing-content")
        ? "missing-content"
        : "available";
    const loaded = sourceIds.map((id) => normalized.get(id)).filter(Boolean);
    if (
      status === "available" &&
      new Set(loaded.map((v) => v.recordDigest)).size !== 1
    )
      status = "conflicting-content";
    const available = status === "available";
    records.push({
      recordId,
      kind: versions[0].kind,
      status,
      sourceIds,
      recordDigest: available ? loaded[0].recordDigest : null,
      record: available ? loaded[0].record : null,
      attributions: available
        ? sourceIds.map((sourceId) => ({
            sourceId,
            ...normalized.get(sourceId).provenance,
          }))
        : [],
      customerSummaryEligible:
        available &&
        sourceIds.every((id) => plan.get(id).customerSummaryEligible),
    });
  }
  const byId = new Map(records.map((r) => [r.recordId, r]));
  for (const r of records.filter(
    (r) => r.status === "available" && r.kind === "analyst-inference",
  )) {
    const eligible = r.record.supportBindings.every((binding) => {
      const direct = byId.get(binding.recordId);
      return (
        direct?.status === "available" &&
        directKinds.includes(direct.kind) &&
        direct.recordDigest === binding.recordDigest
      );
    });
    if (!eligible)
      Object.assign(r, {
        status: "unavailable-dependency",
        recordDigest: null,
        record: null,
        attributions: [],
        customerSummaryEligible: false,
      });
    else
      r.customerSummaryEligible &&= r.record.supportBindings.every(
        (b) => byId.get(b.recordId).customerSummaryEligible,
      );
  }
  const coverage = intake.coverage.map((cell) => {
    if (cell.state === "withheld" || cell.state === "missing-metadata")
      return { ...cell };
    const declaredIds = new Set(
      descriptors
        .filter(
          (d) =>
            d.sessionId === cell.sessionId &&
            d.taskId === cell.taskId &&
            d.kind === cell.kind,
        )
        .map((d) => d.recordId),
    );
    const declared = [...declaredIds].map((id) => byId.get(id));
    const available = declared.filter((r) => r.status === "available");
    const unresolved = declared.length - available.length;
    return {
      ...cell,
      metadataState: cell.state,
      state: available.length
        ? unresolved
          ? "partial-content"
          : "content-available"
        : "content-unavailable",
      availableRecordIdentities: available.length,
      unavailableRecordIdentities: unresolved,
      contentStates: [...new Set(declared.map((r) => r.status))].sort(),
    };
  });
  const dataRequests = [...intake.dataRequests];
  for (const r of records.filter(
    (r) => !["available", "withheld"].includes(r.status),
  ))
    dataRequests.push({
      type: "research-content-resolution",
      recordId: r.recordId,
      sourceIds: r.sourceIds,
      reason: r.status,
      instructions:
        "Resolve the authorized record version or exact direct-evidence binding. Do not select a convenient source, restore revoked access, or treat an inference as an observation.",
    });
  return {
    schemaVersion: 1,
    namespace: "private-research-record-evaluation",
    assessmentAt: context.assessmentAt,
    contextDigest: intake.contextDigest,
    accessDigest: enterpriseDigest(context.access),
    protocolDigest: context.protocolDigest,
    descriptorSetDigest: intake.descriptorSetDigest,
    synthetic,
    sources,
    records,
    coverage,
    dataRequests,
    accounting: {
      ...intake.accounting,
      suppliedPayloads: payloads.length,
      uniqueSuppliedArtifacts: rawByHash.size,
      availableRecordIdentities: records.filter((r) => r.status === "available")
        .length,
      declaredParticipantsWithAvailableDirectRecords: new Set(
        records
          .filter(
            (r) => r.status === "available" && directKinds.includes(r.kind),
          )
          .map((r) => r.record.participantId),
      ).size,
      unavailableRecordIdentities: records.filter(
        (r) => r.status !== "available",
      ).length,
    },
    payloadSetValidated:
      sources.length > 0 &&
      sources.every((s) => s.status === "payload-validated"),
    evidenceCoverageComplete:
      coverage.length > 0 &&
      coverage.every((c) => c.state === "content-available") &&
      records.length > 0 &&
      records.every((r) => r.status === "available"),
    studyComplete: false,
    semanticAcceptance: false,
    consentAuthenticated: false,
    populationPrevalenceAccepted: false,
    causalAcceptance: false,
    actionAuthorized: false,
    limitations: [
      "Private research evidence only; no customer/public projection is produced.",
      "Available means structurally validated and currently eligible under declared access, not authenticated observation or correct interpretation.",
      "Verbatim-declared is not independent quotation verification; repeated people or transport aliases are not independent participants.",
      "Reassess current scoped access before every acquisition/analysis, including historical records. This function cannot recall prior exports.",
      "No prevalence, representativeness, UX-quality, conversion or causal conclusion is accepted.",
    ],
  };
}
