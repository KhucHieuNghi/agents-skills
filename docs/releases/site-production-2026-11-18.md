# Production website deployment — 2026-11-18

The owner requested production deployment after receiving the outstanding
content-search-audit release limitations. This record covers website deployment;
it does not promote the skill or fill missing independent verdicts.

- Source commit: `95f55a3cdd57dada02d37f25c5514b627e34dbac`.
- Source branch: `codex/content-search-audit-official-release`; PR 3 remains open.
- Production URL: https://nkskills.getgroove.me.
- Worker: `nkskills-landing`.
- Deployed version: `c63940c1-7e3b-488f-bfee-26508d518488`.
- Previous version for rollback: `78b264bc-d376-4f48-bb83-e234644383e0`.
- Production build and ten paired-page checks passed.
- Live smoke passed: ten EN/VI pages, root redirect, sitemap, robots and 404.
- Live Playwright browser suite: 18 tests passed in 50.9 seconds.

The site retains public installation guidance for `content-search-audit@0.1.32`
as an evaluation candidate. The 0.1.38 package remains under evaluation on the
review branch. No main merge, commercial promotion or new skill archive
publication is implied by this deployment. O-1 and RTK failures remain recorded.

To roll back, restore the preceding version through Cloudflare Deployments and
rerun the live smoke check documented in `site/README.md`.
