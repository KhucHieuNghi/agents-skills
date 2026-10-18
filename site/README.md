# NKSkills campaign site

This Astro site presents NKSkills as a versioned catalog of Solution Skills and pinned Upstream Skills for Codex and Claude Code. English and Vietnamese pages are pre-rendered. The landing shows the source-backed `codebase-onboarding@1.1.0` technical release and `problem-presentation@0.1.0` evaluation candidate with distinct statuses. Its main action copies a visible onboarding prompt; the landing and host guides now explain source build, project installation, and invocation for both supported hosts. Catalog upstream rows are generated from the repository's `catalog.yaml` during the site build.

## Local work

Use Node.js 22.22.0 or newer.

```sh
cd site
npm ci
npm run dev
npm test
npm run test:browser
```

`npm run build` makes an unindexed preview build. Deploy that build only with the separate preview configuration. A production build requires both `SITE_MODE=production` and `SITE_ORIGIN=https://nkskills.getgroove.me`:

```sh
npm run build
npx wrangler deploy --config wrangler.preview.jsonc
SITE_MODE=production SITE_ORIGIN=https://nkskills.getgroove.me npm run build
npx wrangler deploy
npx tsx scripts/smoke-live.mjs https://nkskills.getgroove.me
SITE_TEST_URL=https://nkskills.getgroove.me npm run test:browser
```

The production Worker serves the static build at `nkskills.getgroove.me`. The custom domain is managed by Wrangler and must stay in the owner's Cloudflare account. The separate `workers.dev` preview uses preview HTML and receives an HTTP `X-Robots-Tag: noindex, nofollow` header. The site has no campaign analytics or lead form. The text guides are complete; no video asset or video metadata is published.

Self-hosted Be Vietnam Pro and IBM Plex Mono use SIL Open Font License 1.1. The complete license notices ship in `public/licenses/` and are linked from the footer.

Rollback: in Cloudflare Workers & Pages, open `nkskills-landing` → Deployments and restore the preceding known-good version, then run the live smoke command again. Record the restored version ID and smoke result in the release note.
