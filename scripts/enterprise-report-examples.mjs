import process from "node:process";
import console from "node:console";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  enterpriseDigest,
  saveEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  saveEnterpriseReport,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";

// Synthetic rendering fixtures only: no real provider/account or quality claims.
const output = path.resolve(
  process.argv[2] ?? "build/enterprise-report-examples",
);
await mkdir(output);
const receipts = [];
for (const mode of ["partial", "complete-accounting"]) {
  const run = resolveAuditContext(
    {
      customerId: "synthetic-example",
      runId: `synthetic-${mode}`,
      assessmentAt: "2026-11-18T12:00:00Z",
      profileIds: ["commerce", "booking"],
      entities: [{ entityId: "site", type: "site" }],
    },
    [],
  );
  const complete = mode === "complete-accounting";
  const selected = complete ? run.checks : run.checks.slice(0, 1);
  for (const check of selected) {
    const evidence = {
      evidenceId: `sample-${check.moduleId}`,
      customerId: run.customerId,
      runId: run.runId,
      entityId: check.entityId,
      source: "Synthetic fixture; not a provider observation",
      observedAt: "2026-11-18T11:00:00Z",
      validUntil: "2026-11-19T12:00:00Z",
      digest: enterpriseDigest({ synthetic: true, checkId: check.checkId }),
    };
    run.evidence.push(evidence);
    Object.assign(check, {
      status: complete ? "pass" : "fail",
      reason: complete
        ? "Synthetic positive control; not a real audit verdict"
        : "Synthetic redirect defect",
      evidenceIds: [evidence.evidenceId],
      dependencies: [evidence.evidenceId],
      assessedAt: run.assessmentAt,
    });
  }
  const first = run.checks[0];
  const bundle = {
    sourceRunDigest: enterpriseDigest(run),
    revisionId: `synthetic-report-${mode}`,
    authorId: "synthetic-author",
    generatedAt: "2026-11-18T13:00:00Z",
    brand: {
      name: `SYNTHETIC EXAMPLE — ${mode}`,
      accent: complete ? "#ffffff" : "#234e52",
    },
    findings: complete
      ? []
      : [
          {
            findingId: "F-1",
            checkId: first.checkId,
            evidenceIds: first.evidenceIds,
            severity: "high",
            confidence: "high",
            title: "Synthetic redirect failure",
            description: "The sample route does not reach its destination.",
            businessImpact:
              "Illustrates a disrupted product journey; no measured revenue impact.",
            recommendation:
              "Inspect the redirect target in an authorized environment.",
            verification: "Retest the declared route.",
          },
        ],
    actions: [],
    observations: [
      {
        observationId: "O-1",
        label: "Synthetic historical citation sample",
        value: { numerator: 40, denominator: 100 },
        unit: "cited responses / responses",
        classification: "historical",
        precision: "exact",
        period: { from: "2026-10-01", to: "2026-10-31" },
        scopeDescription: "Invented rendering example only",
        evidenceIds: first.evidenceIds,
      },
    ],
    narrative: [
      {
        narrativeId: "N-1",
        kind: "limitation",
        text: "All observations and verdicts in this example are invented rendering fixtures. Intake requests remain visible. No real website, provider account, commercial acceptance or reviewer approval is represented.",
        evidenceIds: first.evidenceIds,
      },
    ],
    decisions: [],
  };
  await saveEnterpriseRun(path.join(output, `${mode}-run`), run);
  await writeFile(
    path.join(output, `${mode}-bundle.json`),
    JSON.stringify(bundle, null, 2) + "\n",
  );
  const report = buildEnterpriseReport(run, bundle);
  receipts.push(await saveEnterpriseReport(path.join(output, mode), report));
  receipts.push(
    await saveEnterpriseReport(
      path.join(output, `${mode}-public`),
      report,
      "public",
    ),
  );
}
await writeFile(
  path.join(output, "examples.json"),
  JSON.stringify(
    { synthetic: true, releaseAccepted: false, receipts },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ output, examples: receipts.length, synthetic: true }),
);
