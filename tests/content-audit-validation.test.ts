import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  validateAuditData,
  validateAudit,
} from "../skills/content-search-audit/scripts/lib/validate.mjs";
const core = JSON.parse(
  await readFile("skills/content-search-audit/rules/core.json", "utf8"),
);
const registry = {
  ...core,
  rules: core.rules.filter((rule) => rule.ruleId === "quality-readable-text"),
};
function fixture() {
  const content = "Readable extracted text";
  return {
    run: {
      runId: "test",
      registryVersion: registry.version,
      status: "complete",
      inventoryComplete: true,
      mode: "full",
      pendingQueue: [],
    },
    inventory: [
      {
        itemId: "page",
        state: "audited",
        requiredRuleIds: ["quality-readable-text"],
      },
    ],
    evidence: [
      {
        evidenceId: "text",
        itemId: "page",
        kind: "extracted-text",
        value: content,
        artifact: "evidence/page.txt",
        encoding: "utf8",
        snapshotHash: createHash("sha256").update(content).digest("hex"),
        collectedAt: "2026-11-16T00:00:00Z",
        method: "supplied-extraction",
        locator: "export/page",
        redaction: "none",
        limitations: ["Supplied export"],
        sourceEvidenceIds: [],
      },
    ],
    checks: [
      {
        itemId: "page",
        ruleId: "quality-readable-text",
        dimension: "quality",
        status: "pass",
        evidenceIds: ["text"],
        dependencies: ["page"],
        reason: "Extraction contains text",
      },
    ],
    findings: [],
    artifacts: { "evidence/page.txt": content },
  };
}
it("allows completion only after evidence and the actual rule plan validate", () => {
  const result = validateAuditData(fixture(), registry);
  expect(result.errors).toEqual([]);
  expect(result.valid).toBe(true);
  expect(result.completionAllowed).toBe(true);
});
it("rejects a reduced plan even if its supplied checks are all green", () => {
  const result = validateAuditData(fixture(), core);
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/rule plan/i);
});
it("rejects changed artifacts, fabricated evidence values and dangling references", () => {
  const audit = fixture();
  audit.artifacts["evidence/page.txt"] = "modified";
  expect(validateAuditData(audit, registry).errors.join(" ")).toMatch(/hash/i);
  const changed = fixture();
  changed.evidence[0].value = "invented";
  expect(validateAuditData(changed, registry).errors.join(" ")).toMatch(
    /value/i,
  );
  const dangling = fixture();
  dangling.checks[0].evidenceIds = ["absent"];
  expect(validateAuditData(dangling, registry).valid).toBe(false);
});
it("detects a claimed deterministic pass that contradicts the captured input", () => {
  const audit = fixture();
  audit.evidence[0].value = "";
  audit.artifacts["evidence/page.txt"] = "";
  audit.evidence[0].snapshotHash = createHash("sha256")
    .update("")
    .digest("hex");
  expect(validateAuditData(audit, registry).errors.join(" ")).toMatch(
    /deterministic/i,
  );
});
it("validates partial reports but rejects false complete status", () => {
  const audit = fixture();
  audit.run.inventoryComplete = false;
  audit.run.status = "partial";
  expect(validateAuditData(audit, registry)).toMatchObject({
    valid: true,
    completionAllowed: false,
  });
  audit.run.status = "complete";
  expect(validateAuditData(audit, registry).valid).toBe(false);
});
it("rejects provenance cycles and missing cross-item dependencies", () => {
  const audit = fixture();
  audit.evidence[0].sourceEvidenceIds = ["text"];
  expect(validateAuditData(audit, registry).errors.join(" ")).toMatch(/cycle/i);
  const missing = fixture();
  missing.checks[0].dependencies = [];
  expect(validateAuditData(missing, registry).errors.join(" ")).toMatch(
    /dependenc/i,
  );
});
it("requires a finding for each failed item-rule check", () => {
  const audit = fixture();
  audit.evidence[0].value = "";
  audit.artifacts["evidence/page.txt"] = "";
  audit.evidence[0].snapshotHash = createHash("sha256")
    .update("")
    .digest("hex");
  audit.checks[0].status = "fail";
  expect(validateAuditData(audit, registry).errors.join(" ")).toMatch(
    /finding/i,
  );
});
it("rejects escaping artifact paths and unregistered finding rules", () => {
  const audit = fixture();
  audit.evidence[0].artifact = "../outside.txt";
  expect(validateAuditData(audit, registry).errors.join(" ")).toMatch(
    /artifact/i,
  );
  const invalid = {
    ...fixture(),
    findings: [{ findingId: "f", ruleIds: ["unregistered"] }],
  };
  expect(validateAuditData(invalid, registry).valid).toBe(false);
});

