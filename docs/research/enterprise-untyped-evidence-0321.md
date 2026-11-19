# Untyped context evidence compatibility — candidate 0.3.21

The [0.3.20 Codex development repeat](enterprise-native-dev-0320/README.md) exposed
a crash when acquisition scans retained generic evidence whose optional artifactType
is absent. Intake and canonical evaluation accepted the record; acquisition called
startsWith unconditionally in two projection scans. This was a product error, not
invalid customer input. The host's workaround remains part of the frozen trial.

Both scans now test for a string before matching the acquisition prefix. Generic
evidence is retained unchanged. Typed source/projection validation, append-only
history, request/check bindings and fingerprint checks remain in place. A new
regression first reproduced the exact TypeError, then passed failure → matching
capture → expiry with the owner brief and source run unchanged.

Independent reviewer `measurement_installed_forward_review` passed 13 focused tests
and replayed the exact original frozen Codex canonical run through failed acquisition
and empty reassessment. The owner brief and original source bytes remained intact.
Deleting type from an indexed acquisition projection still failed with “Missing
acquisition projection.” [Review receipt](enterprise-native-dev-0320/untyped-evidence-fix-review.json).

Final repository checks passed **132 files / 1,608 tests in 97.31 seconds**, plus
lint, typecheck, build, format, site typecheck and 19 site tests. The package archive
was extracted and freshly installed into both supported host paths using CLI 1.3.0
and Node 22.23.4. Both installed acquisition APIs and CLI commands successfully
processed the original failing source, retained its brief and kept failed
availability unknown. No human/semantic acceptance was inferred from that success.

| Artifact       | Digest                                                             |
| -------------- | ------------------------------------------------------------------ |
| Component      | `d704975ea8aabe634e2265bb8d7f18949c246f472d17672ce09478c42fb152e4` |
| Release tree   | `afbb9938e50b4431ec1e5e690d87eee263b6f7f7b83d641ca256b5500d465f54` |
| Archive 0.3.21 | `cf91401e9fac01fc9b6e715a4d801c8091031a4ae05d02a2ce7b5e7e73731941` |

Local evidence: `build/enterprise-untyped-evidence-0321/`, including original-source
replay receipts, extracted installs and verification logs. This change alters the
acquisition fingerprint; existing acquisition runs from previous versions remain
unsupported without explicit migration. The original failing run contained no
acquisition projection and can be processed without fabricating migration.

This is a bounded runtime correction. The residual Claude reporting issues,
host read isolation, matched baseline/holdout evaluation, broader module coverage
and remaining enterprise gates are not resolved by it. Native-host behavior was
not rerun with 0.3.21. No production deployment or customer mutation occurred.
