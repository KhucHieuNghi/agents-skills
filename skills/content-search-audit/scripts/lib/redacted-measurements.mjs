import { createHash } from "node:crypto";
const hash = (value) => createHash("sha256").update(value).digest("hex");
/** Presentation derivatives only. Nested receipt hashes continue to describe original inputs. */
export function redactMeasurementDocuments(documents, redact) {
  function display(value) {
    if (typeof value === "string") return redact(value);
    if (Array.isArray(value)) return value.map(display);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, display(child)]),
      );
    return value;
  }
  return Object.fromEntries(
    Object.entries(documents).map(([name, bytes]) => {
      const wrap = (value, sourceHash) => ({
        kind: "redacted-measurement-presentation",
        sourceDocumentHash: sourceHash,
        limitations: [
          "Transformed display, not an importable original export or accuracy annotation.",
          "Embedded receipt hashes refer to original data; they do not validate masked strings.",
          "Numbers and booleans are unchanged; declared string values may be masked. Review before sharing.",
        ],
        data: display(value),
      });
      if (name.endsWith(".json"))
        return [
          name,
          JSON.stringify(wrap(JSON.parse(bytes), hash(bytes)), null, 2) + "\n",
        ];
      if (name.endsWith(".jsonl"))
        return [
          name,
          bytes
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => JSON.stringify(wrap(JSON.parse(line), hash(line))))
            .join("\n") + (bytes.trim() ? "\n" : ""),
        ];
      throw new Error("Unsupported measurement derivative format");
    }),
  );
}
