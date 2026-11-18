import { readFile } from "node:fs/promises";
import {
  enterpriseDigest,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  reconcileEnterpriseChecks,
  textValue,
} from "./enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "./enterprise-provider-workflow.mjs";
import { createDataRequest } from "./data-requests.mjs";
import { normalizeBrowserCapture } from "./browser-capture.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const importerDigest = enterpriseDigest(
  await Promise.all(
    [
      "enterprise-browser-workflow.mjs",
      "browser-capture.mjs",
      "enterprise-state.mjs",
      "enterprise-provider-workflow.mjs",
      "data-requests.mjs",
    ].map(async (name) => [
      name,
      await readFile(new URL(name, import.meta.url), "utf8"),
    ]),
  ),
);
const requirements = [
  {
    moduleId: "tracking",
    key: "journey-chain",
    reason:
      "Browser event names and HTTP responses do not prove a complete conversion chain.",
    owner: "Measurement and application owners",
    instructions:
      "Supply the event/journey contract, tenant-safe correlation mapping, approved resource origins, complete stage traces and matching provider/business receipts for this capture window.",
  },
  {
    moduleId: "consent",
    key: "consent-scenarios",
    reason:
      "This read-only capture did not assess consent states, policy or transitions.",
    owner: "Privacy policy and implementation owners",
    instructions:
      "Supply the technical consent policy, region/mode matrix and authorized test scenarios for fresh/default, reject, accept, selective, revoke, persisted and SPA behavior; include observed storage/request evidence.",
  },
  {
    moduleId: "performance",
    key: "field-lab",
    reason:
      "DOM dimensions and this restricted browser session do not establish Core Web Vitals.",
    owner: "Performance and analytics owners",
    instructions:
      "Supply URL/origin-scoped CrUX or RUM with time window/device context, plus separately labeled lab traces with network/cache/device settings. Explicitly report unavailable field samples.",
  },
  {
    moduleId: "accessibility",
    key: "interaction-evidence",
    reason:
      "The capture contains no accessibility conformance or keyboard assessment.",
    owner: "Accessibility and frontend owners",
    instructions:
      "Supply automated findings with affected elements and manual keyboard/screen-reader evidence for representative templates and error states; list untested WCAG criteria.",
  },
  {
    moduleId: "ux-cro",
    key: "journey-outcomes",
    reason:
      "A page snapshot does not establish usable journeys or conversion outcomes.",
    owner: "Product, research and business-system owners",
    instructions:
      "Supply prioritized journeys, success criteria, funnel definitions and permitted test identities; separate observed friction from hypotheses and measured experiments.",
  },
];
/** Import is evidence attachment only. It grants no browser authority and creates no pass/fail finding. */
export async function importEnterpriseBrowserCaptures(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory);
  let next = forkEnterpriseEvidenceRun(previous, bundle, "captures");
  assert(bundle.captures.length <= 100, "Too many browser captures");
  next.browserCaptures = next.browserCaptures ?? [];
  const ids = new Set(next.browserCaptures.map((x) => x.captureId));
  for (const entry of bundle.captures) {
    assert(
      entry &&
        Object.keys(entry).every((k) =>
          ["captureId", "entityId", "environment", "source"].includes(k),
        ) &&
        typeof entry.captureId === "string" &&
        /^[a-z][a-z0-9-]{0,63}$/.test(entry.captureId) &&
        !ids.has(entry.captureId) &&
        next.entities.some((e) => e.entityId === entry.entityId) &&
        textValue(entry.environment),
      "Invalid/reused browser capture identity",
    );
    ids.add(entry.captureId);
    const context = {
      customerId: next.customerId,
      entityId: entry.entityId,
      environment: entry.environment,
      assessmentAt: bundle.assessmentAt,
    };
    const normalized = normalizeBrowserCapture(entry.source, context),
      c = normalized.capture;
    const content = {
      captureId: entry.captureId,
      source: entry.source,
      importerDigest,
    };
    const evidence = {
      evidenceId: "browser-" + enterpriseDigest(content),
      customerId: next.customerId,
      runId: next.runId,
      entityId: entry.entityId,
      source:
        (c.synthetic ? "synthetic-" : "") +
        "supplied-read-only-browser-capture",
      artifactType: "browser-capture",
      scopeKey: entry.entityId,
      windowId: entry.captureId,
      observedAt: c.finishedAt,
      validUntil: normalized.validUntil,
      digest: enterpriseDigest(content),
      content,
    };
    next.evidence.push(evidence);
    const checkIds = [];
    for (const requirement of requirements.filter((r) =>
      next.moduleIds.includes(r.moduleId),
    )) {
      const ruleId = "browser-" + entry.captureId + "-" + requirement.key;
      next.ruleVersions[requirement.moduleId + "/" + ruleId] = "1";
      const check = {
        moduleId: requirement.moduleId,
        ruleId,
        ruleVersion: "1",
        entityId: entry.entityId,
        scenarioId: entry.captureId,
        windowId: entry.captureId,
        status: "unknown",
        reason:
          (normalized.fresh ? "" : "Browser capture expired. ") +
          requirement.reason,
        evidenceIds: [evidence.evidenceId],
        dependencies: [evidence.evidenceId],
        policyIds: [],
        assessedAt: null,
        review: null,
      };
      check.checkId = checkIdentity(check);
      checkIds.push(check.checkId);
      next.checks.push(check);
      next.dataRequests.push(
        createDataRequest({
          customerId: next.customerId,
          runId: next.runId,
          requestedArtifact: ruleId,
          scopeKey: entry.entityId,
          windowId: entry.captureId,
          moduleIds: [requirement.moduleId],
          affectedCheckIds: [check.checkId],
          reason: check.reason,
          acceptedFormats: ["JSON", "Markdown", "Scoped trace/export"],
          leastPrivilegeAccess:
            "Read-only scoped evidence or redacted exports; never send passwords or reuse browser read permission for submission/payment.",
          exportInstructions: requirement.instructions,
          suggestedOwnerRole: requirement.owner,
          fallback:
            "Retain unknown status and list the missing scenario/data; continue independent checks. No missing input is a confirmed website defect.",
          priority: "medium",
        }),
      );
    }
    next.browserCaptures.push({
      captureId: entry.captureId,
      entityId: entry.entityId,
      environment: entry.environment,
      evidenceId: evidence.evidenceId,
      validUntil: normalized.validUntil,
      checkIds,
    });
  }
  next.declaredScope = {
    moduleIds: [
      ...new Set([...(next.declaredScope?.moduleIds ?? []), ...next.moduleIds]),
    ],
    checks: [
      ...new Map(
        [
          ...(next.declaredScope?.checks ?? []),
          ...next.checks.map(({ checkId, moduleId, entityId }) => ({
            checkId,
            moduleId,
            entityId,
          })),
        ].map((c) => [c.checkId, c]),
      ).values(),
    ],
  };
  next = reconcileEnterpriseChecks(previous, next, bundle.assessmentAt).run;
  const result = {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    observations: next.browserCaptures.flatMap((record) => {
      const evidence = next.evidence.find(
        (e) => e.evidenceId === record.evidenceId,
      );
      assert(
        evidence?.content?.captureId === record.captureId,
        "Invalid retained browser capture binding",
      );
      const normalized = normalizeBrowserCapture(evidence.content.source, {
        customerId: next.customerId,
        entityId: record.entityId,
        environment: record.environment,
        assessmentAt: bundle.assessmentAt,
      });
      return browserObservations(
        record,
        normalized.capture,
        evidence.evidenceId,
      ).map((o) => ({
        ...o,
        classification: normalized.fresh ? "current" : "historical",
      }));
    }),
    findings: [],
    assessmentAccepted: false,
    collectorAuthenticated: false,
  };
  await saveEnterpriseRun(outputDirectory, next);
  return result;
}

