import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
const contentTypes = {
  ".html": "text/html",
  ".htm": "text/html",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".txt": "text/plain",
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
function within(root, file) {
  const relative = path.relative(root, file);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
/** Reads authorized inert local exports only. Never executes or renders target code.
 * The caller owns output persistence and redaction review before sharing reports.
 * Roots must be trusted, stable directories, not concurrently attacker-mutated trees. */
export async function collectItem(item, policy = {}) {
  if (!item || typeof item.itemId !== "string" || !item.itemId.trim())
    throw new Error("Item identity required");
  const result = (status, reason) => ({ itemId: item.itemId, status, reason });
  const maxBytes = policy.maxBytes ?? 10 * 1024 * 1024;
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 100 * 1024 * 1024
  )
    throw new Error("Invalid collection byte limit");
  if (item.uri)
    return result(
      "blocked",
      "Network collection requires the authorized network collector; local mode does not fetch URLs",
    );
  if (typeof item.path !== "string" || !path.isAbsolute(item.path))
    throw new Error("Absolute local path required");
  if (!Array.isArray(policy.localRoots) || !policy.localRoots.length)
    return result("blocked", "No local content roots authorized");
  if (
    policy.localRoots.some(
      (root) => typeof root !== "string" || !path.isAbsolute(root),
    )
  )
    throw new Error("Authorized roots must be absolute");
  let file;
  try {
    const roots = await Promise.all(
      policy.localRoots.map((root) => realpath(root)),
    );
    const resolved = await realpath(item.path);
    if (!roots.some((root) => within(root, resolved)))
      return result(
        "blocked",
        "Resolved content path is outside authorized roots",
      );
    const contentType = contentTypes[path.extname(resolved).toLowerCase()];
    if (!contentType)
      return result(
        "unsupported",
        "Content requires an explicitly supplied extraction adapter or text transcript",
      );
    file = await open(
      resolved,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const before = await file.stat();
    if (!before.isFile())
      return result("unsupported", "Content path is not a regular file");
    if (before.size > maxBytes)
      return result("blocked", "Content exceeds authorized byte limit");
    const chunks = [];
    let total = 0;
    while (true) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1 - total));
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      chunks.push(buffer.subarray(0, bytesRead));
      total += bytesRead;
      if (total > maxBytes)
        return result("blocked", "Content exceeds authorized byte limit");
    }
    const after = await file.stat();
    if (
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    )
      return result(
        "failed",
        "Content changed during collection; retry with a stable export",
      );
    const bytes = Buffer.concat(chunks);
    let content;
    try {
      content = new TextDecoder("utf-8", {
        fatal: true,
        ignoreBOM: true,
      }).decode(bytes);
    } catch {
      return result("unsupported", "Content is not valid UTF-8 text");
    }
    if (content.includes("\0"))
      return result("unsupported", "Binary content cannot be audited as text");
    const snapshotHash = hash(bytes);
    return {
      itemId: item.itemId,
      status: "collected",
      content,
      contentType,
      evidence: {
        evidenceId: hash(
          JSON.stringify([item.itemId, "local-file", resolved, snapshotHash]),
        ),
        itemId: item.itemId,
        method: "local-file",
        collectedAt: new Date().toISOString(),
        locator: resolved,
        snapshotHash,
        byteLength: bytes.length,
        redaction: "none; authorized source content retained locally",
        limitations: [
          "Local export does not establish public reachability, index status or freshness of the live site",
          "HTML is source text, not rendered DOM; target scripts were not executed",
        ],
      },
    };
  } catch (error) {
    return result(
      "failed",
      `Local collection failed (${typeof error.code === "string" ? error.code : "read-error"})`,
    );
  } finally {
    await file?.close();
  }
}
