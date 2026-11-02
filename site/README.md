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

Self-hosted Fraunces Variable, Source Sans 3 Variable, and IBM Plex Mono use SIL Open Font License 1.1. The complete license notices ship in `public/licenses/` and are linked from the footer.
The site preloads the critical Latin display/body faces and the Vietnamese
subsets on Vietnamese routes. `src/styles/fonts.css` uses
`font-display: optional` to avoid a late font swap; a slow first visit may keep
fallback glyphs for that page, while a cached or fast load uses the approved
fonts. The browser regression test checks that visible hero text does not
change width after a delayed font response.

The visual system uses a warm white ground, plum text, rose actions, and pastel
sky/apricot surfaces across both locales and every page type. The product's
skill-composition interface is the hero illustration. The [project design
system](../DESIGN.md) defines shared rules; [site/DESIGN.md](DESIGN.md) records
the reference evaluation and landing decisions. The authoring workflow used
the pinned `design-taste-frontend` skill for direction and browser inspection;
its source and license are recorded in the root catalog.
Taste Skill followed by Impeccable is the recommended authoring practice for
future website work. Impeccable has not yet been run on this site, and the
pair's relative effectiveness has not been measured.
The prompt host and language controls use a short sliding selection indicator;
`prefers-reduced-motion` removes that travel.
`tests/design-system.test.ts` checks token alignment and
`tests/design-system.spec.ts` checks the rendered type and primary action
across both locales and page types.

Rollback: in Cloudflare Workers & Pages, open `nkskills-landing` → Deployments and restore the preceding known-good version, then run the live smoke command again. Record the restored version ID and smoke result in the release note.
