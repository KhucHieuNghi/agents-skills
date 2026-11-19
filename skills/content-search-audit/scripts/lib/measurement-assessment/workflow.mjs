import {
  dispositionRecords,
  createDispositionReviewRequest,
  validateDispositionOverlay,
  resliceDispositionRequests,
} from "./disposition-state.mjs";
import { readFile, readdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import {
  enterpriseDigest,
  stableJson,
  checkIdentity,
  loadEnterpriseRun,
  saveEnterpriseRun,
  validateEnterpriseRun,
  reconcileEnterpriseChecks,
} from "../enterprise-state.mjs";
import { forkEnterpriseEvidenceRun } from "../enterprise-provider-workflow.mjs";
import { createDataRequest } from "../data-requests.mjs";
import { evaluateMeasurementConfiguration } from "./config.mjs";
import { evaluateGtmDependencies } from "./dependencies.mjs";
import { evaluateBusinessMapping } from "./business-mapping.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const eq = (a, b) => stableJson(a) === stableJson(b);
const sameIds = (a, b) =>
  Array.isArray(a) &&
  new Set(a).size === a.length &&
  eq([...a].sort(), [...b].sort());
function exact(value, keys, label) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${label}`,
  );
}
const fingerprint = [];
for (const directory of ["./", "../"]) {
  for (const file of (await readdir(new URL(directory, import.meta.url)))
    .filter((f) => f.endsWith(".mjs"))
    .sort())
    fingerprint.push([
      directory + file,
      await readFile(new URL(directory + file, import.meta.url), "utf8"),
    ]);
}
const evaluatorDigest = enterpriseDigest(fingerprint);
function projection(run, entityId) {
  return {
    schemaFamily: run.schemaFamily,
    schemaVersion: run.schemaVersion,
    customerId: run.customerId,
    runId: run.runId,
    operationMode: run.operationMode,
    inventoryMode: run.inventoryMode,
    assessmentAt: run.assessmentAt,
    profileVersions: globalThis.structuredClone(run.profileVersions),
    ruleVersions: {},
    policyVersions: {},
    entities: globalThis.structuredClone(
      run.entities.filter((e) => e.entityId === entityId),
    ),
    moduleIds: [...run.moduleIds],
    declaredScope: { moduleIds: [...run.moduleIds], checks: [] },
    evidence: [],
    checks: [],
    dataRequests: [],
  };
}
function scope(entry, runContext) {
  const { maxAgeSeconds, ...dimensions } = entry.context;
  assert(
    Number.isInteger(maxAgeSeconds),
    "Invalid measurement freshness policy",
  );
  return enterpriseDigest([
    entry.kind,
    dimensions,
    runContext.customerId,
    runContext.entities.map(({ runId, ...e }) => {
      assert(typeof runId === "string", "Invalid entity run");
      return e;
    }),
    runContext.profileVersions,
  ]);
}
function derive(entry, runContext) {
  assert(
    /^[a-z][a-z0-9-]{0,63}$/.test(entry?.evaluationId),
    "Invalid measurement evaluation ID",
  );
  assert(
    ["configuration", "dependencies", "business-mapping"].includes(entry.kind),
    "Invalid measurement kind",
  );
  exact(
    entry,
    [
      "evaluationId",
      "kind",
      "context",
      "input",
      ...(entry.kind === "dependencies"
        ? ["builtinTriggerInventory"]
        : entry.kind === "business-mapping"
          ? ["contract", "mappingSource"]
          : ["contract"]),
    ],
    "measurement entry",
  );
  exact(
    entry.context,
    ["entityId", "resource", "versionId", "windowId", "maxAgeSeconds"],
    "measurement context",
  );
  const context = { ...entry.context, run: runContext };
  const args = { input: entry.input, context };
  const result =
    entry.kind === "configuration"
      ? evaluateMeasurementConfiguration({
          ...args,
          kind: entry.context.versionId === null ? "ga4-config" : "gtm-version",
          contract: entry.contract,
        })
      : entry.kind === "dependencies"
        ? evaluateGtmDependencies({
            ...args,
            builtinTriggerInventory: entry.builtinTriggerInventory,
          })
        : evaluateBusinessMapping({
            ...args,
            contract: entry.contract,
            mappingSource: entry.mappingSource,
          });
  const moduleId =
    entry.kind === "dependencies" ||
    (entry.kind === "configuration" && entry.context.versionId !== null)
      ? "tracking"
      : "analytics";
  assert(
    runContext.moduleIds.includes(moduleId),
    "Measurement module outside scope",
  );
  const scopeDigest = scope(entry, runContext),
    policyId = `measurement-assessment-${entry.evaluationId}`;
  const policyDigest = enterpriseDigest([
    scopeDigest,
    entry.context.maxAgeSeconds,
    entry.contract ?? null,
    entry.builtinTriggerInventory ?? null,
    evaluatorDigest,
  ]);
  const content = { entry, runContext, evaluatorDigest };
  const digest = enterpriseDigest(content),
    evidenceId = `measurement-assessment-${digest}`;
  const assessment = Date.parse(runContext.assessmentAt);
  // Acquisition is a stable obligation, independent of configuration correctness.
  // Missing-contract rows already come from the pure evaluator; keep their identity.
  const assessedRows = [...result.checks],
    pendingRequests = [...result.dataRequests];
  if (entry.kind !== "dependencies" && entry.contract !== null) {
    const expired = Date.parse(entry.contract.validUntil) <= assessment;
    const ruleId =
      entry.kind === "configuration"
        ? "measurement-contract-required"
        : "business-contract-required";
    const presence = {
      ...(entry.kind === "configuration"
        ? { expectationId: null }
        : { checkId: "contract-presence", requirementId: null }),
      ruleId,
      ruleVersion: "1",
      purpose: "contract-acquisition",
      contractDigest: result.contractDigest,
      status: expired ? "unknown" : "pass",
      reason: expired
        ? entry.kind === "configuration"
          ? "expired-measurement-contract"
          : "expired-business-contract"
        : "current-contract-supplied-not-authenticated",
    };
    assessedRows.unshift(presence);
    if (expired)
      pendingRequests.push({
        expectationId: null,
        checkIds: ["contract-presence"],
        ruleId,
        reason: presence.reason,
        neededArtifact:
          entry.kind === "business-mapping"
            ? "owner-business-contract"
            : "owner-measurement-contract",
        ownerRole: entry.contract.ownerRole,
        acceptedFormats: [
          "Renewed owner contract JSON for this exact customer/resource",
        ],
        instructions:
          "Obtain a current scoped owner contract; receipt of it does not authenticate its author or establish configuration correctness.",
        fallback: "Keep acquisition unknown and continue independent checks.",
      });
  }
  const snapshotExpiry =
    Date.parse(entry.input.payload.capturedAt) +
    entry.context.maxAgeSeconds * 1000;
  function expiry(row) {
    const policy = entry.contract
      ? Date.parse(entry.contract.validUntil)
      : Infinity;
    if (
      ["measurement-contract-required", "business-contract-required"].includes(
        row.ruleId,
      )
    )
      return entry.contract ? policy : assessment;
    if (entry.kind === "business-mapping") {
      const mapping = entry.mappingSource
        ? Date.parse(entry.mappingSource.capturedAt) +
          entry.context.maxAgeSeconds * 1000
        : assessment;
      return Math.min(
        policy,
        mapping,
        row.ruleId === "business-key-event-config" ? snapshotExpiry : Infinity,
      );
    }
    if (entry.kind === "dependencies")
      return Math.min(
        snapshotExpiry,
        row.targetKind === "trigger" &&
          ["supplied-builtin-reference", "missing-reference"].includes(
            row.reason,
          )
          ? Date.parse(
              entry.builtinTriggerInventory?.validUntil ??
                runContext.assessmentAt,
            )
          : Infinity,
      );
    return Math.min(snapshotExpiry, policy);
  }
  const evidence = {
    evidenceId,
    customerId: runContext.customerId,
    runId: runContext.runId,
    entityId: entry.context.entityId,
    source: `${result.synthetic ? "synthetic-" : ""}supplied-measurement-${entry.kind}`,
    artifactType: "measurement-assessment-evaluation",
    scopeKey: entry.context.entityId,
    windowId: entry.context.windowId,
    observedAt: runContext.assessmentAt,
    validUntil: runContext.assessmentAt,
    digest,
    content,
  };
  const rowEvidence = [],
    checks = [],
    rowMap = new Map();
  for (const row of assessedRows) {
    const identity =
      entry.kind === "configuration"
        ? row.expectationId
        : entry.kind === "business-mapping"
          ? [row.requirementId, row.ruleId]
          : row.checkId;
    const ruleId = `measurement-assessment-${entry.evaluationId}-${enterpriseDigest(identity)}`;
    const rowContent = {
      evaluationEvidenceId: evidenceId,
      row,
      evaluatorDigest,
    };
    const bound = {
      ...evidence,
      evidenceId: `measurement-assessment-check-${enterpriseDigest(rowContent)}`,
      digest: enterpriseDigest(rowContent),
      content: rowContent,
      validUntil: new Date(Math.max(assessment, expiry(row))).toISOString(),
    };
    const check = {
      moduleId,
      ruleId,
      ruleVersion: "1",
      entityId: entry.context.entityId,
      scenarioId: scopeDigest,
      windowId: entry.context.windowId,
      status: row.status,
      reason: row.reason,
      evidenceIds: [bound.evidenceId],
      dependencies: [bound.evidenceId],
      policyIds: [policyId],
      assessedAt: ["pass", "fail"].includes(row.status)
        ? runContext.assessmentAt
        : null,
      review: null,
    };
    check.checkId = checkIdentity(check);
    checks.push(check);
    rowEvidence.push(bound);
    rowMap.set(row.checkId ?? row.expectationId, check.checkId);
  }
  assert(
    new Set(checks.map((c) => c.checkId)).size === checks.length,
    "Duplicate measurement row identity",
  );
  const requests = [];
  for (const pending of pendingRequests) {
    const request =
      entry.kind === "configuration" &&
      ["missing-measurement-contract", "expired-measurement-contract"].includes(
        pending.reason,
      )
        ? {
            ...pending,
            neededArtifact: "owner-measurement-contract",
            acceptedFormats: ["Owner-confirmed configuration contract JSON"],
          }
        : pending;
    const ids =
      entry.kind === "configuration"
        ? [rowMap.get(request.expectationId)]
        : request.checkIds.map((id) => rowMap.get(id));
    assert(ids.length && ids.every(Boolean), "Unbound measurement request");
    const artifact = `measurement-assessment-${entry.evaluationId}-${enterpriseDigest(request.neededArtifact ?? [request.ruleId, request.reason])}`;
    const existing = requests.find((r) => r.requestedArtifact === artifact);
    if (existing) {
      existing.affectedCheckIds = [
        ...new Set([...existing.affectedCheckIds, ...ids]),
      ];
      continue;
    }
    requests.push(
      createDataRequest({
        customerId: runContext.customerId,
        runId: runContext.runId,
        requestedArtifact: artifact,
        scopeKey: entry.context.entityId,
        windowId: entry.context.windowId,
        moduleIds: [moduleId],
        affectedCheckIds: ids,
        reason: request.reason ?? request.reasons.join("; "),
        acceptedFormats: request.acceptedFormats ?? [
          "Scoped configuration JSON",
        ],
        leastPrivilegeAccess:
          "Read-only exports and owner definitions; do not send credentials or personal transaction data. No website mutation is authorized.",
        exportInstructions: request.instructions,
        suggestedOwnerRole: request.ownerRole,
        fallback: request.fallback,
        priority: "medium",
      }),
    );
  }
  assert(
    sameIds(
      requests.flatMap((r) => r.affectedCheckIds),
      checks.filter((c) => c.status === "unknown").map((c) => c.checkId),
    ),
    "Measurement unknown/request coverage mismatch",
  );
  return {
    entry,
    scopeDigest,
    policyId,
    policyDigest,
    evidence: [evidence, ...rowEvidence],
    checks,
    requests,
    index: {
      evaluationId: entry.evaluationId,
      kind: entry.kind,
      scopeDigest,
      evidenceId,
      historyEvidenceIds: [],
      checkIds: checks.map((c) => c.checkId),
      dataRequestArtifacts: requests.map((r) => r.requestedArtifact),
    },
  };
}
function replayEvidence(run, evidenceId) {
  const evidence = run.evidence.find((e) => e.evidenceId === evidenceId);
  assert(
    evidence?.artifactType === "measurement-assessment-evaluation" &&
      evidence.content?.evaluatorDigest === evaluatorDigest,
    "Unsupported measurement evaluator evidence",
  );
  const historical = projection(run, evidence.entityId);
  historical.runId = evidence.runId;
  historical.assessmentAt = evidence.observedAt;
  historical.entities = historical.entities.map((e) => ({
    ...e,
    runId: evidence.runId,
  }));
  assert(
    eq(evidence.content.runContext, historical),
    "Measurement historical context mismatch",
  );
  const derived = derive(evidence.content.entry, historical);
  for (const expected of derived.evidence)
    assert(
      eq(
        run.evidence.find((e) => e.evidenceId === expected.evidenceId),
        expected,
      ),
      "Measurement row evidence mismatch",
    );
  return derived;
}
function retainSuperseded(derived, historyEvidenceIds, run) {
  assert(
    Array.isArray(historyEvidenceIds) &&
      historyEvidenceIds.length <= 100 &&
      new Set(historyEvidenceIds).size === historyEvidenceIds.length,
    "Invalid measurement transition history",
  );
  const retained = new Map();
  const activeIds = new Set(derived.checks.map((c) => c.checkId));
  for (const id of historyEvidenceIds) {
    const historical = replayEvidence(run, id);
    assert(
      historical.scopeDigest === derived.scopeDigest &&
        historical.entry.evaluationId === derived.entry.evaluationId,
      "Measurement transition scope mismatch",
    );
    for (const check of historical.checks)
      if (!activeIds.has(check.checkId)) {
        retained.set(check.checkId, {
          ...check,
          status: "unknown",
          reason: "superseded-measurement-check-needs-review",
          assessedAt: null,
          review: null,
        });
        assert(
          activeIds.size + retained.size <= 10000,
          "Measurement check budget exceeded",
        );
      }
  }
  const checks = [...retained.values()];
  if (checks.length) {
    const current = derived.evidence[0];
    derived.requests.push(
      createDataRequest({
        customerId: current.customerId,
        runId: current.runId,
        requestedArtifact: `measurement-assessment-${derived.entry.evaluationId}-scope-transition`,
        scopeKey: current.entityId,
        windowId: current.windowId,
        moduleIds: [checks[0].moduleId],
        affectedCheckIds: checks.map((c) => c.checkId),
        reason:
          "Previously declared checks were superseded by new supplied evidence; review their disposition.",
        acceptedFormats: [
          "Scoped migration review with prior and replacement check IDs",
        ],
        leastPrivilegeAccess:
          "Read-only review; no mutation permission or credentials.",
        exportInstructions:
          "Compare retained historical evidence with the current checks. Record which prior obligations are replaced and which remain required; do not treat disappearance as a pass.",
        suggestedOwnerRole: "measurement-owner",
        fallback:
          "Keep prior coverage unknown and continue assessing current checks.",
        priority: "medium",
      }),
    );
  }
  derived.checks.push(...checks);
  derived.index.historyEvidenceIds = [...historyEvidenceIds];
  derived.index.checkIds = derived.checks.map((c) => c.checkId);
  derived.index.dataRequestArtifacts = derived.requests.map(
    (r) => r.requestedArtifact,
  );
  return derived;
}
function validateIndex(run) {
  const records = run.measurementEvaluations ?? [];
  const dispositions = dispositionRecords(run);
  assert(
    Array.isArray(records) && records.length <= 10,
    "Invalid measurement index",
  );
  const ids = new Set(),
    scopes = new Set(),
    ownedChecks = [],
    ownedRequests = [];
  for (const record of records) {
    exact(
      record,
      [
        "evaluationId",
        "kind",
        "scopeDigest",
        "evidenceId",
        "historyEvidenceIds",
        "checkIds",
        "dataRequestArtifacts",
      ],
      "measurement index record",
    );
    assert(
      !ids.has(record.evaluationId) && !scopes.has(record.scopeDigest),
      "Duplicate measurement index scope",
    );
    ids.add(record.evaluationId);
    scopes.add(record.scopeDigest);
    const evidence = run.evidence.find(
      (e) => e.evidenceId === record.evidenceId,
    );
    assert(
      evidence?.artifactType === "measurement-assessment-evaluation" &&
        evidence.content?.evaluatorDigest === evaluatorDigest,
      "Unsupported measurement evaluator evidence",
    );
    const historical = globalThis.structuredClone(
      projection(run, evidence.entityId),
    );
    historical.runId = evidence.runId;
    historical.assessmentAt = evidence.observedAt;
    historical.entities = historical.entities.map((e) => ({
      ...e,
      runId: evidence.runId,
    }));
    assert(
      eq(evidence.content.runContext, historical),
      "Measurement historical context mismatch",
    );
    const derived = retainSuperseded(
      replayEvidence(run, record.evidenceId),
      record.historyEvidenceIds,
      run,
    );
    resliceDispositionRequests(derived, run);
    assert(eq(record, derived.index), "Measurement index ownership mismatch");
    assert(
      eq(evidence, derived.evidence[0]),
      "Measurement evaluation evidence mismatch",
    );
    for (const expected of derived.evidence)
      assert(
        eq(
          run.evidence.find((e) => e.evidenceId === expected.evidenceId),
          expected,
        ),
        "Measurement row evidence mismatch",
      );
    assert(
      run.policyVersions[derived.policyId] === derived.policyDigest,
      "Measurement policy mismatch",
    );
    for (const expected of derived.checks) {
      let actual = run.checks.find((c) => c.checkId === expected.checkId);
      const disposition = dispositions.find(
        (item) => item.checkId === expected.checkId,
      );
      if (disposition) {
        const superseded =
          expected.reason === "superseded-measurement-check-needs-review";
        for (const proofId of [
          ...disposition.historyEvidenceIds,
          disposition.evidenceId,
        ]) {
          const proofBaseline = run.evidence.find(
            (e) => e.evidenceId === proofId,
          )?.content?.baselineCheck;
          const historical = record.historyEvidenceIds
            .flatMap((id) => replayEvidence(run, id).checks)
            .find(
              (check) =>
                check.checkId === expected.checkId &&
                eq(check.dependencies, proofBaseline?.dependencies),
            );
          assert(historical, "Missing historical disposition baseline");
          const baseline = {
            ...historical,
            status: "unknown",
            reason: "superseded-measurement-check-needs-review",
            assessedAt: null,
            review: null,
          };
          const normalized = validateDispositionOverlay(
            run,
            { ...disposition, evidenceId: proofId },
            baseline,
            replayEvidence(run, record.evidenceId),
            evaluatorDigest,
            expected,
            superseded,
            proofId !== disposition.evidenceId,
          );
          if (proofId === disposition.evidenceId) actual = normalized;
        }
      }
      assert(actual, "Measurement check ownership mismatch");
      const { review, ...withoutReview } = actual;
      assert(
        review === null || typeof review === "object",
        "Invalid measurement review",
      );
      const normalized =
        actual.status === "unknown" &&
        actual.assessedAt === null &&
        actual.review === null
          ? {
              ...withoutReview,
              status: expected.status,
              reason: expected.reason,
              assessedAt: expected.assessedAt,
            }
          : withoutReview;
      assert(
        eq(
          normalized,
          (({ review, ...rest }) => {
            assert(review === null, "Unexpected derived review");
            return rest;
          })(expected),
        ),
        "Measurement cached check mismatch",
      );
    }
    for (const expected of derived.requests) {
      const actual = run.dataRequests.find(
        (r) => r.requestedArtifact === expected.requestedArtifact,
      );
      assert(actual, "Measurement request ownership mismatch");
      const normalized = {
        ...actual,
        runId: historical.runId,
        id: expected.id,
        status: expected.status,
        evidenceIds: [],
        evidenceDigests: {},
        reason: expected.reason,
      };
      assert(eq(normalized, expected), "Measurement request binding mismatch");
    }
    ownedChecks.push(...record.checkIds);
    ownedRequests.push(...record.dataRequestArtifacts);
  }
  for (const disposition of dispositions) {
    assert(
      records.some(
        (record) =>
          record.evaluationId === disposition.evaluationId &&
          record.checkIds.includes(disposition.checkId),
      ),
      "Unindexed disposition",
    );
    const request = run.dataRequests.find(
      (r) =>
        r.requestedArtifact === "measurement-disposition" &&
        r.scopeKey === disposition.checkId,
    );
    assert(
      request &&
        request.revalidateOnCheckInvalidation === true &&
        eq(request.affectedCheckIds, [disposition.checkId]) &&
        request.scopeKey === disposition.checkId,
      "Missing durable disposition request",
    );
    const check = run.checks.find((c) => c.checkId === disposition.checkId);
    const expectedRequest = createDispositionReviewRequest(run, check);
    const normalizedRequest = {
      ...request,
      status: expectedRequest.status,
      reason: expectedRequest.reason,
      evidenceIds: [],
      evidenceDigests: {},
    };
    delete normalizedRequest.invalidatedEvidenceDigests;
    assert(
      eq(normalizedRequest, expectedRequest),
      "Disposition request descriptor mismatch",
    );
    if (check.status === "not-applicable")
      assert(
        request.status === "provided" &&
          eq(request.evidenceIds, [disposition.evidenceId]),
        "Active disposition needs bound provided review",
      );
  }
  assert(
    sameIds(
      ownedChecks,
      run.checks
        .filter((c) => c.ruleId.startsWith("measurement-assessment-"))
        .map((c) => c.checkId),
    ),
    "Unindexed measurement check ownership",
  );
  assert(
    sameIds(
      ownedRequests,
      run.dataRequests
        .filter((r) =>
          r.requestedArtifact.startsWith("measurement-assessment-"),
        )
        .map((r) => r.requestedArtifact),
    ),
    "Unindexed measurement request ownership",
  );
  return records;
}
/** Read-only, replay-validated input for disposition planning. Never an approval. */
export function inspectEnterpriseMeasurement(run) {
  validateEnterpriseRun(run);
  const records = validateIndex(run);
  return {
    sourceRunDigest: enterpriseDigest(run),
    evaluatorDigest,
    evaluations: records.map((record) => {
      const current = replayEvidence(run, record.evidenceId);
      const active = new Set(current.checks.map((check) => check.checkId));
      return {
        evaluationId: record.evaluationId,
        scopeDigest: record.scopeDigest,
        evidenceId: record.evidenceId,
        activeCheckIds: [...active],
        replacementCheckIds: current.checks
          .filter((check) => {
            const row = current.evidence.find((e) =>
              check.evidenceIds.includes(e.evidenceId),
            )?.content?.row;
            return (
              row &&
              row.purpose !== "contract-acquisition" &&
              ![
                "measurement-contract-required",
                "business-contract-required",
              ].includes(row.ruleId)
            );
          })
          .map((check) => check.checkId),
        supersededCheckIds: record.checkIds.filter((id) => !active.has(id)),
        supersededChecks: retainSuperseded(
          replayEvidence(run, record.evidenceId),
          record.historyEvidenceIds,
          run,
        ).checks.filter((check) => !active.has(check.checkId)),
      };
    }),
  };
}
export async function evaluateEnterpriseMeasurement(
  sourceDirectory,
  bundle,
  outputDirectory,
) {
  const previous = await loadEnterpriseRun(sourceDirectory),
    prior = validateIndex(previous);
  assert(
    Buffer.byteLength(stableJson(bundle)) <= 8 * 1024 * 1024,
    "Measurement bundle byte budget exceeded",
  );
  let next = forkEnterpriseEvidenceRun(previous, bundle, "evaluations");
  const disposed = dispositionRecords(previous);
  if (disposed.length)
    next = reconcileEnterpriseChecks(previous, next, next.assessmentAt, {
      invalidateCheckIds: disposed.map((r) => r.checkId),
    }).run;
  assert(
    bundle.evaluations.length <= 10,
    "Measurement evaluation count exceeded",
  );
  const entries = [
    ...bundle.evaluations,
    ...prior
      .filter(
        (p) =>
          !bundle.evaluations.some((e) => e.evaluationId === p.evaluationId),
      )
      .map(
        (p) =>
          previous.evidence.find((e) => e.evidenceId === p.evidenceId).content
            .entry,
      ),
  ];
  assert(
    entries.length <= 10 &&
      new Set(entries.map((e) => e.evaluationId)).size === entries.length,
    "Duplicate/excess measurement evaluations",
  );
  const replacements = entries.map((entry) =>
    derive(entry, projection(next, entry.context.entityId)),
  );
  assert(
    replacements.reduce((n, r) => n + r.checks.length, 0) <= 10000,
    "Measurement check budget exceeded",
  );
  assert(
    new Set(replacements.map((r) => r.scopeDigest)).size ===
      replacements.length,
    "Duplicate measurement scope",
  );
  for (const replacement of replacements) {
    const old = prior.find(
      (p) => p.evaluationId === replacement.entry.evaluationId,
    );
    assert(
      !old || old.scopeDigest === replacement.scopeDigest,
      "Cannot rebind measurement scope",
    );
    const history = [...(old?.historyEvidenceIds ?? [])];
    if (old) {
      const previousRows = replayEvidence(previous, old.evidenceId).checks;
      if (
        previousRows.some(
          (c) => !replacement.index.checkIds.includes(c.checkId),
        ) &&
        !history.includes(old.evidenceId)
      )
        history.push(old.evidenceId);
    }
    retainSuperseded(replacement, history, previous);
    resliceDispositionRequests(replacement, previous);
  }
  assert(
    replacements.reduce((n, r) => n + r.checks.length, 0) <= 10000,
    "Measurement check budget exceeded",
  );
  const oldCheckIds = new Set(prior.flatMap((p) => p.checkIds)),
    oldArtifacts = new Set(prior.flatMap((p) => p.dataRequestArtifacts));
  const oldRequests = next.dataRequests.filter((r) =>
    oldArtifacts.has(r.requestedArtifact),
  );
  next.checks = next.checks.filter((c) => !oldCheckIds.has(c.checkId));
  next.dataRequests = next.dataRequests.filter(
    (r) => !oldArtifacts.has(r.requestedArtifact),
  );
  for (const replacement of replacements) {
    next.policyVersions[replacement.policyId] = replacement.policyDigest;
    for (const check of replacement.checks)
      next.ruleVersions[`${check.moduleId}/${check.ruleId}`] =
        check.ruleVersion;
    next.checks.push(...replacement.checks);
    for (const evidence of replacement.evidence)
      if (!next.evidence.some((e) => e.evidenceId === evidence.evidenceId))
        next.evidence.push(evidence);
    for (const request of replacement.requests) {
      const old = oldRequests.find(
        (r) => r.requestedArtifact === request.requestedArtifact,
      );
      if (old) {
        const normalized = {
          ...old,
          status: request.status,
          evidenceIds: [],
          evidenceDigests: {},
          reason: request.reason,
        };
        if (eq(normalized, request))
          for (const field of [
            "status",
            "reason",
            "evidenceIds",
            "evidenceDigests",
          ])
            request[field] = globalThis.structuredClone(old[field]);
      }
      next.dataRequests.push(request);
    }
  }
  next.measurementEvaluations = replacements.map((r) => r.index);
  const previousDigest = enterpriseDigest(previous);
  const currentChecks = new Map(next.checks.map((c) => [c.checkId, c]));
  const archived = new Set(
    next.history
      .filter(
        (h) =>
          h.sourceRunId === previous.runId && h.sourceDigest === previousDigest,
      )
      .map((h) => enterpriseDigest(h.check)),
  );
  for (const check of previous.checks.filter((c) =>
    oldCheckIds.has(c.checkId),
  )) {
    if (
      !eq(check, currentChecks.get(check.checkId)) &&
      !archived.has(enterpriseDigest(check))
    )
      next.history.push({
        customerId: previous.customerId,
        sourceRunId: previous.runId,
        sourceDigest: previousDigest,
        check: globalThis.structuredClone(check),
        invalidatedAt: next.assessmentAt,
        reasons: ["measurement-reassessed"],
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
  validateEnterpriseRun(next);
  const findings = replacements.flatMap((r) =>
    r.checks
      .filter((c) => c.status === "fail")
      .map((c) => ({
        findingId: `measurement-assessment-${c.checkId}`,
        checkId: c.checkId,
        evidenceIds: c.evidenceIds,
        severity: "medium",
        confidence: "low",
        title: "Supplied measurement configuration mismatch",
        description: `${r.entry.kind}: ${c.reason}. This is a supplied-evidence assessment pending independent review.`,
        businessImpact:
          "A declared configuration or mapping requirement is not met by supplied evidence; actual delivery, accepted outcomes and financial impact are unverified.",
        recommendation:
          "Confirm the owner requirement and original source, then investigate the affected configuration or mapping before authorizing a change.",
        verification:
          "Acquire fresh scoped evidence after an authorized change, rerun the assessment and independently review the result; do not infer runtime or business success from configuration alone.",
      })),
  );
  assert(
    Buffer.byteLength(stableJson(next)) < 32 * 1024 * 1024,
    "Measurement run byte budget exceeded",
  );
  inspectEnterpriseMeasurement(next);
  await saveEnterpriseRun(outputDirectory, next);
  return {
    directory: outputDirectory,
    runId: next.runId,
    digest: enterpriseDigest(next),
    findings,
    assessmentAccepted: false,
    providerAuthenticated: false,
    contractAuthenticated: false,
    runtimeVerified: false,
    businessOutcomeVerified: false,
  };
}
