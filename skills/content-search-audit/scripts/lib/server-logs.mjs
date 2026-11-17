import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const timestamp = (value) =>
  text(value) &&
  /(Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));
const keys = new Set([
  "requestId",
  "timestamp",
  "method",
  "url",
  "status",
  "userAgent",
  "bytesSent",
  "durationMs",
]);
/** Read an explicitly normalized, redacted request export; never infer bot identity. */
export function importServerLogs(input) {
  if (
    !object(input) ||
    !text(input.sourceId) ||
    !text(input.locator) ||
    !timestamp(input.capturedAt) ||
    typeof input.synthetic !== "boolean" ||
    !object(input.scope) ||
    !timestamp(input.scope.from) ||
    !timestamp(input.scope.to) ||
    Date.parse(input.scope.from) > Date.parse(input.scope.to) ||
    !text(input.scope.system) ||
    !text(input.scope.filters) ||
    typeof input.scope.exportComplete !== "boolean" ||
    !object(input.normalization) ||
    !text(input.normalization.method) ||
    !text(input.normalization.reviewer) ||
    !text(input.normalization.redaction) ||
    !Array.isArray(input.normalization.limitations) ||
    input.normalization.limitations.some((value) => !text(value))
  )
    throw new Error("Invalid server-log scope/normalization metadata");
  if (
    typeof input.sourceText !== "string" ||
    Buffer.byteLength(input.sourceText) > 16 * 1024 * 1024 ||
    !/^[a-f0-9]{64}$/.test(input.sourceHash ?? "") ||
    hash(input.sourceText) !== input.sourceHash
  )
    throw new Error("Invalid server-log source artifact size/hash");
  const lines = input.sourceText.split(/\r?\n/);
  if (lines.length > 100001) throw new Error("Server-log line limit exceeded");
  const rows = [],
    pendingQueue = [],
    ids = new Set(),
    groups = new Map();
  let blankLines = 0,
    unknownStatus = 0;
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) {
      blankLines++;
      continue;
    }
    try {
      const row = JSON.parse(line);
      if (
        !object(row) ||
        Object.keys(row).some((key) => !keys.has(key)) ||
        !timestamp(row.timestamp) ||
        !/^[A-Z][A-Z0-9!#$%&'*+.^_`|~-]*$/.test(row.method ?? "") ||
        !text(row.url) ||
        !(
          row.status === null ||
          (Number.isInteger(row.status) &&
            row.status >= 100 &&
            row.status <= 599)
        ) ||
        !(row.userAgent === null || typeof row.userAgent === "string")
      )
        throw new Error("Invalid normalized request fields");
      if (
        Date.parse(row.timestamp) < Date.parse(input.scope.from) ||
        Date.parse(row.timestamp) > Date.parse(input.scope.to)
      )
        throw new Error("Request timestamp outside declared scope");
      const parsed = new URL(row.url);
      if (
        !["https:", "http:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.hash ||
        row.url.trim() !== row.url ||
        [...row.url].some(
          (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
        )
      )
        throw new Error("Invalid normalized request URL");
      for (const name of ["bytesSent", "durationMs"])
        if (
          row[name] !== undefined &&
          row[name] !== null &&
          (typeof row[name] !== "number" ||
            !Number.isFinite(row[name]) ||
            row[name] < 0 ||
            row[name] > Number.MAX_SAFE_INTEGER ||
            (name === "bytesSent" && !Number.isSafeInteger(row[name])))
        )
          throw new Error("Invalid normalized request byte/duration value");
      if (row.requestId !== undefined) {
        if (!text(row.requestId)) throw new Error("Invalid requestId");
        if (ids.has(row.requestId))
          throw new Error("Repeated requestId; reconcile overlapping exports");
        ids.add(row.requestId);
      }
      const entry = {
        ...row,
        line: index + 1,
        lineHash: hash(line),
        sourceHash: input.sourceHash,
        crawlerIdentity: "unverified",
      };
      rows.push(entry);
      if (row.status === null) unknownStatus++;
      const key = JSON.stringify([row.method, row.url, row.status]);
      if (!groups.has(key))
        groups.set(key, {
          method: row.method,
          url: row.url,
          status: row.status,
          observedRequestLines: 0,
        });
      groups.get(key).observedRequestLines++;
    } catch (error) {
      pendingQueue.push({
        kind: "server-log-row",
        line: index + 1,
        lineHash: hash(line),
        reason: error.message,
      });
    }
  }
  if (!input.scope.exportComplete)
    pendingQueue.push({
      kind: "server-log-export",
      reason: "Supplied export is declared incomplete",
    });
  return {
    schemaVersion: 1,
    provider: "server-logs",
    sourceId: input.sourceId,
    locator: input.locator,
    capturedAt: input.capturedAt,
    synthetic: input.synthetic,
    scope: input.scope,
    normalization: input.normalization,
    sourceHash: input.sourceHash,
    rows,
    groups: [...groups.values()],
    pendingQueue,
    acceptedLines: rows.length,
    rejectedLines: pendingQueue.filter(
      (entry) => entry.kind === "server-log-row",
    ).length,
    blankLines,
    unknownStatus,
    suppliedExportParsed: pendingQueue.length === 0,
    populationComplete: false,
    limitations: [
      "Counts are accepted request lines, not sessions, people, unique visits or verified crawlers",
      "Identical lines without request IDs remain separate observations; source rotation/overlap must be reviewed",
      "User-Agent is an unverified claim; no DNS/IP/bot authentication is performed",
      "Requests/status codes do not prove indexing, content rendering, AI citation or answer accuracy",
      "Scope, normalization and redaction are supplied assertions; source hashes do not authenticate the server",
    ],
  };
}
