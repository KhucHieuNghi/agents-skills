# Enterprise dependency hardening — 2026-11-19

This record addresses the dependency advisories observed while preparing the enterprise audit implementation. It is not enterprise release approval or proof that an application has no security defects. Original audit/report artifacts and released skill archives remain unchanged.

## Changes

| Tree               | Before                                                                  | After                                                                                                |
| ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Root tooling       | ESLint 10.7.0; typescript-eslint 8.64.0; minimatch 10.2.5               | ESLint 10.15.0; typescript-eslint 8.73.0; minimatch 11.0.9                                           |
| Site               | Astro 7.4.0; Wrangler 4.151.1; fast-uri 3.1.8                           | Astro 7.4.13; Wrangler 4.165.0; fast-uri 3.1.9                                                       |
| Site compatibility | Node 22.22.0 minimum/CI; conflicting hoisted Node 18 types after update | Node 22.23.4 minimum/CI; explicit @types/node 22.20.5 with Cloudflare's older type dependency nested |

Root manifest minimum ranges were raised to the fixed tool versions; all changed root dependency entries are development-only and root production records are unchanged. Site runtime dependency changes follow the Astro update; Wrangler and URI-parser updates address their respective dependency chains. No dependency overrides or relaxed lint/test assertions were added.

## Evidence and review

Initial npm audit reported nine moderate entries in the root lint-tool chain and five entries in the site tree (four moderate, one high). Counts are audit package entries, not independent vulnerabilities or demonstrated exploitability. The root issue is [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249); the site audit also covered Astro, fast-uri and Undici through Miniflare/Wrangler.

Independent AI review checked lock/manifest alignment, registry URLs/integrity, dependency scope and CI compatibility. It found the new Astro Node floor mismatch and conflicting top-level Node type peer; both were corrected before validation. A stale installed WASM dependency was resolved by clean installation rather than a lockfile override.

Both trees were installed cleanly with `npm ci --ignore-scripts` under official Node 22.23.4 (Darwin arm64); each reported zero known npm audit entries. Node archive SHA-256 `037650d0839f457747396f052073fb48333d31bf5abd3c98b74da20d89ebb1ad` matched the official distribution's SHASUMS256 file. Private receipts/runtime are in `build/dependency-hardening-20261119/`. This verifies the local operating system; hosted Linux CI remains a separate execution surface.

Zero registry advisories at this snapshot does not establish code correctness, runtime exploitability coverage, independent product acceptance or readiness of the unfinished enterprise audit feature set. No push or deployment is part of this increment.

## Final local validation

Under Node 22.23.4, root formatting, lint, typecheck and build passed; the full regression suite passed 113 files / 1,287 tests (`--maxWorkers=1 --testTimeout=15000`). Site typecheck and 5 files / 19 tests passed, including design contracts. Both preview and production builds passed, including product-claim and generated-page checks. Separate final root/site npm audit snapshots each reported zero vulnerabilities.

Independent review rechecked the final clean trees: manifest/lock alignment and peer dependency checks passed. Site optional WASM packages received nonblocking extraneous annotations despite being lock-present; this is not a missing/invalid peer. The pre-existing optional Windows ia32 sharp engine constraint is outside the verified Darwin arm64 environment.

The initial browser attempt could not start because port 4322 was occupied; no test assertion ran and the unrelated service was preserved. Browser verification uses a separately started local site on port 14329 via `SITE_TEST_URL`.

The isolated Chromium run passed all 20 browser tests (8.5 seconds), covering the repository browser suite. The task-owned server was then stopped. No production deployment was performed.
