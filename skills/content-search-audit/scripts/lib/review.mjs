import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";
import {
  loadAuditData,
  validateAuditData,
  safeArtifactPath,
} from "./validate.mjs";
import { publicUrlLabel } from "./inventory.mjs";
import { mergeReviewedChecks } from "./checks.mjs";
import { resolveRunOutput } from "./run.mjs";
import { writeRevision } from "./revision.mjs";
import { validateNewReviewTimes } from "./review-time.mjs";
import { recoverCollections } from "./extraction-recovery.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const publicFailureRequirements = new Map([
  [
    "aeo-answer-evidence",
    "Cite a visible-answer excerpt copied from extracted text linked to the cited page content.",
  ],
  [
    "aio-entity-consistency",
    "Cite a comparable public entity record from a separate source. A same-page derivative is insufficient.",
  ],
]);
/** Enumerate persisted public snapshots and open semantic checks for host review. */
export async function planPublicReview(sourceDirectory, offset = 0) {
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new Error("Public review offset must be a nonnegative integer");
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const audit = await loadAuditData(sourceDirectory);
  const validation = validateAuditData(audit, registry);
  if (!validation.valid)
    throw new Error(`Invalid source audit: ${validation.errors.join("; ")}`);
  if (audit.run.sourceMode !== "authorized-public-and-local-inventory")
    throw new Error("Public review planning requires a public collection run");

  const rules = new Map(
    registry.rules
      .filter((rule) => rule.mode === "semantic")
      .map((rule) => [rule.ruleId, rule]),
  );
  const targets = new Map(
    audit.inventory
      .filter((item) => item.uri && item.state === "pending")
      .map((item) => [
        item.itemId,
        {
          itemId: item.itemId,
          url: publicUrlLabel(item.uri),
          evidence: [],
          checks: [],
        },
      ]),
  );
  for (const record of audit.evidence) {
    const item = targets.get(record.itemId);
    if (item)
      item.evidence.push({
        evidenceId: record.evidenceId,
        kind: record.kind,
        artifact: record.artifact,
      });
  }
  for (const check of audit.checks) {
    const item = targets.get(check.itemId);
    const rule = rules.get(check.ruleId);
    if (!item || !rule || check.status !== "unknown") continue;
    item.checks.push({
      ruleId: check.ruleId,
      dimension: rule.dimension,
      requiredEvidence: rule.requiredEvidence,
      procedure: rule.procedure,
      method: rule.method,
      ...(publicFailureRequirements.has(rule.ruleId)
        ? { failureEvidence: publicFailureRequirements.get(rule.ruleId) }
        : {}),
    });
  }
  const readable = [...targets.values()].filter(
    (item) =>
      item.checks.length &&
      item.evidence.some((record) =>
        ["content", "extracted-text", "rendered-dom"].includes(record.kind),
      ),
  );
  const items = readable.slice(offset, offset + 10);
  return {
    runId: audit.run.runId,
    offset,
    totalReadableItems: readable.length,
    nextOffset:
      offset + items.length < readable.length ? offset + items.length : null,
    items,
  };
}

