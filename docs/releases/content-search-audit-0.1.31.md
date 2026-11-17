# Content Search Audit 0.1.31 — publication record

Date: 2026-11-17 (Asia/Ho_Chi_Minh).
The repository owner explicitly instructed publication and deployment in this chat:
“đã hoàn thành rồi hãy push deployment”. This authorizes source publication and
website deployment. It is not a completed per-finding benchmark adjudication;
archived review templates and original trial outcomes remain unchanged.

## Package and installation

One customer skill, supporting Codex and Claude Code. Five reviewed methods are
adapted internally with pinned provenance and bundled licenses. No nested upstream
SKILL.md must be invoked by the customer.

- Solution version: `0.1.31`.
- Component digest: `d6edb5943f7ad676609204cd36940573c9b8529ab39905a24ff19bf253d14ec1`.
- Release directory digest: `858479993c3bda268a764fb19757ec2c3b6d6af8929d9e95369294244d863be6`.
- Preserved solution archive SHA-256: `11c727671cb11839ee2f35b4d5160910f124c9b759135b358b19c189f7f8f93e`.
- CLI source version: `1.2.0`, adding composed-skill provenance verification.

From the repository, after `npm ci` and `npm run build`:

```sh
node dist/cli.js build-solution content-search-audit --output build/content-search-audit-0.1.31
node dist/cli.js install-solution \
  --release build/content-search-audit-0.1.31 \
  --digest 858479993c3bda268a764fb19757ec2c3b6d6af8929d9e95369294244d863be6 \
  --project /absolute/path/to/project \
  --target codex,claude-code
```

Open the target project and invoke `$content-search-audit` in Codex or
`/content-search-audit` in Claude Code. Supply authorized content roots or domains,
audience and purpose. Reports include HTML, Markdown, CSV, evidence and coverage.
See [installation evidence](../research/content-search-audit-0131-installation-snapshot.json)
and the [technical archive guide](../guides/technical-v1.md).

## Status and known limits

Published as an evaluation candidate, consistent with the frozen package. No
commercial accuracy or ranking claim is added. Automated checks validate behavior
covered by their assertions; they do not replace semantic judgment.

Recorded native trials include incomplete method loading, an incorrect readiness
comparison in a generated narrative, AEO applicability disagreements, conditional
advice errors and host instruction deviations. Original reports are preserved.
Review findings and proposed actions before using them. Missing evidence remains
unknown; incomplete coverage must remain partial. The skill does not automatically
edit or publish customer content.

[Research summary](../research/content-search-audit-summary-vi.md),
[completion audit](../research/content-search-audit-completion-audit.md), and
[current review packet](../research/content-search-audit-human-review-current-0131/README.md)
retain the detailed evidence and outstanding semantic acceptance boundaries.

## Verification for this publication

Root format, lint, typecheck, build and all 463 tests passed after staging the
new evidence corpus. Fresh package build reproduces both release and archive
hashes above. Extracted archive installs pass for Codex, Claude Code and combined
hosts. CLI 1.2.0 packs and installs offline with bundled dependencies. The prior
Worker version is `eeeb9be1-063b-4828-a5d2-5502dd2361d0`.

The public-boundary test now reads files in bounded batches and lowercases text
once, retaining every previous check. Six synthetic credential-URL fixtures are
assembled from strings without changing their runtime input. Hash-bound CSV/report
captures retain their original line endings through narrow Git attributes.

## Deployment and rollback

Production site: https://nkskills.getgroove.me. Deployment uses the existing
`nkskills-landing` Cloudflare Worker and its production build configuration.
The Git commit, CI result, Worker version and live smoke result are recorded in
the publication handoff. Preserve the preceding Worker version for rollback;
restore it through Cloudflare Deployments and rerun the live smoke check.

This is the first publicly indexed content-search-audit candidate. To withdraw
it, remove its catalog/site entry in a follow-up commit and redeploy. Preserve
published version hashes; do not overwrite an artifact under the same version.
Existing customer installations change only through an explicit install/upgrade.
