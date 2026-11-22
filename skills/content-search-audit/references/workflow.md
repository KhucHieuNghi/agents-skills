# Audit workflow

## Scope and collection

Record customer goals, audience, markets, languages, site/content boundaries,
authorized sources and report location. Use a unique run ID. Record the package
version, configuration hash, input hashes, timestamps and discovery completeness.
Preserve original targets; audit output goes outside the installed package.

Enumerate all available authorized sources: sitemap URLs, internal links, CMS
exports, repository files, supplied documents and analytics landing pages. An
export can be complete for its declared snapshot without proving live-site
completeness. A homepage crawl is not automatically a site-wide inventory.

Capture the exact evidence surface: local export, raw HTTP, rendered DOM, search
console export, server log or AI response observation. Mark collection failures
and extraction limitations. Do not treat a PDF filename as its extracted content.

### Public website intake

Start with the supplied URL or domain. For a single page, assess that page and
use related public pages as supporting sources. For a domain, discover pages via
public sitemaps and internal links. Record the hosts, discovery limits, actual
inventory and unresolved discovery. If only a subset can be assessed, name that
subset and report the coverage gap explicitly.

Infer likely audience, market, language and intent from the public content and
label any inference used as an assumption. Ask only when the answer would
materially change the audit and public evidence cannot resolve it. Continue
work within the available scope.

- SEO: assess observed technical signals, content, internal links and discoverability.
  Index directives, sitemap entries and canonical hints do not establish indexing
  or rankings.
- AIO and AEO: assess clarity, question coverage, direct answers, evidence and
  extractability from the pages inspected. Label these findings as readiness.
- GEO: assess entity clarity, source attribution and whether claims can be
  corroborated. Record a mention or citation only when an observed response
  supports it, with its surface, query, date and scope.

Use optional exports or authorized connector results only when supplied or
requested. No account connection, database access or transaction reconciliation
is required for the public audit. Without provider or response evidence, leave
the corresponding measured outcome unknown and complete the public report. A
missing optional source is not a defect. Include the evidence for each finding,
priority actions and a retest. Keep assumptions separate from observed facts in
the canonical report and its rendered views.

### Supplied owner context

Before per-item review, collect the applicable facts already present in the task:
approved policy, intended task, audience, market, period, question or completeness
requirement. Preserve the relevant wording in an output artifact and attach it
through the ordinary review bundle. Use the rule's required evidence kind, such as
`claim-sources`, `audience-context` or `question-set`, only when the supplied
statement actually supports that role. Bind the record to its affected item and
identify its origin as the user/task statement, with actual capture time and
limitations. Several items may require separate attributed records referencing
the same preserved context.

An owner's supplied policy is an approved comparison basis for this audit; it is
not independent verification of the business, a public source or an observed
engine result. Preserve its dates, product, market and qualifications. Infer only
what the statement entails. A missing audience or question stays unknown when
none can be established from the task. Request only the unresolved information,
rather than asking for a policy that is already available. Apply the supported
semantic checks after attaching context; merely quoting the policy in narrative
does not update persisted checks.

### Unavailable rendering

Record the attempted authorized browser capture and its failure. Continue with
raw-source inspection and other available evidence. Source text can establish a
code-level issue; label that surface precisely and keep browser behavior unknown.
Execution in Node, a VM, a simulated DOM, an evaluator or a shell is not a fallback
for browser authorization. Do not run code extracted from the target. A request to
audit content does not authorize that execution, even when the code looks simple.

Keep browser and OS protections intact. Do not set sandbox-disabling flags or
environment variables, change security configuration or escalate permissions to
make an optional capture succeed. Record protection denials and continue the
partial audit with authorized evidence. A different capture method must preserve
the same authorization and isolation boundaries.

| Temptation after a capture failure                            | Required response                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The fixture is benign, so a sandbox bypass should be harmless | Keep protections intact; the content's apparent simplicity does not expand authorization.                           |
| A local VM can show the same result                           | Inspect the source as text; a simulated runtime is not the authorized browser.                                      |
| Full coverage requires making the browser work                | Report the unresolved rendered check and recovery evidence needed; complete inventory accounting is still possible. |

## Persist the declared inventory before prose

Create a config and run `start` from the installed package before composing the
findings report. Offline documents are valid inputs. Include each declared
content item; retain supplied context as attributed evidence. Scope completeness
refers to the declared input set, not the unseen live site. Use campaign commands
when partitioning is required. See [helper commands](helper-commands.md).

After semantic inspection, submit supported assessments and findings with
`review`; leave unsupported checks unknown. Run `validate` on the final revision
and retain its output. Report counts come from that revision, not a tally of
paragraphs, quotes or files opened. A valid partial run is useful: it records what
is still unknown without requiring live access. Quote verification is a separate
check of textual fidelity, not a substitute for this sequence.

If execution is actually unavailable, preserve the command/error and list missing
artifacts. Do not silently switch to a manual-only audit merely because the input
is small or synthetic. A custom prose report may accompany the validated run.

## Per-item review

| Dimension       | Questions                                                                                                                                           | Evidence boundary                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Content quality | Does it serve the stated audience and task? Are factual claims supported, current and internally consistent? Is there useful original information?  | Missing author information is not proof of missing expertise. Flag uncertain facts for verification. |
| SEO             | Can the content be discovered and accessed? Are index directives, canonicals, metadata, links, locale relationships and structured data consistent? | HTTP success is not index evidence. Raw HTML absence does not establish rendered absence.            |
| AIO             | Are entity facts, product details and relevant retrieval prerequisites coherent across sources?                                                     | Crawler access is separate from retrieval, citation, model training and user-triggered fetch.        |
| AEO             | Does the page directly and accurately answer relevant user questions, with necessary definitions, conditions and limitations?                       | No universal answer length, heading count or keyword density constitutes a pass/fail rule.           |
| GEO             | What evidence supports discoverability, citations, mentions and accurate brand representation on specified surfaces?                                | Readiness is not measured visibility. API output is not consumer-UI evidence.                        |
| Portfolio       | Are there contradictory claims, intent gaps, weak navigation, orphan items, duplication or locale discrepancies?                                    | Canonical targets do not authorize dropping variants. Cannibalization needs query/page evidence.     |

Read the applicable primary platform documentation before asserting changing
eligibility requirements. Record source/date. Treat upstream heuristics and vendor
studies as hypotheses, not universal ranking factors. Unsupported rules remain
research candidates. Do not recommend retired search features without verifying
current support.

## Reconciliation and delivery

Merge duplicate issues into one finding with multiple dimensions. Prioritize
observed material barriers and factual errors using severity, confidence, affected
scope, dependencies and effort. An uncertain opportunity is not a confirmed defect.

For each recommended action, identify affected item IDs, evidence, expected user
benefit, responsible role, dependency and a practical verification procedure.
Consolidation or removal is a proposal requiring a separate implementation task.

Deliver run metadata, inventory, evidence, checks, findings, coverage, action CSV
and Markdown/HTML report. Include optional AI observations only when collected.
Escape report HTML, neutralize CSV formulas, and inspect content for sensitive data
before sharing. Do not fabricate a global score or forecasts.
