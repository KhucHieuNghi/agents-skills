import { expect, it } from "vitest";
import { fixture, bundle } from "./helpers/research-projection.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { advanceResearchAccessState as advance } from "../scripts/enterprise-journeys/research-access-state.mjs";
import {
  bindResearchCandidateRevision as bind,
  planResearchAtRevision as plan,
  projectResearchAtRevision as project,
} from "../scripts/enterprise-journeys/research-revision-workflow.mjs";
async function setup() {
  const f = await fixture();
  const initial = { ...f.context, assessmentAt: "2026-11-19T01:45:00Z" };
  const state = advance(null, null, initial),
    b = bundle(f),
    registration = bind(
      state,
      f.context,
      f.descriptors,
      f.policy,
      b.candidates[0],
      f.receipt.reviewedAt,
    );
  return { f, state, b, registrations: [registration] };
}
const run = (x) =>
  project(
    x.state,
    x.f.context,
    x.f.descriptors,
    x.f.payloads,
    x.f.policy,
    x.b.candidates,
    x.b.payloads,
    x.registrations,
  );
it("projects a registered candidate with actual receipt time and derived contributors", async () => {
  const x = await setup(),
    r = run(x);
  expect(r.customerDraft.items).toHaveLength(1);
  expect(x.registrations[0].binding.contributorIds).toEqual(["p1"]);
  expect(r.privateDecision.generation).toBe(1);
  expect(r.privateDecision.decisions[0].reviewedAt).toBe(
    x.f.receipt.reviewedAt,
  );
});
it("blocks old generation before reading historical candidate text after revoke and regrant", async () => {
  const x = await setup();
  x.f.context.assessmentAt = "2026-11-19T02:01:00Z";
  x.f.context.access[0].customerSummaryAllowed = false;
  x.state = advance(x.state, enterpriseDigest(x.state), x.f.context);
  x.f.context.assessmentAt = "2026-11-19T02:02:00Z";
  x.f.context.access[0].customerSummaryAllowed = true;
  x.state = advance(x.state, enterpriseDigest(x.state), x.f.context);
  let read = false;
  Object.defineProperty(x.b.payloads[0], "artifactText", {
    enumerable: true,
    get() {
      read = true;
      throw Error("PRIVATE");
    },
  });
  expect(() => run(x)).toThrow(/Ineligible revision/);
  expect(read).toBe(false);
  x.b.payloads = [];
  const r = run(x);
  expect(r.customerDraft.items).toHaveLength(0);
  expect(r.privateDecision.decisions[0].reasons).toContain(
    "access-generation-mismatch",
  );
});
it("cannot revive old receipt by registering a new timestamp", async () => {
  const x = await setup();
  x.registrations = [
    bind(
      x.state,
      x.f.context,
      x.f.descriptors,
      x.f.policy,
      x.b.candidates[0],
      x.f.context.assessmentAt,
    ),
  ];
  const r = run(x);
  expect(r.customerDraft.items).toHaveLength(0);
  expect(r.privateDecision.decisions[0].reasons).toContain(
    "registered-review-time-mismatch",
  );
  expect(JSON.stringify(r)).not.toContain(x.f.raw.summary);
});
it("requires a registration before acquiring text", async () => {
  const x = await setup();
  x.registrations = [];
  expect(() => run(x)).toThrow(/Ineligible revision/);
  const p = plan(
    x.state,
    x.f.context,
    x.f.descriptors,
    x.f.policy,
    x.b.candidates,
    [],
  );
  expect(p.candidates[0].fetchEligible).toBe(false);
});
it("invalidates registration when candidate or receipt bytes change", async () => {
  const x = await setup();
  x.f.receipt.reviewer.id = "another-reviewer";
  x.b = bundle(x.f);
  expect(() => run(x)).toThrow(/Ineligible revision/);
});
it("requires state advancement before any projection", async () => {
  const x = await setup();
  x.f.context.assessmentAt = "2026-11-19T02:01:00Z";
  x.f.context.access[0].analysisAllowed = false;
  expect(() => run(x)).toThrow(/advanced/);
});
it("rejects duplicate or unknown registrations", async () => {
  const x = await setup();
  x.registrations.push(x.registrations[0]);
  expect(() => run(x)).toThrow(/registration/);
});
it("rejects every supplied identity before any text when a later payload is unknown", async () => {
  const x = await setup();
  let read = false;
  Object.defineProperty(x.b.payloads[0], "receiptText", {
    enumerable: true,
    get() {
      read = true;
      throw Error("PRIVATE");
    },
  });
  x.b.payloads.push({
    candidateId: "unknown",
    artifactText: "x",
    receiptText: "y",
  });
  expect(() => run(x)).toThrow(/Unknown/);
  expect(read).toBe(false);
});
it("does not permit a caller to omit part of the canonical contributor closure", async () => {
  const x = await setup();
  x.registrations[0].binding.contributorIds = [];
  expect(() => run(x)).toThrow(/closure/);
});
it("withholds a nonempty but incomplete contributor binding", async () => {
  const x = await setup(),
    c = x.f.context;
  c.protocol.participants.push({ participantId: "p2", aliases: ["alias-two"] });
  c.protocol.sessions.push({
    ...c.protocol.sessions[0],
    sessionId: "s2",
    participantId: "p2",
  });
  c.protocolDigest = enterpriseDigest(c.protocol);
  c.access[0].scope.protocolDigest = c.protocolDigest;
  c.access.push({ ...structuredClone(c.access[0]), participantId: "p2" });
  x.f.policy.scope.protocolDigest = c.protocolDigest;
  x.b.candidates[0].scope.protocolDigest = c.protocolDigest;
  x.f.descriptors[0].scope.protocolDigest = c.protocolDigest;
  x.f.descriptors.push({
    ...structuredClone(x.f.descriptors[0]),
    sourceId: "export2",
    recordId: "record2",
    sessionId: "s2",
    participantAlias: "alias-two",
    artifactHash: "f".repeat(64),
  });
  x.b.candidates[0].supportBindings.push({
    recordId: "record2",
    recordDigest: "e".repeat(64),
  });
  x.state = advance(null, null, { ...c, assessmentAt: "2026-11-19T01:45:00Z" });
  const registered = bind(
    x.state,
    c,
    x.f.descriptors,
    x.f.policy,
    x.b.candidates[0],
    x.f.receipt.reviewedAt,
  );
  expect(registered.binding.contributorIds).toEqual(["p1", "p2"]);
  registered.binding.contributorIds = ["p1"];
  const result = plan(x.state, c, x.f.descriptors, x.f.policy, x.b.candidates, [
    registered,
  ]);
  expect(result.candidates[0].fetchEligible).toBe(false);
  expect(result.candidates[0].reasons).toContain(
    "incomplete-contributor-closure",
  );
});
