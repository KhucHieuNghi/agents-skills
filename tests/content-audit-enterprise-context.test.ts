import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
const input = {
  customerId: "a",
  runId: "run",
  assessmentAt: "2026-11-18T12:00:00Z",
  profileIds: ["commerce", "booking"],
  entities: [{ entityId: "site", type: "site" }],
  evidence: [],
};
it("plans all modules for a mixed business without duplicate checks or N/A due to missing access", () => {
  const run = resolveAuditContext(input, []);
  expect(run.moduleIds).toHaveLength(10);
  expect(run.checks.length).toBeGreaterThanOrEqual(10);
  expect(
    new Set(run.checks.map((c: { checkId: string }) => c.checkId)).size,
  ).toBe(run.checks.length);
  expect(
    run.checks.every((c: { status: string }) => c.status === "unknown"),
  ).toBe(true);
  expect(
    run.dataRequests.some(
      (r: { requestedArtifact: string }) =>
        r.requestedArtifact === "business-observations",
    ),
  ).toBe(true);
  expect(run.inventoryMode).toBe("sample");
  expect(run.operationMode).toBe("audit");
});
it("supports all business profiles and keeps full inventory explicitly scoped", () => {
  for (const profile of [
    "lead-generation",
    "commerce",
    "booking",
    "subscription",
    "publishing",
  ]) {
    const run = resolveAuditContext(
      {
        ...input,
        profileIds: [profile],
        inventoryMode: "full",
        inventoryComplete: true,
      },
      [],
    );
    expect(run.profileVersions[profile]).toBe("1");
    expect(run.inventoryMode).toBe("full");
  }
  expect(() =>
    resolveAuditContext({ ...input, inventoryMode: "full" }, []),
  ).toThrow(/inventory/i);
  expect(() =>
    resolveAuditContext({ ...input, profileIds: ["unknown-profile"] }, []),
  ).toThrow(/profile/i);
});
it("requests business context instead of silently guessing the industry", () => {
  const run = resolveAuditContext({ ...input, profileIds: [] }, []);
  expect(
    run.dataRequests.some(
      (r: { requestedArtifact: string }) =>
        r.requestedArtifact === "business-context",
    ),
  ).toBe(true);
});
it("does not claim assessment from available connector capability or parseable input", () => {
  const run = resolveAuditContext(input, [
    { provider: "ga4", mode: "read", available: true },
  ]);
  expect(
    run.checks.every((c: { status: string }) => c.status === "unknown"),
  ).toBe(true);
  expect(
    run.dataRequests.find(
      (r: { requestedArtifact: string }) =>
        r.requestedArtifact === "ga4-report",
    ).fallback,
  ).toBeTruthy();
});

it("keeps all operation modes independent from full or sampled inventory", () => {
  for (const operationMode of ["audit", "plan", "remediate", "verify"])
    for (const inventoryMode of ["full", "sample"]) {
      const run = resolveAuditContext(
        { ...input, operationMode, inventoryMode, inventoryComplete: true },
        [],
      );
      expect(run.operationMode).toBe(operationMode);
      expect(run.inventoryMode).toBe(inventoryMode);
      expect(
        run.checks.every(
          (check: { status: string }) => check.status === "unknown",
        ),
      ).toBe(true);
    }
});

it("asks for profile-specific outcomes without asking publishers for bookings or payments", () => {
  const commerce = resolveAuditContext(
    { ...input, profileIds: ["commerce"] },
    [],
  );
  const publishing = resolveAuditContext(
    { ...input, profileIds: ["publishing"] },
    [],
  );
  const question = (run: ReturnType<typeof resolveAuditContext>) =>
    run.dataRequests.find(
      (request: { requestedArtifact: string }) =>
        request.requestedArtifact === "business-observations",
    ).exportInstructions;
  expect(question(commerce)).toContain("settled-payment");
  expect(question(publishing)).toContain("confirmed-subscription");
  expect(question(publishing)).not.toMatch(/booking|settled-payment/);
  expect(question(commerce)).not.toBe(question(publishing));
});
