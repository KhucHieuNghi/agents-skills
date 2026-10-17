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
