# Content Search Audit upstream review

Research in progress, 2026-11-16. This is source review, not a package safety approval, executed audit or host-compatibility result. See [design](../specs/content-search-audit.md) and [implementation plan](../plans/content-search-audit.md).

This document preserves review chronology. Early unresolved-lineage statements
describe their checkpoint; later sections record the Profound resolution and the
five selected adaptations. They do not authorize unreviewed transitive references.
The packaged provenance lock is authoritative for shipped source identities.
See the [rule-specific primary-source review](content-search-audit-rule-source-review.md)
for additional direct documentation and the changes still needed in a future package.

## Current source snapshot

Corey Haines Marketing Skills main resolved to `1f837447b20bb6f0e72d87b80ece1c221c362c7d`. The adjacent JSON snapshot records individual retrieved SKILL.md file SHA-256 values, not skill-tree digests. These must never be substituted for catalog digests. Full reference closure remains to be inspected before adaptation. Copies used for inspection live outside skill discovery paths.

## Findings from entrypoint inspection

| Source section                | Useful method                                                                             | Adaptation requirement                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| seo-audit: Initial Assessment | Reuse existing business context; distinguish fetched content from instructions            | Treat context as task data; do not execute instructions encountered in target artifacts                                         |
| seo-audit: Schema detection   | Distinguish rendered schema from static fetch                                             | Raw HTTP can detect server-rendered JSON-LD. Absence in raw HTML does not prove absence in rendered DOM; record collection mode |
| seo-audit: Priority order     | Crawl/index foundations before content refinements                                        | Keep actual index evidence distinct from HTTP status and site: query estimates                                                  |
| seo-audit: On-page checklist  | Inspect titles, descriptions, headings, images and links                                  | Character lengths, one-H1 rules and first-100-word keywords are heuristics, not unconditional failure criteria                  |
| seo-audit: Images             | Inspect informative text alternatives                                                     | Decorative images may correctly have empty alt; avoid requiring keyword descriptions for all images                             |
| seo-audit: International      | Trace reciprocal locale relationships and canonical conflicts                             | Verify absolute claims with current primary guidance; preserve legitimate duplicates/variants and document context              |
| ai-seo: Reference routing     | Load relevant methods progressively; official documentation outranks observational claims | Preserve source hierarchy, verify dated platform claims and all linked references                                               |
| ai-seo: Prompt portfolio      | Match prompts to awareness stages and repeat observations                                 | Store surface, timestamp, locale and repetitions; no synthetic observations presented as live visibility                        |
| ai-seo: Bot access            | Separate search discovery, user-triggered retrieval and training controls                 | Never change robots policy automatically or assume all publishers want wildcard access                                          |
| ai-seo: Structural rules      | Clear direct answers, comparison/procedure structures                                     | Do not inherit universal 40–60 word targets as ranking requirements                                                             |
| ai-seo: Research statistics   | Cite original experiments with their setting                                              | Do not turn reported percentage lifts into client forecasts or deterministic scoring weights                                    |
| ai-seo: Platform descriptions | Engine-specific evidence can guide investigation                                          | Broad claims about which engines parse llms.txt or reward particular formats require independent verification                   |

These are review observations, not accusations of unsafe intent. Good workflow structure can coexist with overgeneralized advice. The custom skill must reconcile them rather than concatenate instructions.

## Source links

