# RankXAI measurement and verification comparison

The [source receipt](content-search-audit-rankxai-measurement-review.json) binds
complete reads of measurement/verification references, GSC/log helpers and the
GSC helper's direct local CLI import at the previously reviewed immutable pin.
This is static review; no upstream code, API request or vendor IP lookup ran.
The earlier [content-review disposition](content-search-audit-rankxai-disposition.md)
and reference-only selection remain in force.

## Useful boundaries

The measurement reference distinguishes mentions, citations, recommendations,
referrals and crawler requests; separates branded prompts; and records engine,
settings, dates and repeated observations. These are appropriate dimensions to
compare with our existing measurement contract. Its proposed panel sizes, repeats
and cadence are planning heuristics, not a universally sufficient sample. Repeated
answers are not necessarily independent observations. A Wilson interval alone
does not remove shared prompt, account, engine or time dependencies.

Do not inherit cited empirical multipliers or platform preferences without reading
their original study and population. The verification reference's hierarchy also
does not make every experiment more authoritative than a platform's documented
interface: method suitability depends on the claim being evaluated.

## GSC helper: static limitations

| Inspected behavior                                                         | Consequence                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readExport` substitutes zero for absent or unparseable clicks/impressions | An impressions-only export gets fabricated click values; malformed numeric cells lose their unknown state.                                                                                      |
| `kindOf` accepts dimensions plus impressions without clicks                | The preceding substitution is reachable for legitimate impressions-only data, not just malformed files.                                                                                         |
| `trend` selects first/last N distinct recorded dates                       | With missing dates, these are not necessarily N-calendar-day windows. Coverage must be explicit.                                                                                                |
| Aggregation/cannibalisation helpers combine query/page rows                | They require compatible properties, periods, filters and locale/device scope from the caller. Two pages sharing a query are candidates for investigation, not proof of harmful cannibalisation. |
| Low-CTR gap uses the same export's position buckets                        | It is a descriptive comparison; it does not estimate guaranteed recoverable clicks or isolate the cause of CTR differences.                                                                     |

These conclusions follow from source control flow. No probe was run in this pass.
The GSC helper imports the CLI module, whose network reader bounds bytes and
redirects but does not implement our exact-origin/private-address authorization.
Its local file and stdin reads also lack our audit input-root policy. None of these
helpers is being adopted as the custom collector.

## Current primary-source check and product implication

Google documents a Generative AI Search report covering impressions from AI
Overviews and AI Mode, with page/country/date/device grouping. Page and property
aggregation differ; table limits apply. It also warns that unavailable values
shown as `~` or `-` become zeros in downloaded data. Preserve that export ambiguity
instead of asserting every zero is an observed absence.
[Google Generative AI report](https://support.google.com/webmasters/answer/16984139).

The ordinary Search Performance report has clicks, impressions, CTR and position,
and likewise distinguishes chart/property from page aggregation. It is a different
measurement contract. [Google Search Performance](https://support.google.com/webmasters/answer/7576553).

Our inspected `search-console.mjs` importer accepts supplied Search Analytics API
response records and requires all four numeric metrics. It rejects a row missing
clicks rather than filling zero. That is correct for its declared API contract;
it is **not** an importer for the impressions-only UI report. Retain such a UI
export as separately scoped evidence until an explicit adapter is implemented;
do not relabel it ordinary API data, citations, or per-answer observations.
No claim that Google exposes no AI-specific report should be carried forward.

## Log helper boundaries

Useful distinctions include user-agent claims versus verified crawler identity,
parsed versus unparsed lines, status mix, and search versus training purposes.
However, `pathOnly` drops authority from absolute request URLs; aggregation by
path therefore requires a single-host source or a separately preserved host key.
Flattened JSON aliases also require knowledge of the actual provider schema and
trusted proxy chain. A first comma-separated address is not automatically the
client's verified origin.

`isRefusal` omits 401 and labels all 5xx together with 403/429; preserve exact status
and intended access semantics rather than reusing that label as a page-quality
finding. CIDR matching can support an identity check only when the range source,
its capture time and the log's time window are known. This pass read the parser,
not the crawler roster or live verification entrypoint; their behavior is not
certified here. Log traffic is not citation evidence.

## Decision

Keep the family reference-only. No customer entrypoint, inherited source pin,
package file or frozen 0.1.31 archive changes. This review closes the named local
body-read gap and identifies a distinct UI-report input contract; it does not
claim full repository, external-study or native semantic acceptance.
