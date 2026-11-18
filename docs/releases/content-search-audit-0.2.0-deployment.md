# Content Search Audit 0.2.0 — production deployment

Deployed 2026-11-18 after the owner explicitly approved official release of the
assisted workflow requiring independent review. The product contract and retained
limitations are in the [release record](content-search-audit-0.2.0.md).

## Published source and archive

- PR [#3](https://github.com/KhucHieuNghi/agents-skills/pull/3) merged into `main`.
- Source commit: `3b2522f655de1af75b94dd89018f54e82eaa7d66`; its tree equals the verified PR head `f29ad70ce7c6acbb24ab9df61d65edb9563cca43`.
- Annotated tag: `content-search-audit-v0.2.0`.
- [GitHub release](https://github.com/KhucHieuNghi/agents-skills/releases/tag/content-search-audit-v0.2.0) published at 2026-11-18T09:15:15Z, neither draft nor prerelease.
- Archive SHA-256: `313a36b5de511c5658067e432c1c8e87e8231ec82b7dc15e9e78875dc18a116d`.
- Archive, release record, review guide and installation receipt were downloaded again from GitHub; all four passed the published `SHA256SUMS` check.
- [Fresh install/upgrade receipts](content-search-audit-0.2.0-installations.json) cover Codex and Claude Code separately.

## Source verification

Root format, lint, typecheck, 525 tests, build and diff checks passed. Site
verification passed typecheck, 19 unit/contract tests, 18 local browser tests and
the production build's 10 paired-page checks. Version expectations were updated
from 0.1.40 to 0.2.0; catalog tests now expect one official review-required release
and one remaining evaluation candidate.

All four pre-merge CI jobs passed on the PR head:

- [Push source CI](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44273305812).
- [PR source CI](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44273317271).
- [Push site CI](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44273305783).
- [PR site CI](https://github.com/KhucHieuNghi/agents-skills/actions/runs/44273317449).

## Production verification and rollback

- Production: <https://nkskills.getgroove.me>.
- Cloudflare Worker: `nkskills-landing`.
- Deployed version: `f683f8aa-db24-446e-9f74-cf4bdb69c320`.
- Previous verified version / rollback point: `c63940c1-7e3b-488f-bfee-26508d518488`.
- Build used `SITE_MODE=production` and `SITE_ORIGIN=https://nkskills.getgroove.me`.
- Live smoke passed all 10 paired pages, root, sitemap, robots and 404 checks.
- All 18 Playwright tests passed against the production URL, including bilingual/mobile layout, both host guides and mandatory review wording.
- Live Node fetch checks on both home pages, catalogs and four host guides confirmed 0.2.0 and absence of stale 0.1.32 references. A separate Python urllib probe received HTTP 403; the normal Node smoke and browser clients passed.

To roll back, restore the previous Worker version through Cloudflare Deployments
and rerun the live smoke and browser tests. Do not overwrite the immutable
solution archive or move the release tag. This deployment record is a subsequent
documentation-only commit; it does not change the tagged release or deployed assets.
