import { hasRunContract, validateRunContract } from "./run-contract.mjs";
import { resolveActionProposal } from "./action-proposal.mjs";
import { Buffer } from "node:buffer";
import { constants } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import {
  createCheckPlan,
  evaluateChecks,
  mergeReviewedChecks,
  validateRegistry,
} from "./checks.mjs";
import { computeCoverage } from "./coverage.mjs";
import { validateCollectionRecoveryReceipts } from "./extraction-recovery.mjs";
const text = (value) => typeof value === "string" && value.trim().length > 0;
const strings = (value) =>
  Array.isArray(value) &&
  value.every(text) &&
  new Set(value).size === value.length;
const sorted = (value) => [...value].sort();
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  return value;
}
const equal = (left, right) =>
  JSON.stringify(stable(left)) === JSON.stringify(stable(right));
export function safeArtifactPath(value) {
  return (
    text(value) &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    !value.startsWith("/") &&
    !/^[a-z]+:/i.test(value) &&
    !value.split("/").some((part) => !part || part === "." || part === "..")
  );
}
/** Structural and artifact-integrity gate. The caller supplies the trusted package
 * registry, never the run's potentially reduced registry. Semantic truth requires review. */
export function validateAuditData(audit, registry) {
  const errors = [];
  let coverage = null;
  const guard = (operation) => {
    try {
      operation();
    } catch (error) {
      errors.push(error.message);
    }
  };
  guard(() => {
    validateRegistry(registry);
    if (audit?.run) validateRunContract(audit.run, audit.config);
    if (
      !audit ||
      !audit.run ||
      !text(audit.run.runId) ||
      audit.run.registryVersion !== registry.version ||
      ![
        "planned",
        "collecting",
        "analyzing",
        "validating",
        "partial",
        "complete",
      ].includes(audit.run.status)
    )
      throw new Error("Invalid audit run identity or registry version");
    for (const field of ["inventory", "evidence", "checks", "findings"])
      if (
        !Array.isArray(audit[field]) ||
        audit[field].some(
          (record) =>
            !record || typeof record !== "object" || Array.isArray(record),
        )
      )
        throw new Error(`Missing audit ${field}`);
    if (
      !audit.artifacts ||
      typeof audit.artifacts !== "object" ||
      Array.isArray(audit.artifacts)
    )
      throw new Error("Missing audit artifacts");
  });
  if (errors.length)
    return { valid: false, completionAllowed: false, coverage, errors };
  guard(() => validateCollectionRecoveryReceipts(audit));
  const items = new Map(audit.inventory.map((item) => [item.itemId, item]));
  const rules = new Map(registry.rules.map((rule) => [rule.ruleId, rule]));
  for (const item of audit.inventory)
    guard(() => {
      // Legacy inventories omit type; never infer a declaration for them.
      if (Object.hasOwn(item, "type")) {
        if (
          !strings(item.typeCandidates) ||
          item.type !==
            (item.typeCandidates.length === 1
              ? item.typeCandidates[0]
              : "unknown")
        )
          throw new Error(`Invalid inventory type declaration: ${item.itemId}`);
      }
      const expected = createCheckPlan(item, registry).requiredRuleIds;
      if (
        !strings(item.requiredRuleIds) ||
        !equal(sorted(expected), sorted(item.requiredRuleIds))
      )
        throw new Error(`Incomplete or altered rule plan: ${item.itemId}`);
    });
  const evidence = new Map();
  for (const record of audit.evidence)
    guard(() => {
      if (
        !record ||
        !text(record.evidenceId) ||
        evidence.has(record.evidenceId)
      )
        throw new Error("Duplicate or invalid evidence identity");
      evidence.set(record.evidenceId, record);
      if (!items.has(record.itemId) || !text(record.kind))
        throw new Error("Evidence references unknown item or kind");
      for (const field of ["method", "locator", "redaction", "collectedAt"])
        if (!text(record[field])) throw new Error(`Missing evidence ${field}`);
      if (
        !Number.isFinite(Date.parse(record.collectedAt)) ||
        !Array.isArray(record.limitations) ||
        record.limitations.some((value) => !text(value))
      )
        throw new Error("Invalid evidence date or limitations");
      if (!strings(record.sourceEvidenceIds))
        throw new Error("Evidence source dependencies required");
      if (
        !safeArtifactPath(record.artifact) ||
        !Object.hasOwn(audit.artifacts, record.artifact) ||
        typeof audit.artifacts[record.artifact] !== "string"
      )
        throw new Error("Missing or unsafe evidence artifact");
      const bytes = audit.artifacts[record.artifact];
      if (
        createHash("sha256").update(bytes).digest("hex") !== record.snapshotHash
      )
        throw new Error(`Artifact hash mismatch: ${record.evidenceId}`);
      if (!["utf8", "json"].includes(record.encoding))
        throw new Error("Unsupported evidence encoding");
      const value = record.encoding === "json" ? JSON.parse(bytes) : bytes;
      if (!equal(value, record.value))
        throw new Error(
          `Evidence value differs from artifact: ${record.evidenceId}`,
        );
    });
  const lineage = new Map();
  function dependencies(id, visiting = new Set()) {
    if (visiting.has(id)) throw new Error("Evidence provenance cycle");
    if (lineage.has(id)) return lineage.get(id);
    const record = evidence.get(id);
    if (!record) throw new Error("Missing source evidence dependency");
    if (!strings(record.sourceEvidenceIds))
      throw new Error("Invalid evidence source dependencies");
    visiting.add(id);
    const itemIds = new Set([record.itemId]);
    for (const source of record.sourceEvidenceIds)
      for (const itemId of dependencies(source, visiting)) itemIds.add(itemId);
    visiting.delete(id);
    lineage.set(id, itemIds);
    return itemIds;
  }
  for (const id of evidence.keys())
    guard(() => {
      dependencies(id);
    });
  for (const check of audit.checks)
    guard(() => {
      const rule = rules.get(check.ruleId);
      const item = items.get(check.itemId);
      if (
        !rule ||
        !item ||
        !item.requiredRuleIds.includes(check.ruleId) ||
        rule.dimension !== check.dimension
      )
        throw new Error("Check references unplanned rule, item or dimension");
      if (
        !strings(check.evidenceIds) ||
        !strings(check.dependencies) ||
        !check.dependencies.includes(check.itemId) ||
        check.dependencies.some((id) => !items.has(id))
      )
        throw new Error("Invalid check evidence or dependencies");
      for (const id of check.evidenceIds) {
        const record = evidence.get(id);
        if (!record || record.itemId !== check.itemId)
          throw new Error("Invalid check evidence reference");
        for (const dependency of dependencies(id))
          if (!check.dependencies.includes(dependency))
            throw new Error("Check omits source dependency");
      }
      if (
        (rule.mode === "semantic" && ["pass", "fail"].includes(check.status)) ||
        check.status === "not-applicable"
      ) {
        mergeReviewedChecks(item, audit.evidence, registry, [check]);
      } else if (
        rule.mode !== "semantic" &&
        ["pass", "fail"].includes(check.status)
      ) {
        const computed = evaluateChecks(item, audit.evidence, registry).find(
          (result) => result.ruleId === check.ruleId,
        );
        if (
          computed.status !== check.status ||
          !equal(sorted(computed.evidenceIds), sorted(check.evidenceIds))
        )
          throw new Error("Deterministic check contradicts evidence");
      }
    });
  const findingIds = new Set();
  for (const finding of audit.findings)
    guard(() => {
      if (
        !finding ||
        !text(finding.findingId) ||
        findingIds.has(finding.findingId)
      )
        throw new Error("Duplicate or invalid finding ID");
      findingIds.add(finding.findingId);
      resolveActionProposal(finding);
      for (const field of [
        "title",
        "remediation",
        "verification",
        "ownerRole",
        "effort",
      ])
        if (!text(finding[field])) throw new Error(`Missing finding ${field}`);
      if (
        !["critical", "high", "medium", "low"].includes(finding.severity) ||
        !["high", "medium", "low"].includes(finding.confidence) ||
        !["observed", "inferred"].includes(finding.classification)
      )
        throw new Error(
          "Invalid finding severity, confidence or classification",
        );
      for (const field of [
        "affectedItemIds",
        "ruleIds",
        "dimensions",
        "evidenceIds",
      ])
        if (!strings(finding[field]) || !finding[field].length)
          throw new Error(`Missing finding ${field}`);
      const allowedDimensions = new Set(
        finding.ruleIds.map((id) => rules.get(id)?.dimension).filter(Boolean),
      );
      if (
        finding.affectedItemIds.some((id) => !items.has(id)) ||
        finding.ruleIds.some((id) => !rules.has(id)) ||
        finding.dimensions.some(
          (dimension) => !allowedDimensions.has(dimension),
        )
      )
        throw new Error(
          `Invalid finding item, rule or dimension for ${finding.findingId}; dimensions allowed by its cited rules: ${[...allowedDimensions].join(", ") || "none"}`,
        );
      const supportedItems = new Set();
      for (const id of finding.evidenceIds)
        for (const itemId of dependencies(id)) supportedItems.add(itemId);
      if (finding.affectedItemIds.some((id) => !supportedItems.has(id)))
        throw new Error("Finding lacks affected-item evidence");
      for (const itemId of finding.affectedItemIds)
        for (const ruleId of finding.ruleIds)
          if (
            !audit.checks.some(
              (check) => check.itemId === itemId && check.ruleId === ruleId,
            )
          )
            throw new Error("Finding lacks corresponding item-rule check");
    });
  for (const check of audit.checks.filter((check) => check.status === "fail")) {
    if (
      !audit.findings.some(
        (finding) =>
          finding.affectedItemIds?.includes(check.itemId) &&
          finding.ruleIds?.includes(check.ruleId),
      )
    )
      errors.push(
        `Failed check lacks finding: ${check.itemId}/${check.ruleId}`,
      );
  }
  guard(() => {
    coverage = computeCoverage(audit.inventory, audit.checks, audit.run);
  });
  if (audit.run.status === "complete" && !coverage?.complete)
    errors.push("Run claims complete with unresolved coverage");
  return {
    valid: errors.length === 0,
    completionAllowed: errors.length === 0 && coverage?.complete === true,
    coverage,
    errors,
  };
}

