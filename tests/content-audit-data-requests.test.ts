import { expect, it } from "vitest";
import {
  createDataRequest,
  mergeDataRequests,
  reconcileDataRequests,
} from "../skills/content-search-audit/scripts/lib/data-requests.mjs";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const now = "2026-11-18T12:00:00Z";
function request(check = "check-a") {
  return createDataRequest({
    customerId: "a",
    runId: "run",
    requestedArtifact: "gtm-container",
    scopeKey: "site",
    windowId: null,
    moduleIds: ["tracking"],
    affectedCheckIds: [check],
    reason: "Trace required",
    acceptedFormats: ["JSON"],
    leastPrivilegeAccess: "Export only",
    exportInstructions: "Export the container version being tested",
    suggestedOwnerRole: "Analytics owner",
    fallback: "Supply a browser trace",
    priority: "high",
  });
}
const evidence = {
  evidenceId: "e1",
  customerId: "a",
  runId: "run",
  artifactType: "gtm-container",
  scopeKey: "site",
  windowId: null,
  digest: "a".repeat(64),
  validUntil: "2026-11-19T12:00:00Z",
  observedAt: "2026-11-18T11:00:00Z",
};
const receipt = { evidenceId: "e1", bindingDigest: enterpriseDigest(evidence) };
it("deduplicates questions while retaining every affected check", () => {
  const merged = mergeDataRequests([request(), request("check-b")]);
  expect(merged).toHaveLength(1);
  expect(merged[0].affectedCheckIds).toEqual(["check-a", "check-b"]);
});
it("accepts validated evidence only from the matching tenant/scope and does not repeatedly invalidate unchanged evidence", () => {
  const options = { assessmentAt: now, verifiedEvidence: [receipt] };
  const provided = reconcileDataRequests([request()], [evidence], options);
  expect(provided.requests[0].status).toBe("provided");
  expect(provided.invalidatedCheckIds).toEqual(["check-a"]);
  expect(
    reconcileDataRequests(provided.requests, [evidence], options)
      .invalidatedCheckIds,
  ).toEqual([]);
  const changed = reconcileDataRequests(
    provided.requests,
    [{ ...evidence, digest: "b".repeat(64) }],
    options,
  );
  expect(changed.requests[0].status).toBe("invalid");
  expect(changed.invalidatedCheckIds).toEqual(["check-a"]);
  expect(
    reconcileDataRequests(
      [request()],
      [{ ...evidence, customerId: "other" }],
      options,
    ).requests[0].status,
  ).toBe("requested");
});
it("does not treat unvalidated supplied data as provided and preserves refusal without repeated questions", () => {
  expect(
    reconcileDataRequests([request()], [evidence], {
      assessmentAt: now,
      verifiedEvidence: [],
    }).requests[0].status,
  ).toBe("invalid");
  const declined = { ...request(), status: "declined" };
  expect(
    reconcileDataRequests([declined], [], {
      assessmentAt: now,
      verifiedEvidence: [],
    }).requests[0].status,
  ).toBe("declined");
});
it("expires old evidence and invalidates dependent checks rather than keeping provided", () => {
  const provided = reconcileDataRequests([request()], [evidence], {
    assessmentAt: now,
    verifiedEvidence: [receipt],
  });
  const expired = reconcileDataRequests(provided.requests, [evidence], {
    assessmentAt: "2026-11-20T12:00:00Z",
    verifiedEvidence: [receipt],
  });
  expect(expired.requests[0].status).toBe("expired");
  expect(expired.invalidatedCheckIds).toEqual(["check-a"]);
});

it("does not accept a future observation even with a matching validation receipt", () => {
  const future = { ...evidence, observedAt: "2026-11-19T11:00:00Z" };
  expect(
    reconcileDataRequests([request()], [future], {
      assessmentAt: now,
      verifiedEvidence: [
        { evidenceId: "e1", bindingDigest: enterpriseDigest(future) },
      ],
    }).requests[0].status,
  ).toBe("invalid");
});
it("rejects a provided request without evidence bindings", () => {
  expect(() =>
    mergeDataRequests([{ ...request(), status: "provided" }]),
  ).toThrow();
});

it("does not reopen a refusal because old matching evidence is still present", () => {
  expect(
    reconcileDataRequests([{ ...request(), status: "declined" }], [evidence], {
      assessmentAt: now,
      verifiedEvidence: [receipt],
    }).requests[0].status,
  ).toBe("declined");
});
