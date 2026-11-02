# NKSkills first production deployment

- Date: 2026-10-18 (Asia/Ho_Chi_Minh)
- Site source commit: `b3064b0`
- Cloudflare account: `NK`
- Production Worker: `nkskills-landing`, version `63b23c8d-2f83-4a27-aef3-b768375388d3`
- Production origin: https://nkskills.getgroove.me
- Preview Worker: `nkskills-landing-preview`, version `39404462-081a-46c5-8c1f-ed6f6095eae4`
- Preview origin: https://nkskills-landing-preview.nghi-khuc-dev.workers.dev

Production live smoke passed for the root redirect, eight English/Vietnamese
pages, self-canonical and reciprocal `hreflang`, sitemap, robots, security
headers, and custom 404. The seven browser tests also passed against the live
production origin, including prompt selection, clipboard denial, guide paths,
reduced motion, and mobile overflow. DNS resolves and HTTPS responds. Preview
HTML has a `noindex` meta tag and response header, no canonical, and no sitemap.

This is the first production version, so there is no preceding production
version to restore. A later release should record its prior version ID and
rehearse a restore in Cloudflare before it is treated as a rollback option.

## Catalog and design update — 2026-10-31

- Production Worker: `nkskills-landing`, version `90e035b5-ea97-4b08-9fba-d0ccd6b6a8e3`.
- Preceding production version for rollback: `34215f69-fcaa-4478-b64d-6f0de7f5cc7d`.
- Preview Worker: `nkskills-landing-preview`, version `9bc4ec5d-9ad5-4e76-a3e8-34db2a195959`.
- Production `site/dist` SHA-256 tree digest:
  `fc05db41b81ac23e0e0b9dbb3f1df57a579a2a6655556ba327bd7d8179cbcded`.
- Source: `nkskills-nuance-rebuild` worktree at base commit `73956b07a02a7853f2763b7c8e2a99e8d8c4cd8a`
  with reviewed, uncommitted site and catalog changes. This source state still
  needs a version-control release commit before it can be reproduced from Git.
- Change: approved NKSkills theme and bilingual landing, pinned Taste Skill
  authoring entry, and an Impeccable upstream/pairing candidate. The pair is
  not described as a released Solution Skill.
- Verification: production build checked 10 paired pages; preview catalog
  browser tests passed 4/4; production live smoke passed 10 pages plus root,
  sitemap, robots, and 404; production browser tests passed 14/14.

The previous production version is available in Cloudflare deployments. A
rollback, if needed, should restore that version and rerun the live smoke
check. No rollback was performed for this update.

## Font rendering update — 2026-10-31

- Production Worker: `nkskills-landing`, version `d200ae2f-3349-4d57-8891-5c79f1cecdab`.
- Preceding production version for rollback: `90e035b5-ea97-4b08-9fba-d0ccd6b6a8e3`.
- Preview Worker: `nkskills-landing-preview`, version `6da17af0-1bfd-4d14-a237-b6bd38b22136`.
- Production `site/dist` SHA-256 digest: `e1b45706975ed2c23eb87ed512c9c567a1fe8e39402cbd9d972e5eaba51616ab`.
  Digest input is every file in sorted relative-path order, with each path and
  its content separated by NUL bytes.
- Source: `nkskills-nuance-rebuild` worktree at base commit
  `73956b07a02a7853f2763b7c8e2a99e8d8c4cd8a`, with uncommitted site
  changes. This deployed state still needs a version-control release commit.
- Change: preload the critical Latin and Vietnamese font subsets, declare
  `font-display: optional`, and test visible text with a delayed font response.
- Verification: typecheck 0 errors; unit tests 18/18; local browser tests
  15/15; preview browser tests 14/15 on the first run with one remote timeout,
  then the timed-out guide test passed on retry; production smoke passed 10
  pages plus root, sitemap, robots, and 404; production font and theme browser
  tests passed 2/2.

## Prompt toggle motion update — 2026-10-31

- Production Worker: `nkskills-landing`, version `fe561aaf-8a96-4d88-a3e0-f795a442c8ac`.
- Preceding production version for rollback: `d200ae2f-3349-4d57-8891-5c79f1cecdab`.
- Preview Worker: `nkskills-landing-preview`, version `89af8785-2c68-4b74-9092-1bbd739fb3ab`.
- Production `site/dist` SHA-256 digest: `b6ce3f595c3eaf27a00c9546104d67d7c4e42f08adbd79200cd8f77caab10ff4`.
  Digest input uses the sorted relative-path and NUL-separated content method
  described above.
- Source: `nkskills-nuance-rebuild` worktree at base commit
  `73956b07a02a7853f2763b7c8e2a99e8d8c4cd8a`, with uncommitted site
  changes. This deployed state still needs a version-control release commit.
- Change: the Codex/Claude Code and English/Tiếng Việt prompt choices now have
  a sliding selected pill, 44px button targets, and reduced-motion handling.
- Verification: typecheck 0 errors; unit tests 18/18; local browser tests
  16/16; preview focused browser tests 3/3; production smoke passed 10 pages
  plus root, sitemap, robots, and 404; production focused browser tests 2/2.

## Taste and Impeccable recommendation copy — 2026-10-31

- Production Worker: `nkskills-landing`, version `c7821b55-ee91-4ad9-b185-0a8374c4b48d`.
- Preceding production version for rollback: `fe561aaf-8a96-4d88-a3e0-f795a442c8ac`.
- Preview Worker: `nkskills-landing-preview`, version `cb89faa9-db4b-4080-a4c2-7386ef2c87aa`.
- Production `site/dist` SHA-256 digest: `3d72f9ae1b1cecec58aa5a44b2d88e37d54f212b095a9a9d6bf72768ad57ecfd`.
  Digest input uses the sorted relative-path and NUL-separated content method
  described above.
- Source: `nkskills-nuance-rebuild` worktree at base commit
  `73956b07a02a7853f2763b7c8e2a99e8d8c4cd8a`, with uncommitted site
  changes. This deployed state still needs a version-control release commit.
- Change: landing and catalog now identify Taste Skill → Impeccable as the
  product owner's recommended website-authoring practice. The pair is not
  described as a released Solution Skill or an independently proven result.
- Verification: typecheck 0 errors; unit tests 18/18; local browser tests
  16/16; preview catalog browser tests 4/4; production smoke passed 10 pages
  plus root, sitemap, robots, and 404; production focused catalog tests 2/2.