/** Loads a stable run directory; no symlink artifacts or external references.
 * Optional registry is for trusted programmatic callers/tests, not run input. */
export async function loadAuditData(runDirectory) {
  const rootStat = await lstat(runDirectory);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
    throw new Error("Run directory must be real and not a symlink");
  const root = await realpath(runDirectory);
  let totalBytes = 0;
  async function read(relative, limit = 64 * 1024 * 1024) {
    if (!safeArtifactPath(relative)) throw new Error("Unsafe artifact path");
    let target = root;
    for (const part of relative.split("/")) {
      target = path.join(target, part);
      if ((await lstat(target)).isSymbolicLink())
        throw new Error("Artifact symlink is not allowed");
    }
    const file = await open(
      target,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      if (!(await file.stat()).isFile())
        throw new Error("Artifact is not a regular file");
      const chunks = [];
      let size = 0;
      while (true) {
        const buffer = Buffer.alloc(65536);
        const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        size += bytesRead;
        totalBytes += bytesRead;
        if (size > limit || totalBytes > 128 * 1024 * 1024)
          throw new Error("Audit artifact byte limit exceeded");
        chunks.push(buffer.subarray(0, bytesRead));
      }
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        Buffer.concat(chunks),
      );
    } finally {
      await file.close();
    }
  }
  const json = async (name) => JSON.parse(await read(name));
  const jsonl = async (name) =>
    (await read(name))
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  const audit = {
    run: await json("run.json"),
    inventory: await jsonl("inventory.jsonl"),
    evidence: await jsonl("evidence.jsonl"),
    checks: await jsonl("checks.jsonl"),
    findings: await json("findings.json"),
    artifacts: Object.create(null),
  };
  if (hasRunContract(audit.run)) audit.config = await json("config.json");
  for (const record of audit.evidence) {
    if (!record || !safeArtifactPath(record.artifact))
      throw new Error("Missing or unsafe evidence artifact");
    if (!Object.hasOwn(audit.artifacts, record.artifact))
      audit.artifacts[record.artifact] = await read(
        record.artifact,
        16 * 1024 * 1024,
      );
  }
  return audit;
}
export async function validateAudit(runDirectory, registry) {
  try {
    const trustedRegistry =
      registry ??
      JSON.parse(
        await readFile(
          new URL("../../rules/core.json", import.meta.url),
          "utf8",
        ),
      );
    return validateAuditData(
      await loadAuditData(runDirectory),
      trustedRegistry,
    );
  } catch (error) {
    return {
      valid: false,
      completionAllowed: false,
      coverage: null,
      errors: [error.message],
    };
  }
}

