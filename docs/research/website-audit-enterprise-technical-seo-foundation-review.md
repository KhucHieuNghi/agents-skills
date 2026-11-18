# Technical SEO canonical foundation review

Status: development-only supplied-projection evaluator; not packaged or accepted as the complete technical SEO module.

## Implemented boundary

The [implementation plan](../plans/website-audit-enterprise-technical-seo.md) retains native collection, crawl sampling, robots/noindex, hreflang, structured data, URL Inspection and enterprise report integration as required remaining work. The current evaluator assesses three declaration checks in one scope-bound capture. It does not parse native HTML or authenticate execution.

Tests first failed because the module did not exist, then 31 initial cases passed. They cover complete/partial/absent layers, owner preference, cross-domain targets, JavaScript-only insertion, query/path identity, fragments, expiry, wrong scope and malformed inputs. Review added adversarial cases rather than treating synthetic pass counts as commercial quality metrics.

## Independent findings and fixes

A separate AI reviewer ran the 31 tests and produced two reproducible findings:

1. Duplicate JSON keys could hide earlier conflicting targets or incomplete coverage before schema validation. The new bounded scanner rejects duplicates at every object depth, including Unicode-escaped equivalent keys. It limits nesting and value counts before normal JSON decoding.
2. JSON/URL parsing exceptions could expose raw supplied content through messages or exception properties. Both boundaries now use fixed validation errors without attaching raw input or underlying causes.

The four direct reviewer regressions failed before fixes and passed afterward. Additional malformed/deep/nested cases exercise the scanner. These are root-verified fixes after independent review, not a claim of a second independent acceptance pass.

The initial full repository run found a public-documentation guard violation from a literal synthetic credential URL in a negative test (925 passed, one failed). The test now constructs its explicitly synthetic URL from fixture credentials; the guard remains unchanged. Lint also initially rejected a control-character regex; equivalent character-code validation resolved it.

## Limits

A correct hash proves byte consistency, not authentic acquisition. A complete-layer flag remains the supplier's assertion until a native collector binds it to response/DOM artifacts. One capture does not prove stability across repeats or site-wide coverage. No Google-selected canonical, index status, ranking or content-equivalence result is inferred. No package source, existing archive or production website was modified.

Final verification: 41 focused canonical cases pass. The full single-worker repository suite passes 96 files / 936 tests (122.90 seconds). Format, lint, typecheck, build and diff checks pass. Package source/manifests remain unchanged, so no new release archive is claimed for this development-only change.