it("returns validation errors for malformed records instead of throwing", () => {
  const audit = { ...fixture(), inventory: [null] };
  expect(validateAuditData(audit, registry).valid).toBe(false);
});
it("accepts a fully traced finding for a failed extraction check", () => {
  const base = fixture();
  base.evidence[0].value = "";
  base.artifacts["evidence/page.txt"] = "";
  base.evidence[0].snapshotHash = createHash("sha256").update("").digest("hex");
  base.checks[0].status = "fail";
  const audit = {
    ...base,
    findings: [
      {
        findingId: "empty",
        title: "Extraction contains no text",
        affectedItemIds: ["page"],
        ruleIds: ["quality-readable-text"],
        dimensions: ["quality"],
        evidenceIds: ["text"],
        severity: "medium",
        confidence: "high",
        classification: "observed",
        remediation: "Verify the extractor against the source document",
        verification: "Repeat extraction and compare with source",
        ownerRole: "Content reviewer",
        effort: "small",
      },
    ],
  };
  expect(validateAuditData(audit, registry).errors).toEqual([]);
});
it("does not accept an unattributed semantic pass merely because evidence is present", () => {
  const semantic = {
    ...registry,
    rules: [{ ...registry.rules[0], mode: "semantic" }],
  };
  expect(validateAuditData(fixture(), semantic).errors.join(" ")).toMatch(
    /attribution/i,
  );
});

it("loads persisted JSON/JSONL artifacts and rejects an escaping symlink", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "audit-validation-"));
  try {
    const audit = fixture();
    await mkdir(path.join(dir, "evidence"));
    for (const [file, value] of Object.entries({
      "run.json": JSON.stringify(audit.run),
      "inventory.jsonl": audit.inventory
        .map((value) => JSON.stringify(value))
        .join("\n"),
      "evidence.jsonl": audit.evidence
        .map((value) => JSON.stringify(value))
        .join("\n"),
      "checks.jsonl": audit.checks
        .map((value) => JSON.stringify(value))
        .join("\n"),
      "findings.json": JSON.stringify(audit.findings),
      "evidence/page.txt": audit.artifacts["evidence/page.txt"],
    }))
      await writeFile(path.join(dir, file), value);
    expect((await validateAudit(dir, registry)).valid).toBe(true);
    await rm(path.join(dir, "evidence/page.txt"));
    await symlink(
      path.join(dir, "run.json"),
      path.join(dir, "evidence/page.txt"),
    );
    expect((await validateAudit(dir, registry)).errors.join(" ")).toMatch(
      /symlink/i,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("rejects resolved type claims that contradict their declarations", () => {
  for (const metadata of [
    { type: "guide", typeCandidates: [] },
    { type: "guide", typeCandidates: ["guide", "product"] },
    { type: "product", typeCandidates: ["guide"] },
    { type: "guide", typeCandidates: "guide" },
  ]) {
    const audit = fixture();
    Object.assign(audit.inventory[0], metadata);
    expect(validateAuditData(audit, registry).errors.join(" ")).toMatch(
      /type declaration/i,
    );
  }
  for (const metadata of [
    {},
    { type: "unknown", typeCandidates: [] },
    { type: "unknown", typeCandidates: ["guide", "product"] },
    { type: "guide", typeCandidates: ["guide"] },
  ]) {
    const audit = fixture();
    Object.assign(audit.inventory[0], metadata);
    expect(validateAuditData(audit, registry).valid).toBe(true);
  }
});
