/** Deterministic delivery facts only; callers validate coverage and attachments first. */
export function deliverySummary(
  coverage,
  completionAllowed,
  measurementDocuments,
) {
  const studies = measurementDocuments["study-evidence.json"];
  const count = studies ? JSON.parse(studies).sources.length : 0;
  const attachment = (name) =>
    name in measurementDocuments ? "attached" : "not attached";
  return `${completionAllowed ? "Complete for declared scope" : "Partial"}. ${coverage.total} declared items; ${coverage.audited} fully audited. Audit coverage is separate from content quality and measured performance. Historical study sources attached: ${count}; historical results are not current brand performance. Response-level AI observations: ${attachment("ai-observation-evidence.json")}. Search Console exports: ${attachment("search-console-evidence.json")}. GA4 exports: ${attachment("analytics-evidence.json")}. Bing exports: ${attachment("bing-evidence.json")}. Server-log exports: ${attachment("server-log-evidence.json")}. Attachment status describes this report only, not all evidence available to the customer. Consult the detailed evidence for dates, scope, synthetic labels, observations and limitations. Missing measurements remain unknown, not zero. Structural validation does not establish semantic accuracy.`;
}