// Checks delivered bytes against their report manifest. Audit semantics and
// manifest authenticity require separate review.
export async function validatePublicReport(directory) {
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Report directory must be real and not a symlink");
  async function read(name, consume) {
    const file = await open(
      path.join(directory, name),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile()) throw new Error(`Not a regular report file: ${name}`);
      return await consume(file, stat);
    } finally {
      await file.close();
    }
  }

  const manifest = await read(
    "public-report-manifest.json",
    async (file, stat) => {
      if (stat.size > 128 * 1024)
        throw new Error("Report manifest is too large");
      return JSON.parse(await file.readFile("utf8"));
    },
  );
  if (
    manifest?.schemaVersion !== 1 ||
    !manifest.files ||
    text(manifest.runId) === text(manifest.campaignId)
  )
    throw new Error("Invalid public report manifest");

  for (const name of ["report.json", "report.md", "report.html"]) {
    const expected = manifest.files[name];
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected))
      throw new Error(`Missing report digest: ${name}`);
    const digest = await read(name, async (file) => {
      const hash = createHash("sha256");
      for await (const chunk of file.createReadStream({ autoClose: false }))
        hash.update(chunk);
      return hash.digest("hex");
    });
    if (digest !== expected) throw new Error(`Report digest mismatch: ${name}`);
  }
  return {
    valid: true,
    ...(text(manifest.runId)
      ? { runId: manifest.runId }
      : { campaignId: manifest.campaignId }),
  };
}
