import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { setup } from "./helpers/remediation-preparation.js";
import { input } from "./helpers/remediation-fixture.js";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
// @ts-expect-error development module
import {
  renderChangePlan,
  verifyChangePlanArtifacts,
} from "../scripts/enterprise-remediation/change-plan-view.mjs";
function sample() {
  const planningInput = input();
  const plan = planChanges(planningInput);
  return {
    plan,
    planningInput,
    hostContext: {
      trustedAssetBindings: planningInput.trustedAssetBindings,
      trustedAcceptancePolicies: [],
    },
  };
}
it("renders deterministic source-bound private artifacts without granting execution", () => {
  const x = sample(),
    before = JSON.stringify(x),
    a = renderChangePlan(x);
  expect(renderChangePlan(x)).toEqual(a);
  expect(JSON.stringify(x)).toBe(before);
  expect(JSON.parse(a.json)).toEqual(x.plan);
  expect(a.html).toContain("Draft — execution not authorized");
  expect(a.markdown).toContain(x.plan.planDigest);
  expect(a.manifest.files["plan.json"]).toBe(
    createHash("sha256").update(a.json).digest("hex"),
  );
  expect(verifyChangePlanArtifacts({ ...x, artifacts: a })).toBe(true);
});
it("rejects tampered plans even with a matching self-declared digest", () => {
  const x = sample();
  x.plan.entries[0].executionAllowed = true;
  const { planDigest: _digest, ...body } = x.plan;
  void _digest;
  x.plan.planDigest = enterpriseDigest(body);
  expect(() => renderChangePlan(x)).toThrow();
});
it("requires current host mappings instead of trusting the imported planning input", () => {
  const x = sample();
  x.hostContext.trustedAssetBindings = [];
  expect(() => renderChangePlan(x)).toThrow();
});
it("preserves missing-data requests, evidence and limitations", () => {
  const x = sample(),
    a = renderChangePlan(x);
  for (const request of x.plan.entries[0].dataRequests) {
    expect(a.html).toContain(request.reason);
    expect(a.markdown).toContain(request.reason);
  }
  expect(a.html).toContain(x.plan.entries[0].sourceEvidence[0].digest);
  expect(a.html).toContain("not their authenticity");
});
it("escapes hostile owner text and contains no active script or remote assets", () => {
  const x = sample();
  x.planningInput.proposals[0].ownerRole =
    "<script>alert(1)</script> ![x](https://evil.test)";
  x.plan = planChanges(x.planningInput);
  const a = renderChangePlan(x);
  expect(a.html).not.toContain("<script>");
  expect(a.html).toContain("&lt;script&gt;");
  expect(a.html).not.toMatch(/<(?:iframe|img|link|script)\b/i);
  expect(a.markdown).not.toContain("![x](https://evil.test)");
});
it("rejects changed or missing projections and manifest fields", () => {
  const x = sample(),
    a = renderChangePlan(x);
  expect(() =>
    verifyChangePlanArtifacts({
      ...x,
      artifacts: { ...a, html: a.html + " " },
    }),
  ).toThrow();
  expect(() =>
    verifyChangePlanArtifacts({
      ...x,
      artifacts: { ...a, manifest: { ...a.manifest, extra: true } },
    }),
  ).toThrow();
});

it("keeps a complete planning record unauthorized and binds its current acceptance policy", () => {
  const p = setup();
  const a = renderChangePlan(p);
  expect(p.plan.entries[0].gaps).toEqual([]);
  expect(a.html).toContain("execution remains unauthorized");
  expect(a.html).toContain(p.plan.entries[0].acceptance.policyDigest);
  const hostContext = { ...p.hostContext, trustedAcceptancePolicies: [] };
  expect(() => renderChangePlan({ ...p, hostContext })).toThrow();
});
