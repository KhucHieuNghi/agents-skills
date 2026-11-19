import { expect, it } from "vitest";
import { encode, hash } from "./helpers/experiment-exports.js";
import { prepareExperimentReview } from "../scripts/enterprise-journeys/experiment-review-packet.mjs";
import {
  evaluateReviewedExperiment as evaluate,
  experimentReviewRequirements,
} from "../scripts/enterprise-journeys/experiment-review.mjs";
import { reviewedFixture as setup } from "./helpers/experiment-reviewed.js";
const envelope = (raw) => {
  const artifactText = JSON.stringify(raw);
  return { artifactText, artifactHash: hash(artifactText) };
};
const run = (s = setup()) =>
  evaluate(s.context, s.aggregates, s.supports, s.policy, envelope(s.receipt));
it("accepts an attributed exact-packet review without authenticating it or granting actions", () => {
  const r = run();
  expect(r.review.status).toBe("accepted-attributed-review");
  expect(r.decision.decision).toBe("insufficient-evidence");
  expect(r.reviewerAuthenticated).toBe(false);
  expect(r.independenceAuthenticated).toBe(false);
  expect(r.causalAcceptance).toBe(false);
  expect(r.actionAuthorized).toBe(false);
  expect(r.review.effectiveValidUntil).toBe("2026-11-05T03:00:00.000Z");
  expect(
    r.requests.some(
      (x) => x.condition === "independent-source-bound-review-required",
    ),
  ).toBe(false);
});
it("requires role-specific dictionary/query coverage for metric definitions", () => {
  const s = setup();
  const ids = experimentReviewRequirements(
    s.packet.requirements,
    "metricDefinitionsVerified",
  );
  expect(
    s.packet.requirements
      .filter((r) => ids.includes(r.requirementId))
      .map((r) => r.key),
  ).toEqual(["dictionary:conversion", "dictionary:harm", "query:one"]);
  s.receipt.verdicts
    .find((x) => x.gate === "metricDefinitionsVerified")!
    .bindings.pop();
  expect(run(s).review.reasons).toContain(
    "missing-gate-support:metricDefinitionsVerified",
  );
});
it.each(["reject", "pending"])("keeps a %s gate blocked", (verdict) => {
  const s = setup();
  s.receipt.verdicts[0].verdict = verdict;
  expect(run(s).review.status).toBe("not-accepted");
  expect(run(s).decision.decision).toBe("blocked");
});
it("retains clock-only acceptance until effective exclusive expiry", () => {
  const s = setup();
  s.context.assessmentAt = "2026-11-05T02:59:59Z";
  expect(run(s).review.status).toBe("accepted-attributed-review");
  s.context.assessmentAt = "2026-11-05T03:00:00Z";
  expect(run(s).review.reasons).toContain("review-time-invalid-or-expired");
});
it("rejects policy and synthetic replay while preserving the mismatched receipt", () => {
  const s = setup();
  s.policy.maxAgeSeconds = 86400;
  expect(run(s).review.reasons).toContain("review-binding-mismatch");
  const t = setup();
  t.receipt.synthetic = false;
  expect(run(t).review.reasons).toContain("review-binding-mismatch");
});
it("cannot reuse receipt after adding competing support", () => {
  const s = setup(),
    artifactText = "Additional assignment configuration";
  s.supports.push({
    ...s.supports[1],
    sourceId: "competing",
    artifactText,
    artifactHash: hash(artifactText),
  });
  const r = run(s);
  expect(r.review.reasons).toContain("review-binding-mismatch");
  expect(r.review.reasons).toContain("inventory-coverage-mismatch");
  expect(r.decision.decision).toBe("blocked");
});
it("requires exact inventory and rejects unresolved evidence despite accepted verdicts", () => {
  const s = setup();
  s.receipt.inventory.pop();
  expect(run(s).review.reasons).toContain("inventory-coverage-mismatch");
  const t = setup();
  t.receipt.inventory[0].disposition = "contradicts";
  expect(run(t).review.reasons).toContain("unresolved-inventory:one");
});
it("cannot cite excluded support or an unmatching role", () => {
  const s = setup();
  s.receipt.inventory.find(
    (x) => x.sourceId === "registration-history",
  )!.disposition = "out-of-scope";
  expect(run(s).review.reasons).toContain("invalid-gate-binding:preregistered");
  const t = setup(),
    v = t.receipt.verdicts.find((x) => x.gate === "preregistered")!;
  v.bindings[0].sourceId = "quality-evidence";
  v.bindings[0].artifactHash = t.supports.find(
    (x) => x.sourceId === "quality-evidence",
  )!.artifactHash;
  expect(run(t).review.reasons).toContain("invalid-gate-binding:preregistered");
});
it("checks review chronology, line bounds and reviewer relationship", () => {
  const s = setup();
  s.receipt.reviewedAt = "2026-11-03T00:00:00Z";
  expect(run(s).review.reasons).toContain("review-time-invalid-or-expired");
  const t = setup();
  t.receipt.verdicts[0].bindings[0].locator.lineEnd = 99;
  expect(run(t).review.reasons).toContain(
    "invalid-source-locator:designReviewed",
  );
  const u = setup();
  u.receipt.reviewer.relationship = "author";
  expect(run(u).review.reasons).toContain("independent-review-unestablished");
});
it("never lets review exclusions remove conflicting eligible aggregates", () => {
  const s = setup(),
    other = structuredClone(s.raw);
  other.metrics[0].treatment.confirmedSuccess = 30;
  other.metrics[0].treatment.confirmedNonSuccess = 70;
  s.aggregates.push(encode(other, "other"));
  const packet = prepareExperimentReview(s.context, s.aggregates, s.supports);
  s.receipt.evidenceSetDigest = packet.evidenceSetDigest;
  s.receipt.inventory.push({
    sourceId: "other",
    artifactHash: s.aggregates[1].artifactHash,
    disposition: "out-of-scope",
    reason: "Reviewer-declared exclusion cannot alter mechanical selection.",
  });
  for (const v of s.receipt.verdicts) {
    const needed = experimentReviewRequirements(packet.requirements, v.gate);
    const query = packet.requirements.find((x) => x.key === "query:other")!;
    if (needed.includes(query.requirementId)) {
      const source = s.supports.find((x) => x.role === "metric-query")!;
      v.bindings.push({
        requirementId: query.requirementId,
        sourceId: source.sourceId,
        artifactHash: source.artifactHash,
        locator: { lineStart: 1, lineEnd: 1 },
      });
    }
  }
  const r = run(s);
  expect(r.review.status).toBe("accepted-attributed-review");
  expect(r.packet.aggregate.selectionReasons).toContain(
    "conflicting-eligible-sources",
  );
  expect(r.decision.decision).toBe("blocked");
  expect(r.decision.facts.outcomesMature).toBe(false);
});
it("rejects duplicate gates/inventory, forged bytes and malformed review JSON", () => {
  const s = setup();
  s.receipt.verdicts[1] = s.receipt.verdicts[0];
  expect(() => run(s)).toThrow();
  const t = setup();
  t.receipt.inventory[1] = t.receipt.inventory[0];
  expect(() => run(t)).toThrow();
  const u = setup(),
    r = envelope(u.receipt);
  r.artifactHash = "f".repeat(64);
  expect(() =>
    evaluate(u.context, u.aggregates, u.supports, u.policy, r),
  ).toThrow();
  const bad = '{"schemaVersion":1,"schemaVersion":1}';
  expect(() =>
    evaluate(u.context, u.aggregates, u.supports, u.policy, {
      artifactText: bad,
      artifactHash: hash(bad),
    }),
  ).toThrow();
});
it("returns a scoped review request when receipt is missing", () => {
  const s = setup(),
    r = evaluate(s.context, s.aggregates, s.supports, s.policy, null);
  expect(r.review.status).toBe("missing");
  expect(r.requests.some((x) => x.condition === "missing-review")).toBe(true);
  expect(r.decision.decision).toBe("blocked");
});

it("cannot interpret a selected aggregate excluded by the reviewer", () => {
  const s = setup();
  s.receipt.inventory.find((x) => x.sourceId === "one")!.disposition =
    "out-of-scope";
  const r = run(s);
  expect(r.review.reasons).toContain("selected-aggregate-not-supported:one");
  expect(r.review.status).toBe("not-accepted");
  expect(r.decision.metrics.every((x) => x.interval === null)).toBe(true);
  expect(r.packet.aggregate.selectedSourceIds).toEqual(["one"]);
});
