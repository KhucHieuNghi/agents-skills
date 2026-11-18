import { createHash } from "node:crypto";
export function studySource() {
  const sourceText =
    "Historical study\n40 of 100 responses cited video sources in the 2024 English synthetic API panel.\nThis does not establish current brand visibility.\n<script>untrusted</script>";
  return {
    sourceId: "historical-panel",
    locator: "supplied study example.com",
    sourceText,
    sourceHash: createHash("sha256").update(sourceText).digest("hex"),
    kind: "historical-study",
    synthetic: true,
    scope:
      "English synthetic API panel, 1–14 February 2024; publication November 2026",
    limitations: [
      "No response-level observations or current brand measurements",
    ],
    passages: [
      {
        startLine: 2,
        endLine: 3,
        quote:
          "40 of 100 responses cited video sources in the 2024 English synthetic API panel.\nThis does not establish current brand visibility.",
      },
    ],
  };
}