// These checks bind new public failures to attributed evidence. They do not
// determine whether a passage is an answer or whether its sources are authoritative.
function requirePublicFailureEvidence(review, item, evidenceById) {
  if (
    !item.uri ||
    review.status !== "fail" ||
    !publicFailureRequirements.has(review.ruleId) ||
    !Array.isArray(review.evidenceIds)
  )
    return;
  const references = review.evidenceIds
    .map((id) => evidenceById.get(id))
    .filter((record) => record?.itemId === item.itemId);
  const pageRecords = references.filter((record) => record.kind === "content");
  const pageIds = new Set(pageRecords.map((record) => record.evidenceId));

  function provenance(records) {
    const seen = new Set();
    const pending = [...records];
    const roots = [];
    while (pending.length) {
      const record = pending.pop();
      if (!record || seen.has(record.evidenceId)) continue;
      seen.add(record.evidenceId);
      if (!Array.isArray(record.sourceEvidenceIds)) continue;
      if (!record.sourceEvidenceIds.length) roots.push(record);
      else
        for (const id of record.sourceEvidenceIds)
          pending.push(evidenceById.get(id));
    }
    return { seen, roots };
  }

  if (review.ruleId === "aeo-answer-evidence") {
    const passage = references.some((record) => {
      if (
        record.kind !== "visible-answer" ||
        typeof record.value !== "string" ||
        !record.value.trim() ||
        record.sourceEvidenceIds?.length !== 1
      )
        return false;
      const source = evidenceById.get(record.sourceEvidenceIds[0]);
      const ancestors = provenance([source]).seen;
      return (
        source?.kind === "extracted-text" &&
        source.itemId === item.itemId &&
        Array.isArray(source.sourceEvidenceIds) &&
        source.sourceEvidenceIds.length === 1 &&
        pageIds.has(source.sourceEvidenceIds[0]) &&
        typeof source.value === "string" &&
        source.value.includes(record.value) &&
        [...ancestors].every(
          (id) => evidenceById.get(id)?.itemId === item.itemId,
        )
      );
    });
    if (!passage)
      throw new Error(
        "Public AEO failure requires a visible-answer excerpt bound to a single-page extraction from the cited page",
      );
    return;
  }

  function sourcePage(locator) {
    try {
      const url = new URL(locator);
      return ["http:", "https:"].includes(url.protocol)
        ? url.origin + url.pathname
        : null;
    } catch {
      return null;
    }
  }
  const page = provenance(pageRecords);
  const pageLocations = new Set([
    sourcePage(item.uri),
    ...pageRecords.map((record) => sourcePage(record.locator)),
    ...page.roots.map((record) => sourcePage(record.locator)),
  ]);
  const pageHashes = new Set(
    [...pageRecords, ...page.roots].map((record) => record.snapshotHash),
  );
  const distinct = references
    .filter((record) => record.kind === "entity-record")
    .some((record) =>
      provenance([record]).roots.some((source) => {
        const location = sourcePage(source.locator);
        return (
          location &&
          !page.seen.has(source.evidenceId) &&
          !pageLocations.has(location) &&
          !pageHashes.has(source.snapshotHash)
        );
      }),
    );
  if (!distinct)
    throw new Error(
      "Public AIO failure requires a separate public entity source; a same-page derivative is insufficient",
    );
}

