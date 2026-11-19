# Public performance pilot — 19 November 2026

This is a mobile homepage lab supplement to the [four-site public audit](../enterprise-public-pilot-20261118/README.md), not a full website audit or enterprise commercial acceptance. The user authorized audits of Cake, Infinity Racing, QuokkaGuide and VBA. Collection uses anonymous fresh browser profiles, no form submission, account access, purchases or consent interaction. Embedded page requests still execute.

## Procedure and evidence

Lighthouse 13.6.0 navigation, performance category only, simulated mobile throttling, three sequential fresh-browser attempts per requested homepage, one local machine. Actual native settings/browser strings and raw JSON hashes are retained. Site order was Cake, Infinity, QuokkaGuide, VBA. The collector did not run concurrently with another pilot browser or full test suite, but this was a normal working machine, not dedicated benchmark hardware.

The protocol digest binds compact `JSON.stringify(protocol)`; the saved pretty-printed protocol has its own file hash. Raw Lighthouse JSON, source runs and execution receipts stay in the local `build/enterprise-performance-public-20261119/` evidence directory. Public normalized results and canonical customer reports preserve exact bytes in `frozen/`.

The initial report-building step used an invalid profile ID and failed after measurements had been saved. Original errors and captures remain unchanged. Corrected report import uses the business profile IDs from each original pilot. It does not reload stored receipts as trusted host authority: canonical reports show individual supplied measurements and explicit data requests, while the original in-process repeated summaries remain separately attributed historical evidence. There is no replacement run to erase a capture failure.

## Limits that affect interpretation

- All values describe the measured homepage, device simulation and collection window. They do not establish real-user CWV, SEO rankings, revenue effects, all-page performance or stable long-term averages. TBT is not field INP.
- No CrUX/RUM data was acquired. Canonical reports include a scoped PHONE field-data request, with owner, target and window; missing field evidence remains unknown.
- Native warnings and redirect mismatches remain partial. A returned Lighthouse score alone does not override those exclusions.
- Attempt ledgers include every started attempt. Importer record counts cover returned artifacts only; report narrative separately reconciles planned/started/captured/runtime-error/collector-error/incomplete counts.
- The one-off collector lacks an outer watchdog and independent cleanup verification. Awaited browser cleanup is not a general recovery guarantee. This harness is not a production customer-site collector.
- Independent review here checks the retained evidence and report claims. It is not a holdout trial or a precision/recall estimate.

Google's [Lighthouse scoring guidance](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) explains sensitivity to execution conditions. The project [performance contract](../../plans/website-audit-enterprise-performance.md) defines the stricter supported profile and evidence rules used here.

## Original capture results

These are historical summaries emitted by the evaluator in the original capture process, with live receipts. Scores are displayed on the 0–100 scale; retained native scores use 0–1. Median/range are descriptive across three runs, not a confidence interval. Do not rank the sites from this local sample.

| Website         | Normalized records | Score median (min–max) | LCP median seconds | TBT median ms | Canonical supplement                                                                                                                                  |
| --------------- | ------------------ | ---------------------- | ------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| cake.vn         | 3 measured         | 59 (53–59)             | 3.44               | 1232          | [HTML](frozen/cake.vn/report/report.html) · [MD](frozen/cake.vn/report/report.md) · [JSON](frozen/cake.vn/report/report.json)                         |
| infinity.racing | 3 partial          | Không gộp              | —                  | —             | [HTML](frozen/infinity.racing/report/report.html) · [MD](frozen/infinity.racing/report/report.md) · [JSON](frozen/infinity.racing/report/report.json) |
| quokkaguide.com | 3 measured         | 72 (50–74)             | 5.78               | 88            | [HTML](frozen/quokkaguide.com/report/report.html) · [MD](frozen/quokkaguide.com/report/report.md) · [JSON](frozen/quokkaguide.com/report/report.json) |
| vba.vn          | 3 partial          | Không gộp              | —                  | —             | [HTML](frozen/vba.vn/report/report.html) · [MD](frozen/vba.vn/report/report.md) · [JSON](frozen/vba.vn/report/report.json)                            |

Cake and QuokkaGuide had matching complete configurations and no native warnings. Infinity’s requested www URL redirected to non-www in all three records. VBA had slow-load warnings in all three records, so its measurements were retained as partial. See per-site native receipts for the exact warnings and configuration. No failed or partial record was removed.

## Separate Infinity destination follow-up

After observing the redirect, a separately registered three-run group targeted `https://infinity.racing/`. It retains its own protocol, window and group ID; the original www captures remain partial and are never merged or replaced. All three destination runs were measured without native warnings. Original live-session descriptive summaries: score median 83 (61–84), LCP median 1.563s (1.273–4.329s), TBT median 396.5ms (371–607ms). These differences do not establish an improvement: no optimization was applied and the requested populations differ.

The first follow-up report build failed `Unresolved claim evidence`; the error remains in its summary. Corrected import produced r1 without restoring trusted authority from stored receipts. Independent review requested an explicit separation statement, added in immutable r2; r1 is retained and r2 binds its parent digest. Use [follow-up r2 HTML](frozen/infinity-followup/report-r2/report.html), [Markdown](frozen/infinity-followup/report-r2/report.md) or [JSON](frozen/infinity-followup/report-r2/report.json).

## Review, checks and next actions

The independent AI reviewer verified all 15 raw artifact hashes, native configurations, original summary arithmetic, redirect/warning exclusions and canonical report integrity. These checks found no material false-claim blocker for retaining bounded lab appendices. The full audit review gate remains pending; these reports have observations and data requests, not new adjudicated website findings. Author-attributed zero-source-quotation declarations are included and explicitly do not verify quotation absence or reviewer identity.

- Cake: investigate script execution and image delivery using the retained lab trace; TBT varies substantially. Confirm with production field evidence before estimating user impact.
- QuokkaGuide: investigate the LCP element and image loading; check why blocking time varies between runs. A single best score would conceal this variation.
- Infinity: use the direct canonical destination for a future consistent measurement protocol; retain the redirect behavior separately. Do not interpret this follow-up as a before/after optimization result.
- VBA: investigate long-running page loads and third-party/provider resources; obtain a complete trace before relying on repeated lab statistics. The current slow-load warnings stay visible.

Each site needs URL/device-specific CrUX or suitably documented RUM, plus representative additional templates. GA4/GTM and backend outcomes remain separate evidence requests in the main audit. No website code was changed or deployed.

## Open report usability finding

The original four reports passed eight offline desktop/mobile checks (no page overflow, no external requests/scripts, working skip link and keyboard-reachable tables). Follow-up r1 and r2 each passed two more checks. **These are mechanical checks, not a usability pass.** Visual inspection of QuokkaGuide at 390px found a 62,984px document: the narrative section alone was 27,332px because each row repeats 24 long evidence identifiers in 110px columns. See [the measured finding](mobile-usability-finding.json). The HTML remains a detailed technical appendix; the concise results table above is the reader entrypoint. Responsive narrative/evidence presentation needs a product fix and real-data regression before claiming an enterprise-quality mobile report.

No skill source or release archive changed in this checkpoint. It advances actual public-lab evidence and exposes a real-data report gap; it does not close all of P5, P2 usability or P7 commercial evaluation.
