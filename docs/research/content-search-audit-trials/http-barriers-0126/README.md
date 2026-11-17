# Access-barrier finding correction — 0.1.26

The Task 4 reconciliation exposed a real deterministic mismatch. Public collection
classified HTTP 401, 403 and 429 as blocked, preserving response evidence, but the
shared HTTP check assigned fail to every 4xx response. The automatic finding
producer consequently added an SEO finding for each access/rate-limit barrier.
The technical method requires separating collection barriers from page defects.

Three new integration cases failed before the correction: each expected no
finding and received one. After correction, these status codes retain an unknown
check, the captured response and blocked inventory state. A reason asks for
intended-access verification and an authorized recapture. The status alone neither
proves an accidental restriction nor justifies changing authentication or crawler
policy. Existing HTTP 404 behavior remains a transport finding with its existing
scope caveat. A later evidence-backed review can assess intended behavior.

Only `scripts/lib/checks.mjs` and its provenance hash change inside the package.
The entrypoint, inherited methods, upstream pins, rule registry and old archives
are unchanged. The manifest and package/verifier version expectations advance to
0.1.26; the frozen 0.1.25 archive is preserved.

## Installed replay

`verify.mjs` installs each frozen version in fresh Codex, Claude Code and combined
projects. It invokes the installed production modules with a deterministic
transport fixture; this is neither live HTTP nor a native model trial. Four
declared URLs return 401, 403, 429 and 404 respectively. Each configuration runs
standalone, partitioned campaign and successful barrier recapture/resume paths.

| Version | Initial findings | States              | Findings after barriers return 200 |
| ------- | ---------------: | ------------------- | ---------------------------------: |
| 0.1.25  |                4 | 3 blocked, 1 failed |                                  1 |
| 0.1.26  |     1 (404 only) | 3 blocked, 1 failed |                                  1 |

All runs validate with their own installed version and remain partial, with zero
fully audited items. After recapture, the three previously blocked items are
pending semantic review. Source package hashes remain unchanged. Exact run,
campaign, resume, installation and validation artifacts are archived and
byte-compared; see `receipt.json` and `archive-validation.json`.

Reproduce from the repository root with the frozen archives present:

```sh
rtk proxy npm run build
rtk proxy node --experimental-strip-types docs/research/content-search-audit-trials/http-barriers-0126/verify.mjs
```

The runner prints a fresh temporary root and never overwrites these receipts.
Its transport adapter is author-side test infrastructure, not a shipped runtime
dependency. Do not validate historical results with changed deterministic rules
and silently rewrite them; retain the producing version and perform a new capture.
This check does not promise cross-version audit-data migration.

Fresh 0.1.25 → 0.1.26 upgrades also pass for all three installation configurations.
Modified installed components are rejected without losing edits or lock bytes;
clean upgrades match the new component and preserve the combined-host symlink.
See [upgrade snapshot](../../content-search-audit-0126-upgrade-snapshot.json).

Component: `4a868a76c72cfcee613d202fc63743b604d93b4815feea554c1a2ec0e00b8477`.
Release: `c7be68b999586dc65258443c9f7a4f370ca0b9843a37a923794e8fc86e0e8971`.
Archive: `d92c38498e985a0f3bd9b164e83dcaf1aec45cb693c56639ed44b5ff77135b1d`.

62 files / 452 tests pass. The existing semantic-0125 Claude reporting/workflow
failures remain open; this deterministic fix does not resolve them or constitute
independent acceptance. No publication, deployment or search-uplift claim.
