import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const text = (value) => typeof value === "string" && value.trim().length > 0;
const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const within = (root, file) => {
  const p = path.relative(root, file);
  return (
    !p || (!path.isAbsolute(p) && p !== ".." && !p.startsWith(`..${path.sep}`))
  );
};
function bindings(audit, request) {
  const item = audit.inventory.find((i) => i.itemId === request.itemId);
  const get = (id, kind) => {
    const e = audit.evidence.find((e) => e.evidenceId === id);
    if (
      !e ||
      e.itemId !== request.itemId ||
      e.kind !== kind ||
      !Object.hasOwn(audit.artifacts, e.artifact) ||
      hash(audit.artifacts[e.artifact]) !== e.snapshotHash
    )
      throw new Error("Invalid recovery evidence binding");
    return e;
  };
  if (
    !item ||
    item.uri ||
    !path.isAbsolute(item.path ?? "") ||
    path.extname(item.path).toLowerCase() !== ".pdf"
  )
    throw new Error("Recovery requires a declared local PDF item");
  const manifest = get(request.manifestEvidenceId, "extraction-provenance");
  const content = get(request.contentEvidenceId, "content");
  const extracted = get(request.textEvidenceId, "extracted-text");
  const m = manifest.value;
  if (
    manifest.encoding !== "json" ||
    !m ||
    m.schemaVersion !== 1 ||
    !digest(m.sourceSha256) ||
    !Number.isSafeInteger(m.sourceByteLength) ||
    m.sourceByteLength < 1 ||
    !text(m.extractor?.name) ||
    !text(m.extractor?.version) ||
    m.coverage !== "complete" ||
    !Number.isSafeInteger(m.pageCount) ||
    m.pageCount < 1 ||
    m.pageCount > 10000 ||
    !Array.isArray(m.pages) ||
    m.pages.length !== m.pageCount ||
    !Array.isArray(m.limitations) ||
    m.limitations.some((v) => !text(v))
  )
    throw new Error("Invalid or partial extraction manifest");
  if (m.pages.some((p, i) => p?.page !== i + 1 || !text(p.text)))
    throw new Error(
      "Every declared PDF page requires nonempty extracted text; partial/OCR gaps remain unsupported",
    );
  const joined = m.pages.map((p) => p.text).join("\f");
  if (
    content.encoding !== "utf8" ||
    extracted.encoding !== "utf8" ||
    content.value !== joined ||
    extracted.value !== joined ||
    !content.sourceEvidenceIds?.includes(manifest.evidenceId) ||
    !extracted.sourceEvidenceIds?.includes(content.evidenceId)
  )
    throw new Error(
      "Recovery text differs from page manifest or source lineage",
    );
  const snapshotHash = hash(
    JSON.stringify({
      sourceSha256: m.sourceSha256,
      manifestHash: manifest.snapshotHash,
      contentHash: content.snapshotHash,
      textHash: extracted.snapshotHash,
    }),
  );
  return { item, manifest, content, extracted, m, snapshotHash };
}
/** Historical structural validation only: never re-read source files during artifact validation. */
export function validateCollectionRecoveryReceipts(audit) {
  if (audit.run.collectionRecoveries === undefined) return;
  if (!Array.isArray(audit.run.collectionRecoveries))
    throw new Error("Invalid collection recovery receipts");
  const seen = new Set();
  for (const receipt of audit.run.collectionRecoveries) {
    if (
      !receipt ||
      seen.has(receipt.itemId) ||
      !text(receipt.reviewer) ||
      !text(receipt.reason) ||
      !Number.isFinite(Date.parse(receipt.reviewedAt)) ||
      receipt.previousState !== "unsupported"
    )
      throw new Error("Invalid collection recovery receipt");
    seen.add(receipt.itemId);
    const b = bindings(audit, receipt);
    if (
      !["pending", "audited"].includes(b.item.state) ||
      receipt.sourceSha256 !== b.m.sourceSha256 ||
      receipt.sourceByteLength !== b.m.sourceByteLength ||
      receipt.snapshotHash !== b.snapshotHash ||
      audit.run.inputHashes[receipt.itemId] !== b.snapshotHash ||
      b.item.contentHash !== b.content.snapshotHash
    )
      throw new Error("Stale collection recovery receipt");
  }
}
/** Explicit host-attributed recovery. Reads only original local source bytes; no executable adapters. */
export async function recoverCollections(audit, config, requests = []) {
  if (!Array.isArray(requests))
    throw new Error("Collection recoveries array required");
  const seen = new Set();
  const receipts = [];
  const maxBytes = config.maxBytes ?? 10 * 1024 * 1024;
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 100 * 1024 * 1024
  )
    throw new Error("Invalid recovery source byte limit");
  const maxRunBytes = config.maxRunBytes ?? 96 * 1024 * 1024;
  if (!Number.isSafeInteger(maxRunBytes) || maxRunBytes < 1)
    throw new Error("Invalid recovery run byte limit");
  let total = 0;
  if (requests.length) {
    for (const value of Object.values(audit.artifacts)) {
      const bytes = Buffer.byteLength(value);
      if (bytes > 16 * 1024 * 1024)
        throw new Error("Recovery artifact byte limit exceeded");
      total += bytes;
    }
    if (total > maxRunBytes)
      throw new Error("Recovery artifact budget exceeded");
  }
  for (const request of requests) {
    if (
      !request ||
      seen.has(request.itemId) ||
      !text(request.reviewer) ||
      !text(request.reason)
    )
      throw new Error("Invalid or duplicate collection recovery");
    seen.add(request.itemId);
    const b = bindings(audit, request);
    if (b.item.state !== "unsupported")
      throw new Error(
        "Only unsupported collection can recover; blocked, failed or excluded items require a new authorized collection",
      );
    if (
      audit.checks.some(
        (c) => c.reviewer && c.dependencies?.includes(b.item.itemId),
      )
    )
      throw new Error(
        "Recover before semantic review; start a fresh run to replace already-reviewed extraction",
      );
    const roots = await Promise.all(
      (config.localRoots ?? []).map((r) => realpath(r)),
    );
    const resolved = await realpath(b.item.path);
    if (!roots.some((root) => within(root, resolved)))
      throw new Error("Recovery source is outside authorized roots");
    const file = await open(
      resolved,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const before = await file.stat();
      if (!before.isFile() || before.size > maxBytes)
        throw new Error(
          "Recovery source byte limit exceeded or not a regular file",
        );
      const digest = createHash("sha256");
      let size = 0;
      while (true) {
        const buffer = new Uint8Array(65536);
        const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        size += bytesRead;
        total += bytesRead;
        if (size > maxBytes || total > maxRunBytes)
          throw new Error("Recovery source read budget exceeded");
        digest.update(buffer.subarray(0, bytesRead));
      }
      const after = await file.stat();
      if (
        before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs
      )
        throw new Error("Recovery source changed during read");
      if (
        size !== b.m.sourceByteLength ||
        digest.digest("hex") !== b.m.sourceSha256
      )
        throw new Error("Recovery source hash or length mismatch");
    } finally {
      await file.close();
    }
    const receipt = {
      ...request,
      previousState: "unsupported",
      sourceSha256: b.m.sourceSha256,
      sourceByteLength: b.m.sourceByteLength,
      snapshotHash: b.snapshotHash,
    };
    receipts.push(receipt);
    b.item.state = "pending";
    b.item.contentHash = b.content.snapshotHash;
    b.item.reason =
      "Attributed PDF extraction recovered; required content assessments remain pending";
    audit.run.inputHashes[b.item.itemId] = b.snapshotHash;
  }
  if (receipts.length)
    audit.run.collectionRecoveries = [
      ...(audit.run.collectionRecoveries ?? []),
      ...receipts,
    ];
  return new Set(receipts.map((r) => r.itemId));
}
