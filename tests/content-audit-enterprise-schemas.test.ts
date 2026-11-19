import { enterpriseReviewCheckBinding } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { readFile, readdir } from "node:fs/promises";
import { expect, it } from "vitest";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
for (const name of await readdir("skills/content-search-audit/schemas"))
  if (name.endsWith(".schema.json"))
    ajv.addSchema(
      JSON.parse(
        await readFile(`skills/content-search-audit/schemas/${name}`, "utf8"),
      ),
    );
it("accepts real enterprise intake output and rejects ownership/type omissions without coercion", () => {
  const run = resolveAuditContext(
    {
      customerId: "a",
      runId: "r",
      assessmentAt: "2026-11-18T12:00:00Z",
      profileIds: ["publishing"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  const validate = ajv.getSchema("urn:nkskills:enterprise-audit:run")!;
  expect(validate(run), JSON.stringify(validate.errors)).toBe(true);
  const boundRun = structuredClone(run);
  Object.assign(boundRun.checks[0], {
    status: "not-applicable",
    review: {
      reviewer: "r",
      rationale: "Synthetic",
      reviewedAt: run.assessmentAt,
      validUntil: "2026-11-18T13:00:00Z",
      checkBindings: {
        [run.checks[1].checkId]: enterpriseReviewCheckBinding(
          run,
          run.checks[1].checkId,
        ),
      },
    },
  });
  expect(validate(boundRun), JSON.stringify(validate.errors)).toBe(true);
  for (const fields of [
    { checkBindings: {} },
    { checkBindings: { bad: "bad" } },
    { checkBindings: null },
    { validUntil: "bad" },
  ]) {
    const invalid = structuredClone(boundRun);
    Object.assign(invalid.checks[0].review, fields);
    expect(validate(invalid)).toBe(false);
  }
  const reviewRequest = {
    ...run.dataRequests[0],
    revalidateOnCheckInvalidation: true,
    invalidatedEvidenceDigests: ["a".repeat(64)],
  };
  expect(
    validate({ ...run, dataRequests: [reviewRequest] }),
    JSON.stringify(validate.errors),
  ).toBe(true);
  for (const fields of [
    { revalidateOnCheckInvalidation: false },
    { revalidateOnCheckInvalidation: "true" },
    { invalidatedEvidenceDigests: ["bad"] },
    { invalidatedEvidenceDigests: ["a".repeat(64), "a".repeat(64)] },
  ])
    expect(
      validate({ ...run, dataRequests: [{ ...reviewRequest, ...fields }] }),
    ).toBe(false);
  for (const mutation of [
    { ...run, schemaFamily: "content-search-audit" },
    { ...run, entities: [{ entityId: "site", type: "site" }] },
    { ...run, checks: [{ ...run.checks[0], status: "complete" }] },
    { ...run, dataRequests: [{ ...run.dataRequests[0], status: "pass" }] },
    { ...run, assessmentAt: "yesterday" },
  ])
    expect(validate(mutation)).toBe(false);
});