- [SEO audit at reviewed revision](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/seo-audit/SKILL.md)
- [AI SEO at reviewed revision](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/ai-seo/SKILL.md)
- [Google AI features](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI crawler purposes](https://developers.openai.com/api/docs/bots)

## Remaining source work

Read all selected reference closures, compare current license text and file notices, inspect any collector scripts, and complete additional-family reviews before final component selection. A retrieved entrypoint is not a reviewed package. No upstream executable code was run for this review.

## Full source inventory and inheritance boundaries

The checkout at the recorded commit is now available and root MIT text has been inspected (copyright Corey Haines, 2025). `content-search-audit-source-inventory.json` records every regular file and skill-tree digest for seven candidate folders using the repository's path/NUL/file-hash/newline convention. Inventory is complete for these folders; semantic review is not. No catalog pin has changed.

Additional inspected material: schema entrypoint; copy-editing clarity, proof and specificity passes; content-strategy intent and information-gain sections; ai-seo answer-accuracy and prompt-portfolio references. Reuse candidates include claim evidence checks, intent maps, structured-data/content consistency and measurement provenance. Do not inherit fictional expert-panel scores as independent expert validation, mandatory emotional amplification for documentation, or numerical specificity without real data.

### Transitive attribution discovered

The ai-seo references explicitly attribute several frameworks to Profound: answer-accuracy, prompt-portfolio, ai-attribution, agent-defaults, content-patterns, citations-vs-recommendations, and multilingual-and-commerce. Prompt-portfolio also credits Jam. The MIT assertion in those references is not a substitute for locating original license texts and their exact source revisions. These derived frameworks remain on hold for adaptation until lineage is resolved. Independent measurement contracts in the design remain proposals, not a claim that those references have been cleared for redistribution.

### Correction to earlier research

The earlier chat described Google's government/health FAQ rich-result exception using a 2023 announcement. Current [Google documentation updates](https://developers.google.com/search/updates) state FAQ rich results stopped appearing starting May 7, 2026. Schema.org semantics and Google feature eligibility must be separate rule fields; do not prescribe FAQ markup to obtain retired Google appearances. The schema upstream explicitly records this distinction. Date-sensitive claims must be refreshed from the primary source at release review.

### Additional repository revisions resolved

| Candidate                      | Revision                                 | Scope of verification                         |
| ------------------------------ | ---------------------------------------- | --------------------------------------------- |
| AgriciDaniel/claude-seo        | 468ed5b0d9e3249394783710e54abb02837e326b | HEAD resolution only; not full package review |
| zubair-trabzada/geo-seo-claude | 989cae01e8ebbc42a9ec798eb9e7cb423f5ec89c | HEAD resolution only; not full package review |
| rankxai/seo-geo-skills         | cba1bc61c981a8d9dcee6f1d211a8f18c74277c3 | HEAD resolution only; not full package review |

## Profound lineage resolution and method selection

Located the [source repository](https://github.com/retieedra-profound/skills-marketing-library/tree/80293f156c27d3f90aedebfb3c27309769b2eec6) through the skills.marketing directory. Its README identifies it as the directory source, with company-organized skills. At revision `80293f156c27d3f90aedebfb3c27309769b2eec6`, the root LICENSE contains MIT permission and `Copyright (c) 2026 Profound`. This resolves the previously missing repository/license for the Profound family; it does not establish which historical revisions Corey adapted, nor resolve Jam attribution. The separate snapshot records the three fully read entrypoints, their complete single-file folder hashes, and the actual license hash. No upstream code was executed.

| Reviewed module             | Selection                                         | Adaptation for our single skill                                                                                                                                                                                                               | Required evidence / fixture                                                                                                   |
| --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ai-answer-accuracy-auditor  | Adapt claim verification and verdict distinctions | Verify customer-provided AI answers against dated facts; distinguish inaccurate from accurate-but-negative claims. Recommend corrections, never edit sources automatically. No accuracy percentage without a defined adjudicated denominator. | Supplied answer, surface/date/locale, authoritative fact record; stale price, subjective framing, unverifiable claim fixtures |
| ai-prompt-portfolio-builder | Adapt cohort/versioning discipline                | Stable core, exploratory and diagnostic cohorts; preserve natural questions and segment surfaces. Do not inherit once-daily monitoring as a universal schedule or create recurring jobs without request.                                      | Prompt provenance, cohort version, repeats, common-cohort comparison; missing demand and changed-cohort fixtures              |
| aeo-operator-2026           | Adapt diagnostic separation                       | Access, retrieval, citation, brand representation and business effects are separate questions. Remove optional 100-point score and vendor-specific mandatory inputs. Apply target read-only boundary to every correction workflow.            | Distinct crawl, citation, mention and conversion evidence; crawler-access-with-no-observation fixture                         |

Direct adaptation from these pinned original modules is preferable to adapting Corey's derivatives for the same method: it reduces uncertain historical lineage and duplicate wording. Preserve Profound's license and attribution in the package if these methods are adapted. Corey remains useful for complementary SEO/content procedures. Unreviewed Profound modules, vendor studies and Jam content are not cleared by this review.

The upstream's observational research statistics are not independently verified here and will not become rules, scoring weights or customer forecasts. Its cited official platform mechanics still require current primary-source validation for each shipped rule. The repo's absence of scripts in these three folders establishes that they are procedural prompts; it does not demonstrate host execution quality or audited-site coverage.

## Packaged method selection checkpoint

The candidate now adapts five entrypoints into six internal methods. These are
procedural adaptations, not unmodified upstream packages or a claim of equivalent
upstream runtime behavior. The lock records full source-folder hashes for identity;
only the selected entrypoint sections below are inherited. Linked upstream
references, external studies, related skills and executables are not copied.

| Destination           | Source entrypoint / selected sections                                                                       | Changes and rejected assumptions                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| content-quality       | Corey seo-audit / Content Quality; Profound answer-accuracy / Workflow and Severity                         | Claim-level dated evidence; unknown expertise stays unknown; no detector-based authorship findings or generated numerical score            |
| technical-seo         | Corey seo-audit / Initial Assessment, Priority Order, On-Page and Output                                    | Static/rendered evidence split; no universal title/description length, one-H1 or first-100-word rule; index claims require actual evidence |
| ai-search-readiness   | Profound aeo-operator / Evidence Protocol, Visibility Stack, Technical Eligibility                          | Surface-specific readiness; no all-bot allowance, special schema requirement or inferred measured citation                                 |
| answer-quality        | Profound answer-accuracy / Claim Verification; aeo-operator / Content Opportunity                           | Real questions and necessary context; no fixed answer lengths, automatic FAQ creation or suppression of accurate negative claims           |
| generative-visibility | Profound prompt-portfolio / Portfolio and Workflow; answer-accuracy / Verdicts; aeo-operator / Measurement  | Explicit denominators, stable cohorts, surface separation; no default monitoring purchase, universal cadence or client lift forecast       |
| content-portfolio     | Corey content-strategy / Before Planning, Information Gain, Topic Clusters, Buyer Stage and Research Inputs | Audience/task matrix; no fixed weights, calendar allocation, fabricated volumes or automatic consolidation                                 |

Each method links to the packaged notice. MIT texts are copied unchanged. The
provenance reviewer field explicitly identifies automated review and pending human
release evaluation. Primary Google AI-feature and people-first content guidance,
and OpenAI crawler documentation were refreshed on 2026-11-16. Platform-specific
technical rules still need individual validation when added to the rule registry.

Additional families remain comparison candidates; absence from this initial
adaptation is not a quality judgment. The current package does not yet satisfy the
complete source-research plan or commercial release gates.

## Additional-family comparison from live source

Checked 2026-11-16. The adjacent comparison snapshot records immutable revisions,
GitHub API adoption metadata and SHA-256 of inspected source files. File hashes
identify inspected bytes, not a claim that all references/scripts were reviewed.
No upstream executables or installers were run and none of these three families
has been added to the package provenance lock.

| Candidate and source                                                                                                                                                                                                                                                            | Adoption snapshot         | Useful capability                                                                                                                  | Conflict with our contract                                                                                                                             | Decision                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Claude SEO audit](https://github.com/AgriciDaniel/claude-seo/blob/468ed5b0d9e3249394783710e54abb02837e326b/skills/seo-audit/SKILL.md)                                                                                                                                          | 29,632 stars; 3,739 forks | Raw/rendered capture, API adapter routing, category artifacts, field/lab data distinction, update-correlation caution              | General link crawl caps at 500 pages; weighted health score; plugin-root wrapper and numerous specialized host integrations                            | Reference architecture for future optional adapters. Do not import its installer, aggregate score or whole plugin; our full inventory requires remaining-queue accounting beyond any batch cap. Its Shopify exception explicitly has a separate uncapped sitemap workflow. |
| [GEO SEO Claude audit](https://github.com/zubair-trabzada/geo-seo-claude/blob/989cae01e8ebbc42a9ec798eb9e7cb423f5ec89c/skills/geo-audit/SKILL.md)                                                                                                                               | 11,700 stars; 1,754 forks | Business-type intake and readable per-category remediation layout                                                                  | 50-page hard cap, HTML-only scope, five-agent orchestration, weighted GEO score tied to citation likelihood; llms.txt absence treated as high priority | Reference-only. Do not inherit limits as full coverage, score interpretation, automatic crawler recommendations or claims of visibility lift. Our unsupported items stay in inventory and readiness stays distinct from actual observations.                               |
| [RankXAI content review](https://github.com/rankxai/seo-geo-skills/blob/cba1bc61c981a8d9dcee6f1d211a8f18c74277c3/skills/content-review/SKILL.md) and [SEO/GEO](https://github.com/rankxai/seo-geo-skills/blob/cba1bc61c981a8d9dcee6f1d211a8f18c74277c3/skills/seo-geo/SKILL.md) | 1 star; 0 forks           | Source round-trip verification, data-collection date versus publication date, explicit denominator checks, offline GSC/log tooling | Some prescriptive checklist rules (one H1, fixed answer length, link counts), final draft score, broad cross-platform research interpretations         | Method-comparison and fixture source candidates. No automatic adoption based on evidence labels; primary claims and script behavior still need verification. Low adoption is not proof of poor quality.                                                                    |

Stars/forks are time-bound discovery signals from GitHub's repository API, not
execution accuracy, security or commercial readiness. Counts can change. Root MIT
texts were read for all three; Claude's audit folder license points to root MIT.
RankXAI NOTICE additionally includes SlopMonster attribution for prose-checking
code and claude-seo lineage for its Google-change candidate list. Copying those
parts would require preserving that closure rather than only the root notice.

### Important source-level distinctions

Claude SEO's current GEO entrypoint explicitly labels its weights heuristic and
warns that several statistics were not reverified. It assigns no citation-ranking
weight to llms.txt. Do not characterize every GEO repository as making the same
claims: Zubair's inspected audit entrypoint has materially different score and
llms.txt prescriptions. We reject those prescriptions for this product rather
than treating popularity as a correctness vote.

RankXAI's selected content-review procedure is particularly useful for adversarial
fixtures: a live source URL that does not support the attached claim; data collected
long before the publication date; confusing a response-level rate with a share of
all citations; and conflicting studies with different populations. Our measurement
contract already separates denominators, but a complete semantic evaluation set
must test these failure modes explicitly. Its recommendation to score a draft out
of ten is not inherited.

### Collector inspection boundary

Zubair's inspected fetch_page function accepts HTTP(S) and calls requests.get with
automatic redirects, then parses response.text with BeautifulSoup/lxml. Its displayed
request path does not implement our allowlisted-host, resolved-address and bounded
body contract. This is a reason not to copy that function as our collector, not a
claim of a proven exploit against a deployed service.

The inspected RankXAI shared fetch helper checks protocols, handles redirects
manually and bounds decoded body reads; its crawl-specific path additionally stops
off-site redirects. Those are useful implementation comparisons. The excerpts do
not establish DNS pinning/private-address enforcement or full SSRF resistance.
Full script/dependency review is required before any reuse. No upstream collector
was executed against a target during this review.

### Capability gaps retained after comparison

- Optional rendered-browser capture and field-versus-lab performance evidence need
  an explicit adapter and unavailable-state handling.
- GSC, Bing, analytics and server-log imports remain separate from AI observation
  rates. Credential availability must not cause implicit paid requests.
- Locale, commerce and local-business checks need conditional evidence plans; a
  common score cannot replace their distinct applicability.
- Source round-trip, stale data and denominator-confusion fixtures must be added
  to semantic host evaluation before the candidate is called production-ready.

TheSmokeDev, Gaguero and Aaron's current family remain unresolved comparison work;
none is silently cleared or included by this checkpoint.

## Remaining named candidates: selected-entrypoint review

The previous unresolved-comparison list is superseded by the selected-source review
below. This closes initial triage of the named families, not their complete runtime
or redistribution review. They remain unbundled.

| Source                                                                                                                                                                                                                                                                                   | Verified scope and useful distinction                                                                                                                                                                                                                    | Decision                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TheSmokeDev geo-measurement](https://github.com/TheSmokeDev/geo-skills/blob/35810d3ee8aa6cf1de151c9ea79265237c71df7b/skills/geo-measurement/SKILL.md)                                                                                                                                   | Full selected entrypoint and root MIT read. 32 stars / 6 forks. Separates response citation rate from citation-instance share and emphasizes fixed panels/per-engine reporting.                                                                          | Keep as measurement comparison. Do not inherit universal 60–100+ prompt size, fixed rolling windows, three-run significance rule, an exclusive ChatGPT index assumption, or the inference that a panel-wide drop proves a platform event. Repeated observations support investigation, not causal identification by themselves. |
| [Gaguero quality gates](https://github.com/gaguero/seo-agent-skills/blob/43a9e14a6c7257af3996e158a238ac5968ab7ca5/seo-quality-gates/SKILL.md) and [AI search](https://github.com/gaguero/seo-agent-skills/blob/43a9e14a6c7257af3996e158a238ac5968ab7ca5/ai-search-optimization/SKILL.md) | Both full entrypoints and MIT read. 0 stars / 0 forks. Explicit missing-data, fabricated-fact and technical-change gates are useful review contrasts.                                                                                                    | Keep as guardrail benchmark, not a new runtime dependency. Its crawler paragraph groups training/search controls too broadly; its categorical cannibalization and content-quality blocks need applicability/evidence review. Existing custom boundaries already cover the useful non-fabrication/read-only requirements.        |
| [Aaron content-quality-auditor](https://github.com/aaron-he-zhu/aaron-marketing-skills/blob/8ec9e1f65c8ff55725ffb0d44683633334a8d851/seo-geo/tune/content-quality-auditor/SKILL.md)                                                                                                      | Full selected entrypoint and Apache-2.0 text read. Current umbrella 3,145 stars / 400 forks. Typed 80-item profile, no missingness renormalization, conditional N/A, distinction between completion and findings, immutable standalone runtime fallback. | Reference for coverage/evaluation rigor. Do not import all 120 skills, scorer-specific score/veto semantics, host metadata or memory-write workflow. Full scorer/catalog/runtime closure is not reviewed; no automatic compatibility claim.                                                                                     |

The old [Aaron SEO/GEO repository](https://github.com/aaron-he-zhu/seo-geo-claude-skills)
currently says it is a signpost. Its 248 stars / 32 forks belong to that historical
repository, not the current umbrella. The unchanged standalone line is identified
there as v9.9.12. Current reviewed entrypoint paths use `tune` and `implement`;
older migration-table paths in the signpost must not be used as install proof.

### What this changes in our implementation plan

1. Add semantic evaluation cases for denominators, stale underlying data, source
   support and panel-wide changes without causal proof. Do not add another
   heuristic score to represent those uncertainties.
2. Keep one registry/coverage truth per run. Aaron's unknown/N/A separation is a
   useful comparison, but our own schema and evaluator must prove their behavior.
3. Keep network collection original and bounded until a selected upstream
   collector passes our full allowlist/DNS/redirect/body/runtime review.
4. Prefer direct attribution to five already selected Corey/Profound entrypoints;
   the six comparison families do not add enough cleared, unique v1 behavior to
   justify shipping their larger dependencies now. Reopen selection if a required
   adapter or domain-specific capability is demonstrably missing.

All adoption counts in this section were read from GitHub's repository API on
2026-11-16 and are not quality rankings. Research claims inside upstream methods
were inspected as claims, not independently replicated experiments.

## Additional local-reference inspection during public pilot

Fully read Corey seo-audit references/title-tags.md and references/international-seo.md
at the existing locked revision. Their bytes match the recorded source inventory:
title reference SHA-256 c40b3c6af3600ca15670db8eb81000c7ca6fa25265a6550ccc630f53db3fcf51;
international reference SHA-256 0603022cca968acf7889fc224221aa0e70955ba64355bc18b06f7e86b32f45e5.
Neither file is copied or newly adapted into candidate 0.1.4.

The title reference offers useful topic/title alignment and evidence-led proposal
formatting, but its deterministic CTR diagnosis, position/length prescriptions and
causal attribution from a single before/after edit are not adopted. A low CTR has
multiple possible causes; a descriptive title proposal needs actual page and query
context. The international reference usefully distinguishes genuine translations
from same-language regional duplicates and optional x-default. Its mandatory
framework settings, broad cross-engine statements, fixed sitemap partition advice
and vendor prevalence statistics remain reference-only without independent
rule-specific validation. Current Google localized-version and canonical guidance
was inspected directly in the linked primary-source addendum.

This closes inspection of these two local files only, not all remaining references,
linked studies, external framework docs or their transitive licensing. The five
selected entrypoint-section adaptations and their immutable pins are unchanged.

## Selected Corey reference closure, 2026-11-16

All nine reference files in the locked `seo-audit` and `content-strategy` folders
have now been read. Each file hash was checked against the retained source
inventory. The [reference decision receipt](content-search-audit-selected-reference-review.json)
records inclusion boundaries per file. Seven newly read files supplement the
previous title-tags and international-seo review. No upstream code was executed
and no new text was copied into the package.

| Reference                      | Decision for the custom audit                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI writing detection           | Exclude authorship detection by punctuation/vocabulary. A style preference is not evidence of machine authorship or search harm.                  |
| Rankings push                  | Use customer baselines as investigative context; reject automatic merging, fixed counts/timelines and inferred causal explanations for rankings.  |
| Headless CMS                   | Inventory draft/public identities when supplied. Exclude vendor implementation, pricing claims, publishing operations and fixed metadata lengths. |
| Content distribution           | Preserve source/derivative relationships. Exclude distribution execution and unsupported reach, cadence and half-life prescriptions.              |
| Local SEO                      | Conditional review only for declared locations with actual evidence; separate local pack from organic results.                                    |
| Profile and citations          | Verify public facts without exposing private addresses; current platform eligibility must be checked before advice.                               |
| Location pages and measurement | Distinguish real branches from service coverage and observations from outcomes; no fabricated addresses or display promises.                      |

Links from these references to other skills, CMS integrations and marketing loops
are excluded from inheritance; they are not silently treated as reviewed
components. No local-profile connector or CMS mutation capability is added.
Selected-folder reference review is closed at the recorded revision; current
platform-policy verification for conditional recommendations and final package
source mapping remain separate gates.

## Aaron: quyết định sau khi đối chiếu dependency

Đã đọc thêm runtime contract, catalog CORE-EEAT, scorer và các reference liên quan;
ba probe tổng hợp xác nhận khác biệt giữa hướng dẫn ngắn/local reference và
scorer về N/A, một veto và hai veto khi còn thiếu bằng chứng. Giữ nhóm này ở mức
reference-only; không nhập scorer, refinement loop hoặc runtime vào package.
Xem [quyết định có nguồn và bằng chứng thực thi](content-search-audit-aaron-disposition.md).
Đây là quyết định cho bản bundle hiện tại, không phải review toàn bộ repository.

## RankXAI: quyết định sau khi kiểm tra helper

Đã đọc các reference và dependency của source/overlap checker, chạy bốn probe
có kiểm soát. Exit 0 có thể còn nguồn unknown; một con số trùng trong link không
chứng minh claim có nguồn; overlap không chứng minh cần gộp nội dung. Giữ nhóm
này reference-only, không nhập runtime hoặc workflow tự rewrite vào bundle.
[Báo cáo, bằng chứng và giới hạn](content-search-audit-rankxai-disposition.md).

## TheSmokeDev và Gaguero: chốt phạm vi kế thừa

Giữ hai nhóm ở mức reference-only. Đã đối chiếu phương pháp đo với các ví dụ
mẫu số, chạy bốn probe CLI và hai case schema, đồng thời kiểm tra tài liệu
provider về crawler và hidden text. Không nhập suy luận nhân quả, publication
gate hoặc regex linter vào bundle. [Quyết định và bằng chứng](content-search-audit-geo-gates-disposition.md).

## Quyết định nguồn cho bundle hiện tại

Đã có quyết định cụ thể cho cả sáu nhóm so sánh: reference-only, không nhập
runtime. Năm skill nguồn đã chọn tiếp tục cung cấp phương pháp qua provenance
lock. [Bảng quyết định nguồn](content-search-audit-source-decisions.json) liên kết
bằng chứng cho từng nhóm; [đối chiếu AgriciDaniel/Zubair](content-search-audit-orchestrator-disposition.md)
ghi rõ giới hạn crawl, ngoại lệ Shopify, score và dependency. Hoàn tất quyết định
lựa chọn không có nghĩa đã review mọi file của các repository hoặc đạt nghiệm thu
ngữ nghĩa; các điều kiện phát hành còn mở.

## Former Codex URL disposition — current 0.1.26 research checkpoint

The original design's remaining host-comparison URL redirects to chatgpt-seo.
Thirteen selected documents at b9dd5c8fab722c7610184927a902ca689165d322 were read;
current replacement, legacy implementation and mixed notices are distinguished.
See [disposition](content-search-audit-chatgpt-disposition.md) and the hash-bound
[source receipt](content-search-audit-source-closure-0126.json). The runtime and
legacy code are excluded. This adds a research decision, not a supported host or
new inherited source. All five selected source trees and package mappings were
rechecked unchanged against their respective locks.

## Additional Corey support-entrypoint comparison

Five full entrypoints at the existing Corey revision now have explicit
[reference-only dispositions](content-search-audit-corey-support-disposition.md)
and file inventories. This extends the earlier editorial/schema comparisons to
analytics, public competitor claims, competitor profiling and scaled content.
Linked reference/evaluation bodies and vendor integrations are not silently
cleared by these entrypoint reads. No copied content or package modification.

## Additional Corey AI SEO / schema comparison

Reviewed eight file bodies at the existing immutable Corey commit and inventoried
20 files. The schema package is `skills/schema`, not `schema-markup`. Both packages
remain reference-only. Three live Google documentation checks distinguish Article
recommended fields, Product snippet property alternatives and AI feature eligibility
from upstream blanket requirements. See content-search-audit-corey-ai-schema-review.json
and content-search-audit-corey-ai-schema-disposition.md in docs/research.

Unreviewed references/evals and linked external methods/tools remain explicitly
outside review closure. No package bytes, source pins or native trial results were
changed. The broader Task 1 review checklist and host acceptance remain open.

## Corey AI SEO/schema local body review completed

All 20 local files across ai-seo and schema at commit
`1f837447b20bb6f0e72d87b80ece1c221c362c7d` have now been read, including 23 authored
eval scenarios (not executed). Hashes remain unchanged. The disposition records
per-reference exclusions and conflicting schema FAQ eval expectations; upstream
evals are not adopted as acceptance gold. Two additional official checks confirm
no Google preferred word count and non-exhaustive site-operator results.

This supersedes earlier eight-file/partial-local-review status for these two
packages only. External studies, tooling and additional attributed source families
remain outside reviewed closure. Both packages remain reference-only; frozen
candidate 0.1.28 and its unresolved native behavioral gate are unchanged.