function browserObservations(entry, c, evidenceId) {
  const period = {
    from: c.startedAt.slice(0, 10),
    to: c.finishedAt.slice(0, 10),
  };
  const measures = [
    [
      "captured-records",
      "Captured browser records",
      c.observations.length,
      "records",
    ],
    [
      "blocked-requests",
      "Captured browser-gate denial records",
      c.observations.filter((o) => o.kind === "blocked").length,
      "records",
    ],
    [
      "transport-denials",
      "Retained transport denial records",
      c.transport.filter((e) => e.kind === "blocked").length,
      "records",
    ],
    ...(c.dom
      ? [
          [
            "viewport-width",
            "Captured document client width",
            c.dom.clientWidth,
            "CSS pixels",
          ],
          [
            "document-width",
            "Captured document scroll width",
            c.dom.scrollWidth,
            "CSS pixels",
          ],
        ]
      : []),
  ];
  return measures.map(([key, label, value, unit]) => ({
    observationId: "browser-" + entry.captureId + "-" + key,
    label,
    value,
    unit,
    precision: "exact",
    period,
    scopeDescription:
      (c.synthetic ? "Synthetic fixture. " : "") +
      "Supplied read-only capture " +
      entry.captureId +
      " for " +
      entry.entityId +
      " (" +
      entry.environment +
      ") at " +
      c.finishedAt +
      ". Restricted finite snapshot; counts/dimensions are not quality scores, business outcomes or complete module assessments.",
    evidenceIds: [evidenceId],
  }));
}
