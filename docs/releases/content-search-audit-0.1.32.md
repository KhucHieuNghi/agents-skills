# Content Search Audit 0.1.32 — publication record

Date: 2026-11-17 (Asia/Ho_Chi_Minh).
Owner-authorized source publication and production website deployment. Status:
**public evaluation candidate**, not official commercial acceptance. The owner's
deploy request does not supply per-finding human adjudication. Frozen evidence
and blank reviewer verdicts remain unchanged.

## Changes and evidence

Adds actual method-body loading, judgment/advice guidance and corrected README.
The evaluator now supports one finding matching multiple gold units without
inflating finding precision. Five upstream pins remain unchanged.

See [release readiness](../research/content-search-audit-release-readiness-0132.md)
and the [frozen evidence packet](../research/content-search-audit-trials/release-hardening-0132/README.md).
Root verification passed 467 tests; fresh install/upgrade passed for both hosts
and combined installations. Twelve native runs cover offline cohorts, extraction,
public collection and recovery after a real SIGKILL. These are development tests,
not a measured commercial accuracy guarantee.

Known blockers remain: contradictory measurement summaries, conditional advice
verification, method-reading and command-convention failures, and missing human
acceptance. Public collection succeeded for Claude (12 items); Codex recorded DNS
failures. Neither result claims a complete audit or search uplift.

## Package and installation

- Component digest: `3a38d900b80989939c27581cecda17a70b94a8082808e09dfcf50524abbbaf5e`.
- Release directory digest: `8d816f8779a8ae4df394d4d526764b555c4ff6a54a4e80aa7a673d971f38c7cc`.
- Archive SHA-256: `2578ef08ff8a45105e1547a9173a840da40baa1ff1f336c73e1da1a895865730`.

After `npm ci` and `npm run build`:

```sh
node dist/cli.js build-solution content-search-audit --output build/content-search-audit-0.1.32
node dist/cli.js install-solution --release build/content-search-audit-0.1.32 --digest 8d816f8779a8ae4df394d4d526764b555c4ff6a54a4e80aa7a673d971f38c7cc --project /absolute/path/to/project --target codex,claude-code
```

Invoke `$content-search-audit` in Codex or `/content-search-audit` in Claude Code.
Review findings before applying changes. No automatic customer content edits or
publication. Existing installed projects change only by explicit install/upgrade.

## Deployment and rollback

Production: https://nkskills.getgroove.me, existing `nkskills-landing` Worker.
Build with the production origin and mode; run live smoke and browser checks.
Record deployment version and CI outcome in the publication handoff. Restore the
preceding Worker version through Cloudflare Deployments if rollback is necessary.
Do not overwrite immutable package versions or historical evidence.