/** Applies attributed snapshot assessments to a new immutable run revision. No live fetching. */
export async function prepareReviewedAudit(
  sourceDirectory,
  bundle,
  runDirectory,
) {
  const registry = JSON.parse(
    await readFile(new URL("../../rules/core.json", import.meta.url), "utf8"),
  );
  const audit = await loadAuditData(sourceDirectory);
  const initial = validateAuditData(audit, registry);
  if (!initial.valid)
    throw new Error(`Invalid source audit: ${initial.errors.join("; ")}`);
  const config = JSON.parse(
    await readFile(path.join(sourceDirectory, "config.json"), "utf8"),
  );
  if (hash(JSON.stringify(config)) !== audit.run.configHash)
    throw new Error("Source configuration hash mismatch");
  const { output } = await resolveRunOutput(config, runDirectory);
  const sourceRoot = await realpath(sourceDirectory);
  const relative = path.relative(sourceRoot, output);
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  )
    throw new Error("Review output must be outside source run");
  if (!bundle || !Array.isArray(bundle.reviews))
    throw new Error("Reviews array required");
  if (bundle.evidence !== undefined && !Array.isArray(bundle.evidence))
    throw new Error("Evidence array required");
  if (bundle.findings !== undefined && !Array.isArray(bundle.findings))
    throw new Error("Findings array required");
  if (
    bundle.collectionRecoveries !== undefined &&
    !Array.isArray(bundle.collectionRecoveries)
  )
    throw new Error("Collection recoveries array required");
  if (
    bundle.artifacts !== undefined &&
    (!bundle.artifacts ||
      typeof bundle.artifacts !== "object" ||
      Array.isArray(bundle.artifacts))
  )
    throw new Error("Artifact map required");
  const reviewAcceptedAt = validateNewReviewTimes(
    [...bundle.reviews, ...(bundle.collectionRecoveries ?? [])],
    bundle.evidence ?? [],
  );
  for (const [name, value] of Object.entries(bundle.artifacts ?? {})) {
    if (
      !safeArtifactPath(name) ||
      !name.startsWith("evidence/") ||
      typeof value !== "string" ||
      Object.hasOwn(audit.artifacts, name)
    )
      throw new Error("Invalid or colliding review artifact");
    audit.artifacts[name] = value;
  }
  audit.evidence.push(...(bundle.evidence ?? []));
  const recovered = await recoverCollections(
    audit,
    config,
    bundle.collectionRecoveries,
  );
  const itemIds = new Set(audit.inventory.map((item) => item.itemId));
  for (const review of bundle.reviews)
    if (!review || !itemIds.has(review.itemId))
      throw new Error("Unknown review item");
  const evidenceById = new Map(
    audit.evidence.map((record) => [record.evidenceId, record]),
  );
  function dependencies(ids, seen = new Set()) {
    const result = new Set();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const record = evidenceById.get(id);
      if (!record) throw new Error("Missing evidence dependency");
      result.add(record.itemId);
      for (const itemId of dependencies(record.sourceEvidenceIds ?? [], seen))
        result.add(itemId);
    }
    return result;
  }
  const findingsToReconcile = [];
  for (const item of audit.inventory) {
    const reviews = bundle.reviews.filter(
      (review) => review.itemId === item.itemId,
    );
    if (audit.run.sourceMode === "authorized-public-and-local-inventory")
      for (const review of reviews)
        requirePublicFailureEvidence(review, item, evidenceById);
    // Refresh evidence availability for deterministic rules and unattributed
    // semantic unknowns. This updates stale missing-evidence reasons without
    // resolving semantics or replacing an explicit reviewer judgment.
    const refreshedIds = new Set(
      registry.rules
        .filter(
          (rule) =>
            (rule.mode !== "semantic" ||
              audit.checks.some(
                (check) =>
                  check.itemId === item.itemId &&
                  check.ruleId === rule.ruleId &&
                  check.status === "unknown" &&
                  !check.reviewer,
              )) &&
            item.requiredRuleIds.includes(rule.ruleId) &&
            ((bundle.evidence ?? []).some(
              (record) =>
                record?.itemId === item.itemId &&
                rule.requiredEvidence.includes(record.kind),
            ) ||
              (audit.checks.some(
                (check) =>
                  check.itemId === item.itemId &&
                  check.ruleId === rule.ruleId &&
                  check.status === "unknown" &&
                  !check.reviewer,
              ) &&
                rule.requiredEvidence.every((kind) =>
                  audit.evidence.some(
                    (record) =>
                      record.itemId === item.itemId && record.kind === kind,
                  ),
                ))),
        )
        .map((rule) => rule.ruleId),
    );
    if (!reviews.length && !refreshedIds.size && !recovered.has(item.itemId))
      continue;
    const revised = mergeReviewedChecks(
      item,
      audit.evidence,
      registry,
      reviews,
    );
    const reviewedIds = new Set(reviews.map((review) => review.ruleId));
    audit.checks = audit.checks.map((check) => {
      if (
        check.itemId !== item.itemId ||
        (!reviewedIds.has(check.ruleId) && !refreshedIds.has(check.ruleId))
      )
        return check;
      const next = revised.find(
        (candidate) => candidate.ruleId === check.ruleId,
      );
      next.dependencies = [
        ...new Set([item.itemId, ...dependencies(next.evidenceIds)]),
      ].sort();
      if (
        refreshedIds.has(check.ruleId) &&
        check.status === "fail" &&
        next.status !== "fail"
      )
        findingsToReconcile.push({ itemId: item.itemId, ruleId: check.ruleId });
      return next;
    });
    if (["pending", "audited"].includes(item.state)) {
      const finished = item.requiredRuleIds.every((id) =>
        audit.checks.some(
          (check) =>
            check.itemId === item.itemId &&
            check.ruleId === id &&
            check.status !== "unknown",
        ),
      );
      item.state = finished ? "audited" : "pending";
      item.reason = finished
        ? "Required snapshot checks reviewed; collection limitations still apply"
        : "Snapshot review incomplete";
    }
  }
  // Findings are a complete replacement when supplied, so corrected findings can be withdrawn.
  if (bundle.findings !== undefined) audit.findings = bundle.findings;
  for (const { itemId, ruleId } of findingsToReconcile)
    if (
      audit.findings.some(
        (finding) =>
          finding.affectedItemIds?.includes(itemId) &&
          finding.ruleIds?.includes(ruleId),
      )
    )
      throw new Error(
        "Reconcile findings for a deterministic failure changed by new evidence",
      );
  audit.run = {
    ...audit.run,
    parentRunId: audit.run.runId,
    reviewAcceptedAt,
    runId: randomUUID(),
    status: "partial",
    updatedAt: new Date().toISOString(),
    checks: audit.checks,
  };
  const validation = validateAuditData(audit, registry);
  if (!validation.valid)
    throw new Error(`Invalid reviewed audit: ${validation.errors.join("; ")}`);
  // Reject unused added artifacts; otherwise a malformed attachment could bypass loading limits.
  for (const name of Object.keys(bundle.artifacts ?? {}))
    if (!audit.evidence.some((record) => record.artifact === name))
      throw new Error("Unused review artifact");
  if (validation.completionAllowed) audit.run.status = "complete";
  return { audit, config, registry, output };
}

export async function reviewAudit(sourceDirectory, bundle, runDirectory) {
  const { audit, config, registry, output } = await prepareReviewedAudit(
    sourceDirectory,
    bundle,
    runDirectory,
  );
  return writeRevision(audit, config, registry, output);
}
