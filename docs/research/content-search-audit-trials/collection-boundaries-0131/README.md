# Installed collection boundaries — candidate 0.1.31

Exact frozen 0.1.31 archive was extracted and installed into fresh Codex,
Claude Code and combined-host projects. Installed production modules were invoked
with deterministic transport fixtures. This is author-side installed-helper
verification, not a native model trial, live outage or network attestation.

## Outcomes

All three installation configurations produce the same outcomes:

| Case                                | Persisted result                                                                   | Supported conclusion                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 401 / 403 / 429                     | Three blocked items; response check unknown; no barrier findings                   | Access/rate limits alone are not diagnosed as content defects.                                           |
| 404 control                         | One failed item and one scoped HTTP finding                                        | Removing barrier findings did not suppress the separate missing-response control.                        |
| Partitioned campaign                | Valid partial campaign; same one 404 finding                                       | Barrier semantics also persist through the campaign path.                                                |
| Successful barrier recapture        | Three previously blocked items become pending; 404 finding retained                | Recovery refreshes evidence without claiming semantic completion.                                        |
| Oversized response                  | Failed collection; no content evidence or finding                                  | Byte-limit failure remains collection uncertainty.                                                       |
| Private redirect                    | Blocked; private URL absent from requested fixture URLs                            | Origin allowlisting does not bypass private-address rejection.                                           |
| DNS timeout                         | Failed collection; no request made; no content finding                             | Unresolved DNS retains incomplete accounting.                                                            |
| Hostile HTML shell with no renderer | Pending; exact source retained; no rendered evidence; only response check resolves | Helper does not execute embedded instructions or fetch external scripts; semantic checks remain unknown. |

Every run validates and has zero fully audited items. The four boundary cases each
retain their one declared item. No case converts missing evidence to a content
failure. Before/after component digests match on all three installations.
The scheduler is fixture-injected, so these cases do not verify real-time rate
spacing or real DNS cancellation. Source tests retain their separate scope.

## Reproduce and inspect

With the existing CLI build and frozen archive present, run from the repository:

```sh
rtk proxy node --experimental-strip-types docs/research/content-search-audit-trials/collection-boundaries-0131/verify.mjs
```

The runner writes a new temporary root; it does not overwrite these results.
It checks archive SHA-256 before extraction, the release digest during install,
and installed component digest before and after execution. It imports only the
installed production helpers and the explicit author-side transport fixture.
No dependency installation or real HTTP request occurs.

[Receipt](receipt.json) records each result and runner/fixture hashes. The
[archive receipt](archive-validation.json) verifies 726 regular files against their
original bytes. The archive includes run/campaign/recovery artifacts, installed
package bytes, installation records and the author runner/fixture. Duplicate
extracted package bytes are excluded, as is the combined discovery symlink;
the canonical installed bytes remain present.

Archive SHA-256:
`f2d65fba877dfd184b987a255f7aa36c21e5c4da32541e015c3aeeb40b1133bd`.

The previous 0.1.26 correction receipt is preserved. This replay supplies the
current-version installed evidence for these named collection boundaries. It does
not establish a native host will never bypass the collector, general rendering or
OCR accuracy, privacy compliance, independent acceptance or release readiness.
No customer package or immutable archive was modified.
