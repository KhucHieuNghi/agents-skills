import { Buffer } from "node:buffer";
import {
  stableJson,
  textValue,
  timestampValue,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { validateEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report-model.mjs";

const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (object, keys, label) =>
  assert(
    object &&
      Object.getPrototypeOf(object) === Object.prototype &&
      Object.keys(object).length === keys.length &&
      keys.every((key) => Object.hasOwn(object, key)),
    `Invalid ${label}`,
  );
const id = (value) =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value);
const hash = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const ids = (list) =>
  Array.isArray(list) &&
  list.length <= 1000 &&
  list.every(id) &&
  new Set(list).size === list.length;
const fields = {
  finding: [
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
  action: [
    "actionId",
    "findingIds",
    "status",
    "ownerRole",
    "effort",
    "description",
    "verification",
    "dependencies",
  ],
  observation: [
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
  narrative: ["narrativeId", "kind", "text", "evidenceIds"],
  decision: [
    "targetType",
    "targetId",
    "targetDigest",
    "reviewerId",
    "reviewerType",
    "reviewedAt",
    "verdict",
    "reason",
  ],
};

/** Development-only structural validation. Does not authenticate sources, prove
 * coverage, authorize disclosure, or provide a renderer or persistence path. */
export function validateEnterpriseHistoryV2(envelope) {
  assert(
    Buffer.byteLength(stableJson(envelope)) <= 16 * 1024 * 1024,
    "History byte budget exceeded",
  );
  shape(
    envelope,
    ["schemaFamily", "schemaVersion", "edition", "current", "history"],
    "V2 report",
  );
  assert(
    envelope.schemaFamily === "enterprise-report" &&
      envelope.schemaVersion === 2 &&
      envelope.edition === "customer",
    "Invalid V2 report schema",
  );
  validateEnterpriseReport(envelope.current);
  assert(
    envelope.current.parentReportDigest === null,
    "V2 current report must be standalone",
  );
  const history = envelope.history;
  shape(history, ["sources", "entries", "withheld", "coverage"], "history");
  assert(
    [null, "restricted-content-withheld"].includes(history.withheld),
    "Invalid withheld status",
  );
  assert(
    ["declared-partial", "declared-complete"].includes(history.coverage),
    "Invalid declared coverage",
  );
  assert(
    Array.isArray(history.sources) &&
      history.sources.length <= 32 &&
      Array.isArray(history.entries) &&
      history.entries.length <= 10000,
    "Invalid history size",
  );
  const sources = new Map(),
    revisions = new Set();
  let previous = null;
  for (const source of history.sources) {
    shape(
      source,
      [
        "sourceRef",
        "predecessorRef",
        "revisionId",
        "generatedAt",
        "assessmentAt",
      ],
      "history source",
    );
    assert(
      id(source.sourceRef) &&
        id(source.revisionId) &&
        timestampValue(source.generatedAt) &&
        timestampValue(source.assessmentAt),
      "Invalid history source identity",
    );
    assert(
      !sources.has(source.sourceRef) &&
        !revisions.has(source.revisionId) &&
        source.revisionId !== envelope.current.revisionId &&
        source.predecessorRef === (previous?.sourceRef ?? null),
      "Invalid history source chain",
    );
    assert(
      Date.parse(source.assessmentAt) <= Date.parse(source.generatedAt) &&
        Date.parse(source.generatedAt) <
          Date.parse(envelope.current.generatedAt) &&
        Date.parse(source.assessmentAt) <=
          Date.parse(envelope.current.assessment.assessmentAt) &&
        (!previous ||
          (Date.parse(previous.generatedAt) < Date.parse(source.generatedAt) &&
            Date.parse(previous.assessmentAt) <=
              Date.parse(source.assessmentAt))),
      "Invalid history source chronology",
    );
    sources.set(source.sourceRef, source);
    revisions.add(source.revisionId);
    previous = source;
  }
  const entries = new Map();
  const key = (source, type, identity) =>
    JSON.stringify([source, type, identity]);
  for (const entry of history.entries) {
    shape(
      entry,
      ["sourceRef", "type", "disposition", "content"],
      "historical entry",
    );
    assert(
      sources.has(entry.sourceRef) &&
        Object.hasOwn(fields, entry.type) &&
        ["retained", "changed", "removed", "superseded"].includes(
          entry.disposition,
        ),
      "Invalid historical entry binding",
    );
    const value = entry.content;
    shape(value, fields[entry.type], "historical content");
    const identity =
      entry.type === "decision"
        ? [value.targetType, value.targetId]
        : value[`${entry.type}Id`];
    assert(
      entry.type === "decision"
        ? ["check", "finding", "action", "observation", "narrative"].includes(
            value.targetType,
          ) && id(value.targetId)
        : id(identity),
      "Invalid historical item identity",
    );
    const token = key(entry.sourceRef, entry.type, identity);
    assert(!entries.has(token), "Duplicate historical item");
    entries.set(token, entry);
    if (entry.type === "finding")
      assert(
        id(value.checkId) &&
          ids(value.evidenceIds) &&
          value.evidenceIds.length > 0 &&
          ["critical", "high", "medium", "low"].includes(value.severity) &&
          ["high", "medium", "low"].includes(value.confidence) &&
          [
            value.title,
            value.description,
            value.businessImpact,
            value.recommendation,
            value.verification,
          ].every(textValue),
        "Invalid historical finding",
      );
    if (entry.type === "action")
      assert(
        ids(value.findingIds) &&
          value.findingIds.length > 0 &&
          ids(value.dependencies) &&
          value.status === "proposed" &&
          [
            value.ownerRole,
            value.effort,
            value.description,
            value.verification,
          ].every(textValue),
        "Invalid historical action",
      );
    if (entry.type === "narrative")
      assert(
        [
          "observation",
          "interpretation",
          "recommendation",
          "limitation",
        ].includes(value.kind) &&
          textValue(value.text) &&
          ids(value.evidenceIds) &&
          value.evidenceIds.length > 0,
        "Invalid historical narrative",
      );
    if (entry.type === "decision")
      assert(
        hash(value.targetDigest) &&
          id(value.reviewerId) &&
          ["human", "independent-ai"].includes(value.reviewerType) &&
          timestampValue(value.reviewedAt) &&
          ["accept", "reject", "revise"].includes(value.verdict) &&
          Date.parse(value.reviewedAt) >=
            Date.parse(sources.get(entry.sourceRef).assessmentAt) &&
          Date.parse(value.reviewedAt) <=
            Date.parse(sources.get(entry.sourceRef).generatedAt) &&
          textValue(value.reason),
        "Invalid historical decision",
      );
    if (entry.type === "observation") {
      assert(
        [value.label, value.unit, value.scopeDescription].every(textValue) &&
          ids(value.evidenceIds) &&
          value.evidenceIds.length > 0 &&
          ["current", "historical"].includes(value.classification) &&
          ["exact", "approximate", "range", "unknown"].includes(
            value.precision,
          ),
        "Invalid historical observation",
      );
      shape(value.period, ["from", "to"], "historical observation period");
      const date = (v) =>
        typeof v === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(v) &&
        timestampValue(`${v}T00:00:00Z`);
      assert(
        date(value.period.from) &&
          date(value.period.to) &&
          value.period.from <= value.period.to &&
          value.period.to <=
            sources.get(entry.sourceRef).generatedAt.slice(0, 10),
        "Invalid historical observation period",
      );
      if (value.precision === "unknown")
        assert(value.value === null, "Invalid historical observation value");
      else if (typeof value.value === "number")
        assert(
          Number.isFinite(value.value) && value.precision !== "range",
          "Invalid historical observation value",
        );
      else if (value.precision === "range") {
        shape(value.value, ["min", "max"], "historical observation range");
        assert(
          Number.isFinite(value.value.min) &&
            Number.isFinite(value.value.max) &&
            value.value.min <= value.value.max,
          "Invalid historical observation range",
        );
      } else {
        shape(
          value.value,
          ["numerator", "denominator"],
          "historical observation ratio",
        );
        assert(
          Number.isFinite(value.value.numerator) &&
            Number.isFinite(value.value.denominator) &&
            value.value.denominator > 0,
          "Invalid historical observation ratio",
        );
      }
    }
  }
  for (const entry of history.entries) {
    const value = entry.content;
    if (entry.type === "action")
      assert(
        value.findingIds.every((v) =>
          entries.has(key(entry.sourceRef, "finding", v)),
        ) &&
          value.dependencies.every(
            (v) =>
              v !== value.actionId &&
              entries.has(key(entry.sourceRef, "action", v)),
          ),
        "Unresolved historical action dependency",
      );
    if (entry.type === "decision" && value.targetType !== "check")
      assert(
        entries.has(key(entry.sourceRef, value.targetType, value.targetId)),
        "Unresolved historical decision target",
      );
  }
  const visiting = new Set(),
    visited = new Set();
  function visit(token) {
    assert(!visiting.has(token), "Historical action dependency cycle");
    if (visited.has(token)) return;
    visiting.add(token);
    const entry = entries.get(token);
    for (const dependency of entry.content.dependencies)
      visit(key(entry.sourceRef, "action", dependency));
    visiting.delete(token);
    visited.add(token);
  }
  for (const [token, entry] of entries)
    if (entry.type === "action") visit(token);
  return {
    structurallyValid: true,
    sourceVerified: false,
    completenessVerified: false,
    disclosureAuthorized: false,
  };
}
