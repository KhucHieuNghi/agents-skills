# Source-age reporting — candidate 0.1.13

One actual report timestamp now anchors age annotations in standalone and campaign
reports. Evidence/context captures, packaged rule review dates, provider exports,
AI observations, supplied accuracy reviews and their claim sources retain distinct
date roles. Timestamp age counts full 24-hour intervals; date-only review age is
explicitly a UTC calendar-day difference. Missing, invalid, timezone-ambiguous or
future dates are unavailable. No freshness verdict, coverage, accuracy rate or
measurement denominator is changed by age annotations.

Unit cases cover partial days, timezone offsets, date-only precision, zero age,
missing/invalid dates, impossible calendar dates, ambiguous timezones and future
dates. Integration checks cover one frozen report clock, unchanged coverage,
all four supplied providers and AI review/source roles. The initial test suite
failed because the source-age module did not yet exist; this was not a behavioral
assertion failure in an existing implementation. Final root checks pass: 59 test
files / 423 tests, format, lint, typecheck, build and diff checks.

## Frozen candidate and installed checks

- Component: `356413af2f8cc4d840c719d11bba03a88c9605f5bba54496e80cf9bdcbea0243`.
- Release: `16e0f91110158220cf7f192e3dfa2bffddfb3b7a56a3a5b64bc7eec13857705f`.
- Archive SHA-256: `2d9852a9ea18fa0cbf69f9a139301a120f76b08f71643ee70c1dd34a8e22f751`.

Fresh archive installs for Codex, Claude Code and both targets ran the installed
start/campaign/index/review/report CLI on synthetic local content. Both report
paths show explicit age semantics and preserve customer branding. Campaign reports
attach all four provider fixtures plus the retained supplied AI accuracy fixture;
every date role appears and all original measurement inputs remain equal in the
evidence bundles. Manifest hashes, source bytes and installed component digests
match. Coverage remains partial.

Reproduce with `npm run build`, then
`node docs/research/content-search-audit-trials/source-age-0113/verify.mjs`.
The runner uses author-side fixture helpers through the repository's installed
tsx dependency; the customer skill does not acquire that dependency. It verifies
the frozen archive before creating fresh temporary projects. The retained receipt
binds the runner and report hashes. artifacts.tgz contains the model-free input,
source, review and report files; archive-validation.json records an exact replay.

This is installed helper/CLI evidence, not a new native model trial. It does not
resolve the prior quotation/report-fidelity errors or independent human acceptance.
Export age does not substitute for the age of the underlying measurement window.
Old candidate archives and upstream pins remain unchanged.
