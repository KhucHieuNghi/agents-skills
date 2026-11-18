import { createHash } from "node:crypto";
const text = (value) => typeof value === "string" && value.trim().length > 0;
const fail = (message) => {
  throw new Error(`Invalid study source: ${message}`);
};

/** Preserve supplied historical evidence without inventing response-level records. */
export function prepareStudySources(sources) {
  if (sources === undefined) return { sections: [], documents: {} };
  if (!Array.isArray(sources) || !sources.length || sources.length > 20)
    fail("supply 1–20 sources");
  const seen = new Set();
  const sections = [
    {
      title: "Supplied historical measurement evidence",
      text: "Historical study sources are attached below. Their quoted measurements are not current brand observations. Hashes and exact passages bind supplied bytes, not authenticity, sampling validity or semantic interpretation. No response-level observations or performance forecasts are manufactured from aggregates.",
    },
  ];
  for (const source of sources) {
    if (
      !source ||
      !text(source.sourceId) ||
      !text(source.locator) ||
      !text(source.sourceText) ||
      !text(source.scope) ||
      source.kind !== "historical-study" ||
      typeof source.synthetic !== "boolean" ||
      !Array.isArray(source.limitations) ||
      !source.limitations.length ||
      !source.limitations.every(text)
    )
      fail(
        "identity, historical kind, scope, synthetic label and limitations required",
      );
    if (seen.has(source.sourceId)) fail("duplicate sourceId");
    seen.add(source.sourceId);
    if (
      createHash("sha256").update(source.sourceText).digest("hex") !==
      source.sourceHash
    )
      fail("source hash mismatch");
    if (
      !Array.isArray(source.passages) ||
      !source.passages.length ||
      source.passages.length > 20
    )
      fail("supply 1–20 passages");
    const lines = source.sourceText.split(/\r?\n/);
    for (const passage of source.passages) {
      if (
        !passage ||
        !Number.isSafeInteger(passage.startLine) ||
        !Number.isSafeInteger(passage.endLine) ||
        passage.startLine < 1 ||
        passage.endLine < passage.startLine ||
        passage.endLine > lines.length ||
        !text(passage.quote) ||
        lines.slice(passage.startLine - 1, passage.endLine).join("\n") !==
          passage.quote
      )
        fail("passage must exactly match the declared full line range");
    }
    sections.push(
      {
        title: "Historical study source",
        headers: ["Field", "Value"],
        rows: [
          ["Source", source.sourceId],
          ["Kind", source.kind],
          ["Locator", source.locator],
          [
            "Data label",
            source.synthetic
              ? "SYNTHETIC FIXTURE DATA — not live performance"
              : "Supplied source; authenticity requires review",
          ],
          ["Reviewer-supplied scope", source.scope],
          ["Source SHA-256", source.sourceHash],
          ["Limitations", source.limitations.join("; ")],
          ["Evidence bundle", { artifact: "study-evidence.json" }],
        ],
      },
      {
        title: "Exact study passages",
        headers: ["Source", "Lines", "Verbatim passage"],
        rows: source.passages.map((p) => [
          source.sourceId,
          `${p.startLine}–${p.endLine}`,
          p.quote,
        ]),
      },
    );
  }
  return {
    sections,
    documents: {
      "study-evidence.json":
        JSON.stringify({ schemaVersion: 1, sources }, null, 2) + "\n",
    },
  };
}
