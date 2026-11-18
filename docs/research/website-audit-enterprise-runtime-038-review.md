# Payload/order evaluation candidate 0.3.8

Status: unpublished evaluation candidate. It includes typed supplied-payload and same-source ordering checks, not full P4 or enterprise acceptance.

This follows [0.3.7](website-audit-enterprise-runtime-037-review.md) with a documentation clarification: the runtime guide now distinguishes implemented typed/same-source comparisons from unfinished raw protocol authentication, cross-system alignment and dedup verification. Only that original reference and its provenance digest changed inside the package; runtime code, examples, source pins/licenses and previous archives are unchanged.

## Integrity

- Component: `2573c9d37f4737550e18604950668903406020ed69b80b67ef5f45e87e2eccbc`.
- Release: `14946aa067662bd801d0a39f3a1861789d90238fd933bd8e6ff175a9c5e522f5`.
- Archive SHA-256: `6255eb85b94ce3077a384a1c25b4d7e36b575d8e09c5b7baba61a5abc72063dc`.
- Archive: `build/enterprise-runtime-038/agent-skills-solution-content-search-audit-0.3.8.tgz`.

## Installed workflow

[Receipts](website-audit-enterprise-runtime-038-installations.json) record fresh installs from extracted 0.3.8 for Codex and Claude Code. Each installed CLI runs intake → supplied runtime evaluation → JSON/Markdown/HTML → validation, yielding 4 scoped passes, 1 candidate failure and 22 unknown checks. Both rehashed wrong-currency negative controls produce a payload failure and two candidate findings. No native host behavior, browser execution, provider authentication or production acceptance is inferred.

The [payload/order review](website-audit-enterprise-payload-order-review.md) records independent code review. P4 dedup, authorized browser execution, cross-system clock evidence, remaining providers/modules, execution/retest and P7 commercial evaluation remain open.

Final repository and independent archive checks are appended below.

Final verification: **85 files / 680 tests passed** with `npm test -- --maxWorkers=2` and unchanged per-test timeouts (`build/enterprise-runtime-038/tests-final.log`). Format, lint, typecheck, build and diff checks passed; tracked documentation boundary tests passed 14/14. The 0.3.7 high-concurrency timeout log remains preserved rather than relabeled green.

Independent package review verified all 136 archive/extracted files, both host locks/component digests, composition/reference closure, report validators with semanticAcceptance=false, original intake check retention and both actual currency negative controls. Review caught an incorrect releaseDigest in the external installation receipt: the script's global version substitution had changed a substring inside a copied digest. The receipt was corrected against actual extracted bytes; the reproducer now calculates release/archive hashes directly. Reviewer verified closure. No archive/installed/report bytes changed for this correction. No remaining finding within the bounded package review; native-host behavior, whole P4 and commercial acceptance remain unproven.
