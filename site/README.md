# NKSkills campaign site

This Astro site presents the source-backed `codebase-onboarding@1.1.0` Solution Skill for Codex and Claude Code. English and Vietnamese pages are pre-rendered. The main action copies a visible starter prompt; installation continues from the GitHub source and technical guide.

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
```

The production Worker serves the static build at `nkskills.getgroove.me`. The custom domain is managed by Wrangler and must stay in the owner's Cloudflare account. The separate `workers.dev` preview uses preview HTML and receives an HTTP `X-Robots-Tag: noindex, nofollow` header. The site has no campaign analytics or lead form. The text guides are complete; no video asset or video metadata is published.

Rollback: in Cloudflare Workers & Pages, open `nkskills-landing` → Deployments and restore the preceding known-good version, then run the live smoke command again. Record the restored version ID and smoke result in the release note.
