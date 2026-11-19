# Technical SEO installed integration — candidate 0.3.19

Date: 2026-11-19. Evaluation candidate; not commercial or native-host semantic
acceptance. The released content-search-audit 0.2.0 product remains separate.

## Delivered behavior

The skill now contains the 28-file Technical SEO runtime closure, including the
host-injected read-only collector. Repository-only imports and fingerprint paths
were relocated; tests and the development expansion/remediation tools now import
the single bundled implementation. No duplicate runtime copy is maintained.

Two installed commands expose supplied evaluation and acquisition-attempt records:
`enterprise-technical-seo-evaluate` and `enterprise-technical-seo-acquisition`.
The guide documents six evaluator kinds, exact source/context contracts, missing
data recovery, expiry, report revisions and unsupported fingerprint migration.
Synthetic JSON examples include deliberately unbound source digests.

The acquisition command does not invoke a browser or confer authorization. Capture
availability remains separate from semantic SEO checks. The collector requires
host-supplied Chromium and trusted authorization context. The separate JSON-LD
expansion worker and its jsonld dependency are not installed; broader schema
semantics and native-host workflow coverage remain open.

Schema-v2 provenance adds two datasets, preserving all five skill upstream pins:
Schema.org 30.1 (CC BY-SA 3.0) and IANA 2026-11-18 (CC0 applicable rights). Complete
legal texts and attribution/transformation notices are bundled; derived JSON is
marked adapted and license texts copied. Original data snapshots and hash-checking
builders are retained in publisher source, not advertised as installed tools.
CLI 1.3.0 supports this composition format; the former 1.2.0 archive is not replaced.

## Independent review and corrections

`measurement_workflow_review` verified closure, isolated imports and location-stable
fingerprints, passing 49 workflow tests. Guide corrections cover obtaining a run
digest, the required Googlebot crawler field and publisher-only snapshot paths.

`measurement_installed_forward_review` independently exercised intake → conflicting
canonical evidence → report → failed acquisition → parent-bound report revision
in a copied skill. Observed failures and unknowns remained distinct, and all three
report projections validated. A misleading generic title suggesting owner intent
was replaced with the failed rule identity. Minimal input examples were added.

Full checks also found an outdated remediation import and a site consumer that
assumed every provenance source was a Git skill. Both were corrected. The public
0.2.0 evidence section still lists its five source skills; candidate datasets are
not presented as released skills. No visual design or commercial claims changed.

Final archive review by `measurement_workflow_review` found no concrete packaging
blocker. Source, extracted solution, both installations and a fresh independent
archive extraction had the same component digest. CLI 1.3.0 composition validation
passed for all copies, including licenses and local links. Both bundled legal
texts matched their official endpoints byte-for-byte. This verdict is limited to
artifact/provenance correctness, not native-host behavior or commercial acceptance.

## Verification

- Full repository: 132 test files / 1,606 tests passed in 84.14 seconds.
- Lint, typecheck, build, format, site typecheck and 19 site tests passed.
- Skill entrypoint validation and diff whitespace checks passed.
- Built candidate archive, extracted it and CLI 1.3.0, then installed into fresh
  projects at `.agents/skills/` and `.claude/skills/` respectively.
- On the actual extracted installations, 98 workflow/acquisition tests passed
  under Node 22.23.4. These reuse the development scenarios with only import
  paths redirected; they are portability regressions, not an independent holdout.
- Both installed CLI smoke flows created canonical JSON/Markdown/HTML reports and
  parent-bound revisions. Conflicting canonicals failed; missing owner/provider
  evidence and failed acquisition stayed unknown. Review status remained pending.

Local artifacts and logs: `build/enterprise-technical-seo-0319/`, including
`verification/receipt.json`, both extracted installations, per-host smoke records,
and the retained independent forward-test harness. The artifact digests below
establish byte identity, not correctness of customer evidence or reviewer identity.

| Artifact                | SHA-256 / tree digest                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Component               | `aa732311c656322251a82441e3f327e962160000cb1f2113d78cb070f0714734` |
| Release tree            | `3cfca90e2f824d94dc025c33a41c6562cf8a03041371ea53242a611d42833ebf` |
| Solution archive 0.3.19 | `5fc0560d8ff61cf24d79dce27f94d4d17e5f2ab3564dc4479937eab4ababbf3a` |
| CLI archive 1.3.0       | `dc189f1e5d9d1a5690d11603a37b86bce86d9b8e567520089ee7d759914e1b08` |

## Still required

This checkpoint does not finish the enterprise product. Native-host semantic
trials, broader technical coverage/JSON-LD expansion, real provider ingestion,
complete consent and business outcomes, field performance/manual accessibility,
authorized remediation/retest and commercial baseline/holdout metrics remain
separate requirements. Pilot sampling is not whole-site coverage. No customer
website was changed, and no production release or deployment occurred here.
