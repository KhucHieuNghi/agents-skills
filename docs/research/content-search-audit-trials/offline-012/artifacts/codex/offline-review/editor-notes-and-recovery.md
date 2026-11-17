# Editorial notes and recovery plan

The synthetic export contains all four declared files, with no outstanding discovery queue. Review covered the three available text snapshots. The fourth file, `guide.pdf`, was inventoried and is unsupported without an extraction. The helper reports zero fully audited, three pending, one unsupported and zero excluded, failed or blocked items. It planned 104 checks, with 8 assessed as pass or fail, 4 not applicable and 92 unknown. The audit is partial.

[Markdown audit](report.md) · [HTML audit](report.html) · [Action CSV](content-actions.csv) · [Coverage JSON](coverage.json)

| File and evidence | Editorial reading and action |
| --- | --- |
| `pricing.md` lines 6 and 9 | **Fix first.** The draft's worldwide $19 monthly claim conflicts with the US monthly policy of $29 before applicable taxes, effective 2026-10-01. Unlimited storage conflicts with the 100 GB allowance. The supplied policy leaves other markets and annual terms open. The contradiction is within this file. |
| `huong-dan.md` lines 1 and 5–9 | **Keep the existing instructions and caveats.** For the inferred editorial question “Làm cách nào để xuất dữ liệu tài khoản?”, the guide gives the sign-in, Data, CSV export and download sequence. It limits scope to the current account, excludes attachments, gives a manual workaround and states there is no processing-time guarantee. Product behavior still needs validation against product evidence. |
| `app.html` line 1 | **Capture the route before editing.** Raw source declares English and the title “Example app”. Its body has an empty mount and the head references `/app.js`. No rendered content or route purpose is evidenced. |
| `guide.pdf` inventory entry | **Obtain a transcript.** Language, task, claims, accessible text and relationships cannot be assessed from the inventory entry. |

The English pricing document and Vietnamese CSV guide serve different tasks. There is no evidenced translation pair or cross-file contradiction in the readable passages. The three text snapshots show no navigational links to one another. The app reference is a script asset. Rendered links, PDF links, live orphan status, duplication involving the app or PDF, and query cannibalization remain unresolved.

## Evidence to collect for a follow-up revision

1. **Content owner** supplies a PDF transcript or text extraction keyed to the original page numbers, with language, link targets and relevant figure descriptions. Keep the original PDF identity in the inventory and bind the extraction to the same item. Refresh into a new run using a supported extraction input or adapter so the unsupported collection state can be reconciled. Revisit claims, tasks and portfolio relationships after extraction.
2. **Frontend owner** supplies captured rendered DOM and initial markup for the app route, with expected page purpose and visibility. Compare main text, headings, metadata, structured data and navigation. For the Markdown documents, obtain owner-supplied published markup only if they correspond to deployed pages.
3. **Product and editorial owners** supply the dated plan policy and version history, plus CSV export specifications or verified UI captures for the Vietnamese guide. Validate actual click paths, attachment availability and limits. Supply anonymized support or search questions in English and Vietnamese to resolve question coverage and audience-task gaps. Treat the question in the table as an editorial test.
4. **Search owner** supplies any deployment mapping, intended visibility, redirects and response headers, canonical and locale relationships, crawler policy, sitemap, complete link graph and webmaster index evidence. If performance is in scope, attach dated Search Console and Bing query/page exports, GA4 landing-page data, normalized logs and field performance evidence where available. Preserve capture scope and distinguish missingness from measured zero.
5. **Measurement owner** supplies dated AI response captures from explicitly named surfaces, with a versioned English/Vietnamese prompt set, locale, market, model when exposed, search mode, repetitions, response artifacts, citations and capture errors. Compare compatible cohorts using separate denominators for annotated mentions and reviewed citations. Adjudicate answer accuracy against dated product evidence. No surface was measured here. AIO in this audit refers to AI search optimization. No Google AI Overviews observations were supplied.
6. **Audit reviewer** preserves this run, records supplied evidence in a new helper revision, updates dependent checks and validates the result. Completion requires all applicable checks to resolve; editorial fixes alone cannot close missing evidence.

Evidence IDs and locators are in the [evidence manifest](evidence.jsonl). The [check manifest](checks.jsonl) records unresolved requirements per item.
