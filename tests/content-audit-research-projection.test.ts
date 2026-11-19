import {
  renderResearchDraft,
  validateResearchDraftArtifacts,
} from "../scripts/enterprise-journeys/research-report.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateResearchRecords } from "../scripts/enterprise-journeys/research-records.mjs";
import { projectResearchDisclosure } from "../scripts/enterprise-journeys/research-projection.mjs";
const hash = (v) => createHash("sha256").update(v).digest("hex");
async function fixture() {
  const f = JSON.parse(
    await readFile(
      "tests/fixtures/content-audit/enterprise/journeys/research-content.json",
      "utf8",
    ),
  );
  const scope = structuredClone(f.context.access[0].scope),
    r = evaluateResearchRecords(f.context, f.descriptors, f.payloads)
      .records[0];
  const policy = {
    schemaVersion: 1,
    scope,
    allowedKinds: ["observed-behavior"],
    reviewMaxAgeSeconds: 3600,
    validUntil: "2026-11-20T00:00:00Z",
  };
  const raw = {
    schemaVersion: 1,
    candidateId: "private-summary",
    scope,
    kind: "observed-behavior",
    supportBindings: [{ recordId: r.recordId, recordDigest: r.recordDigest }],
    taskContext: "Sandbox checkout",
    summary: "Return to basket observed after reviewing delivery options.",
    limitation: "A qualitative observation, without a prevalence estimate.",
    recommendation:
      "Investigate whether delivery choices are clear before payment.",
    retest: "Observe an authorized task with revised delivery explanations.",
  };
  const receipt = {
    schemaVersion: 1,
    candidateDigest: enterpriseDigest(raw),
    policyDigest: enterpriseDigest(policy),
    scope,
    reviewedAt: "2026-11-19T01:50:00Z",
    validUntil: "2026-11-19T02:30:00Z",
    reviewer: { id: "independent-ai-reviewer", type: "ai" },
    verdicts: {
      meaning: "accept",
      disclosure: "accept",
      recommendation: "accept",
    },
  };
  return { ...f, policy, raw, receipt };
}
function bundle(f) {
  const artifactText = JSON.stringify(f.raw),
    receiptText = JSON.stringify(f.receipt);
  return {
    candidates: [
      {
        candidateId: f.raw.candidateId,
        scope: f.raw.scope,
        kind: f.raw.kind,
        supportBindings: f.raw.supportBindings,
        artifactHash: hash(artifactText),
        receiptHash: hash(receiptText),
      },
    ],
    payloads: [{ candidateId: f.raw.candidateId, artifactText, receiptText }],
  };
}
function run(f, b = bundle(f)) {
  return projectResearchDisclosure(
    f.context,
    f.descriptors,
    f.payloads,
    f.policy,
    b.candidates,
    b.payloads,
  );
}
it("produces useful allowlisted customer draft with private traceability", async () => {
  const f = await fixture(),
    r = run(f);
  expect(r.customerDraft.items[0].summary).toBe(f.raw.summary);
  expect(r.customerDraft.synthetic).toBe(true);
  expect(r.customerDraft.items[0].reviewType).toBe("ai");
  expect(r.privateDecision.reviewerAuthenticated).toBe(false);
  expect(r.privateDecision.customerExportAuthorized).toBe(false);
  const json = JSON.stringify(r.customerDraft);
  for (const privateValue of [
    "private-summary",
    "record1",
    "export1",
    "alias-one",
    "fixture/session-1",
    f.descriptors[0].artifactHash,
    f.raw.supportBindings[0].recordDigest,
    "Participant returned to the basket",
    f.context.protocol.prompts[0].text,
  ])
    expect(json).not.toContain(privateValue);
  expect(r.privateDecision.decisions[0].reference).toBe(
    r.customerDraft.items[0].reference,
  );
  expect(run(f).customerDraft.items[0].reference).not.toBe(
    r.customerDraft.items[0].reference,
  );
});
it.each(["summary", "taskContext", "limitation", "recommendation", "retest"])(
  "invalidates prior review after %s changes",
  async (field) => {
    const f = await fixture();
    f.raw[field] += " changed";
    const r = run(f);
    expect(r.customerDraft.items).toHaveLength(0);
    expect(r.privateDecision.decisions[0].reasons).toContain(
      "review-binding-mismatch",
    );
  },
);
it.each(["meaning", "disclosure", "recommendation"])(
  "withholds sensitive candidate when %s review rejects",
  async (field) => {
    const f = await fixture();
    f.raw.summary = "SENSITIVE-CANARY";
    f.receipt.candidateDigest = enterpriseDigest(f.raw);
    f.receipt.verdicts[field] = "reject";
    const r = run(f);
    expect(r.customerDraft.status).toBe("inconclusive");
    expect(JSON.stringify(r)).not.toContain("SENSITIVE-CANARY");
  },
);
it("checks every supplied identity before reading any candidate or receipt", async () => {
  const f = await fixture(),
    b = bundle(f);
  let read = false;
  Object.defineProperty(b.payloads[0], "artifactText", {
    enumerable: true,
    get() {
      read = true;
      throw Error("PRIVATE");
    },
  });
  b.payloads.push({
    candidateId: "unregistered",
    artifactText: "x",
    receiptText: "y",
  });
  expect(() => run(f, b)).toThrow(/Unknown/);
  expect(read).toBe(false);
});
it("denies revoked candidate text before retrieval and permits a text-free reassessment", async () => {
  const f = await fixture(),
    b = bundle(f);
  let read = false;
  Object.defineProperty(b.payloads[0], "artifactText", {
    enumerable: true,
    get() {
      read = true;
      throw Error("PRIVATE");
    },
  });
  f.context.access[0].analysisAllowed = false;
  expect(() => run(f, b)).toThrow(/Ineligible/);
  expect(read).toBe(false);
  f.payloads = [];
  b.payloads = [];
  const r = run(f, b);
  expect(r.customerDraft.items).toHaveLength(0);
  expect(JSON.stringify(r.customerDraft)).not.toContain("withheld");
});
it("does not read candidate text for a changed exact evidence digest", async () => {
  const f = await fixture(),
    b = bundle(f);
  b.candidates[0].supportBindings[0].recordDigest = "f".repeat(64);
  let read = false;
  Object.defineProperty(b.payloads[0], "artifactText", {
    enumerable: true,
    get() {
      read = true;
      throw Error("PRIVATE");
    },
  });
  const r = run(f, b);
  expect(read).toBe(false);
  expect(r.privateDecision.decisions[0].reasons).toContain(
    "exact-content-support-unavailable",
  );
});
it.each(["expired", "old", "predates", "beyond-access", "policy", "scope"])(
  "withholds %s review",
  async (mode) => {
    const f = await fixture();
    if (mode === "expired") f.receipt.validUntil = f.context.assessmentAt;
    if (mode === "old") f.policy.reviewMaxAgeSeconds = 60;
    if (mode === "predates") f.receipt.reviewedAt = "2026-11-19T01:20:00Z";
    if (mode === "beyond-access") f.receipt.validUntil = "2026-11-21T00:00:00Z";
    if (mode === "policy") f.receipt.policyDigest = "f".repeat(64);
    if (mode === "scope")
      f.receipt.scope = { ...f.receipt.scope, recipientId: "other" };
    expect(run(f).customerDraft.items).toHaveLength(0);
  },
);
it.each(["hash", "duplicate-key", "unicode", "extra-field"])(
  "rejects malformed %s input without emitting content",
  async (mode) => {
    const f = await fixture();
    let b = bundle(f);
    if (mode === "hash") b.payloads[0].artifactText += " ";
    if (mode === "duplicate-key") {
      b.payloads[0].artifactText = '{"schemaVersion":1,"schemaVersion":1}';
      b.candidates[0].artifactHash = hash(b.payloads[0].artifactText);
    }
    if (mode === "unicode") {
      f.raw.summary = "\ud800";
      b = bundle(f);
    }
    if (mode === "extra-field") {
      f.raw.rawParticipant = "PRIVATE";
      b = bundle(f);
    }
    expect(() => run(f, b)).toThrow();
  },
);
it("does not expose private missing candidate counts in an empty draft", async () => {
  const f = await fixture(),
    b = bundle(f);
  b.payloads = [];
  const r = run(f, b);
  expect(r.customerDraft.items).toHaveLength(0);
  expect(r.customerDraft.status).toBe("inconclusive");
  expect(JSON.stringify(r.customerDraft)).not.toContain(
    "candidate-content-not-supplied",
  );
});

it("derives all artifact formats from one evaluated customer draft without private decision data", async () => {
  const f = await fixture(),
    result = run(f);
  const artifacts = renderResearchDraft(result.customerDraft);
  expect(validateResearchDraftArtifacts(artifacts)).toEqual(
    result.customerDraft,
  );
  expect(renderResearchDraft(result.customerDraft)).toEqual(artifacts);
  for (const bytes of [
    artifacts.json,
    artifacts.markdown,
    artifacts.html,
    JSON.stringify(artifacts.manifest),
  ]) {
    for (const secret of [
      "private-summary",
      "record1",
      "export1",
      "alias-one",
      f.raw.supportBindings[0].recordDigest,
      f.descriptors[0].artifactHash,
    ])
      expect(bytes).not.toContain(secret);
  }
});
