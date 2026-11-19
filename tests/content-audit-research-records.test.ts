import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { evaluateResearchRecords } from "../scripts/enterprise-journeys/research-records.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
async function fixture() {
  return JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/research-content.json",
      "utf8",
    ),
  );
}
function encode(f, raw, sourceId = "export1") {
  const descriptor = structuredClone(f.descriptors[0]);
  descriptor.sourceId = sourceId;
  for (const key of [
    "recordId",
    "kind",
    "sessionId",
    "participantAlias",
    "taskId",
    "promptId",
    "observedAt",
    "supportingRecordIds",
  ])
    descriptor[key] = raw.record[key];
  descriptor.capturedAt = raw.capturedAt;
  const artifactText = JSON.stringify(raw);
  descriptor.artifactHash = hash(artifactText);
  return { descriptor, payload: { sourceId, artifactText } };
}
it("validates isolated original bytes while retaining attributed behavior separately from interpretation", async () => {
  const f = await fixture(),
    r = evaluateResearchRecords(f.context, f.descriptors, f.payloads);
  expect(r.records[0].status).toBe("available");
  expect(r.records[0].record.kind).toBe("observed-behavior");
  expect(r.records[0].record.text).toContain("Participant returned");
  expect(r.evidenceCoverageComplete).toBe(true);
  expect(r.studyComplete).toBe(false);
  expect(r.semanticAcceptance).toBe(false);
  expect(r.populationPrevalenceAccepted).toBe(false);
  expect(JSON.stringify(r)).not.toContain("artifactText");
});
it("rejects a currently ineligible payload before reading its content", async () => {
  const f = await fixture();
  f.context.access[0].analysisAllowed = false;
  let read = false;
  const payload = {
    sourceId: f.payloads[0].sourceId,
    get artifactText() {
      read = true;
      throw Error("Content read");
    },
  };
  expect(() =>
    evaluateResearchRecords(f.context, f.descriptors, [payload]),
  ).toThrow(/Ineligible research payload/);
  expect(read).toBe(false);
});
it("keeps planned obligations after revocation without retaining old record text", async () => {
  const f = await fixture();
  f.context.access[0].analysisAllowed = false;
  const r = evaluateResearchRecords(f.context, f.descriptors, []);
  expect(r.records[0].record).toBeNull();
  expect(r.records[0].status).toBe("withheld");
  expect(r.coverage).toHaveLength(1);
  expect(r.evidenceCoverageComplete).toBe(false);
  expect(JSON.stringify(r)).not.toContain("Participant returned");
});
it("reuses identical artifact aliases without requiring another payload or counting another participant", async () => {
  const f = await fixture();
  f.descriptors.push({ ...f.descriptors[0], sourceId: "alias" });
  const r = evaluateResearchRecords(f.context, f.descriptors, f.payloads);
  expect(r.records).toHaveLength(1);
  expect(r.records[0].sourceIds).toHaveLength(2);
  expect(r.accounting.declaredParticipantsWithAvailableDirectRecords).toBe(1);
});
it("withholds a record if a distinct declared version has not been supplied", async () => {
  const f = await fixture();
  f.descriptors.push({
    ...f.descriptors[0],
    sourceId: "unfetched",
    artifactHash: "c".repeat(64),
  });
  expect(
    evaluateResearchRecords(f.context, f.descriptors, f.payloads).records[0]
      .status,
  ).toBe("missing-content");
});
it("quarantines conflicting text independent of source order", async () => {
  const f = await fixture(),
    raw = JSON.parse(f.payloads[0].artifactText);
  raw.record.text =
    "Participant completed checkout without returning to the basket.";
  const other = encode(f, raw, "other");
  for (const payloads of [
    [...f.payloads, other.payload],
    [other.payload, ...f.payloads],
  ]) {
    const r = evaluateResearchRecords(
      f.context,
      [...f.descriptors, other.descriptor],
      payloads,
    );
    expect(r.records[0].status).toBe("conflicting-content");
    expect(r.records[0].record).toBeNull();
  }
});
it("binds analyst inference to the exact current direct-record digest", async () => {
  const f = await fixture(),
    direct = evaluateResearchRecords(f.context, f.descriptors, f.payloads)
      .records[0];
  const raw = JSON.parse(f.payloads[0].artifactText);
  raw.capturedAt = "2026-11-19T01:41:00Z";
  raw.provenance.method = "analyst-note";
  raw.record = {
    ...raw.record,
    recordId: "inference",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    observedAt: "2026-11-19T01:40:00Z",
    supportingRecordIds: ["record1"],
    representation: "interpretation",
    text: "Delivery information may need clarification.",
    supportBindings: [
      { recordId: "record1", recordDigest: direct.recordDigest },
    ],
  };
  const inference = encode(f, raw, "analysis");
  let r = evaluateResearchRecords(
    f.context,
    [...f.descriptors, inference.descriptor],
    [...f.payloads, inference.payload],
  );
  expect(r.records.find((r) => r.recordId === "inference").status).toBe(
    "available",
  );
  raw.record.supportBindings[0].recordDigest = "d".repeat(64);
  const stale = encode(f, raw, "analysis");
  r = evaluateResearchRecords(
    f.context,
    [...f.descriptors, stale.descriptor],
    [...f.payloads, stale.payload],
  );
  expect(r.records.find((r) => r.recordId === "inference").status).toBe(
    "unavailable-dependency",
  );
  expect(JSON.stringify(r)).not.toContain(
    "Delivery information may need clarification",
  );
});
it.each(["hash", "duplicate-key", "scope", "unicode", "grant"])(
  "rejects invalid %s payload instead of choosing another source",
  async (mode) => {
    const f = await fixture(),
      raw = JSON.parse(f.payloads[0].artifactText);
    if (mode === "hash") f.payloads[0].artifactText += " ";
    else if (mode === "duplicate-key") {
      f.payloads[0].artifactText = '{"schemaVersion":1,"schemaVersion":1}';
      f.descriptors[0].artifactHash = hash(f.payloads[0].artifactText);
    } else {
      if (mode === "scope") raw.scope.studyId = "foreign";
      if (mode === "unicode") raw.record.text = "\ud800";
      if (mode === "grant") raw.authorization = true;
      const v = encode(f, raw);
      f.descriptors = [v.descriptor];
      f.payloads = [v.payload];
    }
    expect(() =>
      evaluateResearchRecords(f.context, f.descriptors, f.payloads),
    ).toThrow();
  },
);
it("does not mark coverage complete when another declared record in the same cell is missing", async () => {
  const f = await fixture();
  f.descriptors.push({
    ...f.descriptors[0],
    sourceId: "unfetched",
    recordId: "record2",
    artifactHash: "c".repeat(64),
  });
  const r = evaluateResearchRecords(f.context, f.descriptors, f.payloads);
  expect(r.evidenceCoverageComplete).toBe(false);
  expect(r.coverage[0].state).toBe("partial-content");
});
it("orders inference bindings by deterministic code units rather than host locale", async () => {
  const f = await fixture(),
    raw = JSON.parse(f.payloads[0].artifactText);
  raw.record.recordId = "record-Z";
  const first = encode(f, raw, "first");
  raw.record.recordId = "record-a";
  const second = encode(f, raw, "second");
  const descriptors = [first.descriptor, second.descriptor],
    payloads = [first.payload, second.payload];
  const direct = evaluateResearchRecords(
    f.context,
    descriptors,
    payloads,
  ).records;
  raw.capturedAt = "2026-11-19T01:41:00Z";
  raw.provenance.method = "analyst-note";
  raw.record = {
    ...raw.record,
    recordId: "inference",
    kind: "analyst-inference",
    sessionId: null,
    participantAlias: null,
    taskId: null,
    promptId: null,
    observedAt: "2026-11-19T01:40:00Z",
    supportingRecordIds: ["record-a", "record-Z"],
    representation: "interpretation",
    text: "Attributed interpretation",
    supportBindings: [...direct]
      .reverse()
      .map((r) => ({ recordId: r.recordId, recordDigest: r.recordDigest })),
  };
  const inference = encode(f, raw, "analysis");
  const r = evaluateResearchRecords(
    f.context,
    [...descriptors, inference.descriptor],
    [...payloads, inference.payload],
  );
  expect(
    r.records
      .find((r) => r.recordId === "inference")
      .record.supportBindings.map((b) => b.recordId),
  ).toEqual(["record-Z", "record-a"]);
});
it.each(["verbatim-declared", "paraphrase"])(
  "keeps %s participant testimony separate from observed behavior",
  async (representation) => {
    const f = await fixture(),
      raw = JSON.parse(f.payloads[0].artifactText);
    raw.record.kind = "participant-statement";
    raw.record.representation = representation;
    raw.record.text = "I expected delivery details before paying.";
    const v = encode(f, raw);
    const r = evaluateResearchRecords(f.context, [v.descriptor], [v.payload]);
    expect(r.records[0].record.kind).toBe("participant-statement");
    expect(r.records[0].record.representation).toBe(representation);
    expect(r.evidenceCoverageComplete).toBe(false);
    expect(r.coverage[0].state).toBe("missing-metadata");
    expect(r.semanticAcceptance).toBe(false);
  },
);
it("rejects behavior presented as participant testimony", async () => {
  const f = await fixture(),
    raw = JSON.parse(f.payloads[0].artifactText);
  raw.record.representation = "verbatim-declared";
  const v = encode(f, raw);
  expect(() =>
    evaluateResearchRecords(f.context, [v.descriptor], [v.payload]),
  ).toThrow(/representation/);
});
it("withholds every payload before reading any text if another supplied source is ineligible", async () => {
  const f = await fixture();
  let read = false;
  const first = {
    sourceId: f.payloads[0].sourceId,
    get artifactText() {
      read = true;
      return f.payloads[0].artifactText;
    },
  };
  const forbidden = { sourceId: "unregistered", artifactText: "restricted" };
  expect(() =>
    evaluateResearchRecords(f.context, f.descriptors, [first, forbidden]),
  ).toThrow();
  expect(read).toBe(false);
});
