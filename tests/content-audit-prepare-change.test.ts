import { expect, it } from "vitest";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { setup } from "./helpers/remediation-preparation.js";
// @ts-expect-error development module
import { prepareChange } from "../scripts/enterprise-remediation/prepare-change.mjs";

it("prepares an inert exact-artifact descriptor without granting execution", () => {
  const x = setup(),
    before = JSON.stringify(x);
  const r = prepareChange(x);
  expect(r.status).toBe("prepared");
  expect(r.executionAllowed).toBe(false);
  expect(r.descriptor.artifactDigest).toBe("b".repeat(64));
  expect(JSON.stringify(x)).toBe(before);
});
it.each(["audit", "plan", "verify"])(
  "denies mutation in %s mode",
  (operationMode) => {
    const x = setup();
    x.hostContext.operationMode = operationMode;
    expect(prepareChange(x).status).toBe("denied");
  },
);
it("denies expired or revoked grants at current execution time", () => {
  const x = setup();
  x.now = "2026-11-18T14:59:00Z";
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  Object.assign(y.hostContext.trustedAuthorizations[0], {
    revokedAt: "2026-11-18T14:10:00Z",
  });
  expect(prepareChange(y).status).toBe("denied");
});
it("does not accept approval or policy supplied only in imported inputs", () => {
  const x = setup();
  x.hostContext.trustedApprovals = [];
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  y.hostContext.trustedAcceptancePolicies = [];
  expect(prepareChange(y).status).toBe("denied");
});
it("rejects changed patch, base, target, identity and rolled-back approval", () => {
  for (const key of [
    "artifactDigest",
    "preconditionDigest",
    "assetId",
    "environment",
    "identityId",
    "rollbackDigest",
  ]) {
    const x = setup();
    Object.assign(x.hostContext.trustedApprovals[0], { [key]: "changed" });
    expect(prepareChange(x).status).toBe("denied");
  }
});
it("rejects stale precondition and tampered plan even with recomputed self hash", () => {
  const x = setup();
  x.currentPreconditionDigest = "e".repeat(64);
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  y.plan.entries[0].artifactDigest = "e".repeat(64);
  const { planDigest: oldDigest, ...body } = y.plan;
  void oldDigest;
  y.plan.planDigest = enterpriseDigest(body);
  expect(prepareChange(y).status).toBe("denied");
});
it("requires a session match for session-bound approval", () => {
  const x = setup();
  Object.assign(x.hostContext.trustedApprovals[0], {
    expiresAt: null,
    sessionId: "other",
  });
  expect(prepareChange(x).status).toBe("denied");
});
it("denies read-only grants and duplicate approval refs", () => {
  const x = setup();
  x.hostContext.trustedAuthorizations[0].allowedActions = ["read"];
  expect(prepareChange(x).status).toBe("denied");
  const y = setup();
  y.hostContext.trustedApprovals.push({ ...y.hostContext.trustedApprovals[0] });
  expect(prepareChange(y).status).toBe("denied");
});

it("requires replanning if the frozen retest window has started", () => {
  const x = setup();
  x.now = "2026-11-18T15:00:00Z";
  expect(prepareChange(x).reason).toBe("retest-window-needs-replanning");
});
it("does not reuse source evidence past its exclusive expiry", () => {
  const x = setup();
  x.now = "2026-11-19T12:00:00Z";
  expect(prepareChange(x).reason).toBe("source-evidence-expired");
});
