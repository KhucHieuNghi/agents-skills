# Index-control collector pilot — 19/11/2026

[JSON summary](summary.json) records eight restricted anonymous homepage captures: desktop/mobile for Cake, Infinity, QuokkaGuide and VBA. Final capture cohort is build/enterprise-index-public-002; earlier public-001 predates the pacing correction and is not used as release evidence. Raw headers, bodies and network records stay private.

All eight responses are HTTP 200 at the requested URL, and the collected origin robots policies allow Googlebot for those sampled paths. This does not prove actual Google access or indexed state. No page-level noindex was observed in the available projections; incomplete coverage prevents an absence conclusion.

| Site | Source-document projection | Rendered projection | Header and robots acquisition |
| --- | --- | --- | --- |
| Cake | Complete | Incomplete | Complete |
| Infinity | Incomplete (source scripting ambiguity) | Incomplete | Complete |
| QuokkaGuide | Complete | Incomplete | Complete |
| VBA | Incomplete (source scripting ambiguity) | Incomplete | Complete |

Restricted resources/request failures invalidate rendered coverage. Transport denial additionally occurred on QuokkaGuide and VBA. These acquisition limits are not website defects. The pilot's crawler allowance concerns Googlebot; the collector separately enforces NKSkills robots permissions and does not claim those policies are interchangeable.

The 24 owner-intent check instances remain unknown because no expected HTTP/crawl/directive policy was supplied. Zero new findings were asserted. [Report receipts](report-receipts.json) cover four JSON/Markdown/HTML appendices with two captures each; their 32 added check instances include eight additional provider-index-state unknowns. The full reports contain 72 unknown checks in total: 32 added checks and 40 retained intake placeholders. Earlier nine reviewed findings are unchanged and are not recounted here.

Reports and internal source runs are retained at build/enterprise-index-report-001. Requests specify exact URL/profile/environment/window, owner role, accepted artifacts and fallback. Next inputs are intended HTTP/crawl/indexing behavior plus complete rendered/source exports for restricted or ambiguous layers. Additional origins require their own collector policy support; an allowlist alone cannot make this collector inspect them. Do not send passwords or tokens.

The private-artifact and source digests in the summary bind retained bytes. They do not authenticate execution or establish commercial acceptance. This sample is not an exhaustive crawl, index count, provider verdict or ranking claim.
