import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { RESEARCH_DRAFT_LIMITATIONS } from "../scripts/enterprise-journeys/research-projection.mjs";
import {
  renderResearchDraft,
  validateResearchDraftArtifacts,
} from "../scripts/enterprise-journeys/research-report.mjs";
export function draft() {
  return {
    schemaVersion: 1,
    editionId: "a0000000-0000-4000-8000-000000000001",
    assessmentDate: "2026-11-19",
    status: "reviewed-material-draft",
    synthetic: true,
    items: [
      {
        reference: "b0000000-0000-4000-8000-000000000001",
        kind: "observed-behavior",
        taskContext: "Checkout",
        summary:
          "<script>alert(1)</script> & [link](https://example.com)\nSecond line",
        limitation: "Small qualitative sample",
        recommendation: "Clarify delivery choices",
        retest: "Repeat the authorized checkout task",
        reviewType: "ai",
      },
    ],
    limitations: [...RESEARCH_DRAFT_LIMITATIONS],
  };
}
it("renders deterministic artifacts from one canonical draft with complete fields", () => {
  const d = draft(),
    a = renderResearchDraft(d);
  expect(renderResearchDraft(d)).toEqual(a);
  expect(validateResearchDraftArtifacts(a)).toEqual(d);
  expect(JSON.parse(a.json)).toEqual(d);
  for (const field of ["taskContext", "limitation", "recommendation", "retest"])
    expect(a.html).toContain(d.items[0][field]);
  expect(a.html).not.toContain("<script>");
  expect(a.html).toContain("&lt;script&gt;");
  expect(a.markdown).toContain("\\[link\\]");
  expect(a.html).not.toContain('href="https://');
});
it("rejects private wrapper and additional sensitive fields instead of serializing them", () => {
  const d = draft();
  expect(() =>
    renderResearchDraft({
      customerDraft: d,
      privateDecision: { secret: "PRIVATE" },
    }),
  ).toThrow();
  d.items[0].recordId = "PRIVATE";
  expect(() => renderResearchDraft(d)).toThrow();
});
it.each(["html", "markdown"])(
  "rejects modified %s even with recomputed hash",
  (field) => {
    const a = renderResearchDraft(draft());
    a[field] += "tamper";
    a.manifest.files[field === "html" ? "report.html" : "report.md"] =
      createHash("sha256").update(a[field]).digest("hex");
    expect(() => validateResearchDraftArtifacts(a)).toThrow();
  },
);
it("rejects noncanonical JSON and weakened limitations", () => {
  const a = renderResearchDraft(draft());
  a.json = JSON.stringify(JSON.parse(a.json));
  expect(() => validateResearchDraftArtifacts(a)).toThrow();
  const d = draft();
  d.limitations = [];
  expect(() => renderResearchDraft(d)).toThrow();
});
it.each(["date", "unicode", "reference", "status"])(
  "rejects invalid %s",
  (mode) => {
    const d = draft();
    if (mode === "date") d.assessmentDate = "2026-02-30";
    if (mode === "unicode") d.items[0].summary = "\ud800";
    if (mode === "reference") d.items[0].reference = 'x" onclick="x';
    if (mode === "status") d.status = "approved";
    expect(() => renderResearchDraft(d)).toThrow();
  },
);
it("keeps empty and unknown evidence inconclusive", () => {
  const d = draft();
  d.items = [];
  d.status = "inconclusive";
  d.synthetic = null;
  const a = renderResearchDraft(d);
  expect(a.html).toContain("Evidence classification unknown");
  expect(a.html).toContain("Inconclusive");
  expect(validateResearchDraftArtifacts(a).items).toHaveLength(0);
});
it("rejects repeated references", () => {
  const d = draft();
  d.items.push({ ...d.items[0] });
  expect(() => renderResearchDraft(d)).toThrow();
});
