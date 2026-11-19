import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { enterpriseDigest } from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { evaluateResearchRecords } from "../../scripts/enterprise-journeys/research-records.mjs";
export const hash = (v) => createHash("sha256").update(v).digest("hex");
export async function fixture() {
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
export function bundle(f) {
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
