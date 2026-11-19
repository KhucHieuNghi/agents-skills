# Evidence-driven guidance correction — candidate 0.3.20

The [0.3.19 native-host development trial](enterprise-native-dev-0319/README.md)
retains original Codex and Claude reports, telemetry and independent findings.
Seven narrow criteria passed for both hosts, but that rubric missed recommendation
and final-summary defects. Those defects remain unresolved behavior observations;
this candidate does not relabel the original trial or establish commercial readiness.

## Changes

- Keep the canonical no-preference branch unknown; do not require a pass that
  would imply inventing owner intent. Evaluate observed consistency separately.
- Describe source/rendered discrepancy without asserting a rewrite mechanism.
- Distinguish absent capture from present attempt identity/scope/timestamps/gaps.
- Document actual data-request field names and output parent-directory handling.
- Check individual command failures; later shell success is not verification.
- Keep GA4 report pages, configuration definitions and GTM artifacts separate in
  authored narrative as well as the already-correct request templates.

`measurement_installed_forward_review` independently checked the changes against
runtime contracts and found no blocking mismatch. Native host behavior has **not**
been rerun with 0.3.20; instruction changes alone do not prove these errors fixed.

The tracked-file documentation guard also needed a precise exception for two
official RDF declarations in the retained Schema.org source snapshot. The exception
is limited to the exact file and exact field/value patterns for brand scanning.
Other values, suffixes and files remain scanned; credential/private-URL checks
still inspect original content. New regressions cover those boundaries.
`measurement_workflow_review` independently passed 16 documentation tests and
found no blocker in the narrow exception. Original snapshot bytes are unchanged.

## Verification and artifacts

Final repository verification: **132 files / 1,607 tests passed in 77.07 seconds**,
plus lint, typecheck, build, format, site typecheck and 19 site tests. Skill
entrypoint validation passed. Documentation-only additions were formatted and
diff-checked after recording the final result.

The archive was extracted and installed into fresh Codex and Claude Code projects
using CLI 1.3.0 and Node 22.23.4. Both installed CLI smoke flows completed intake,
technical evaluation, failed acquisition, canonical reporting and parent-bound
revision/validation. Source, extracted skill and both installations match the
component digest; composition verification checks all seven source records,
license files, mapped bytes and local links. These are script regressions, not
native-host behavior trials.

| Artifact                | Digest                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| Component               | `14eaa57693564c4afb4f0d8bdac442ef1122f26eb0c23c8f2d48e5b5a6b56984` |
| Release tree            | `58ab85ba521fe44f4247b1845e8e15bae9dcd2255a935b09ee342ed3451d35ab` |
| Solution archive 0.3.20 | `c99ec289f461158f1121e54805e1c853be9ea63496e84bf31df4d6e9d5b18e9e` |

Local artifacts: `build/enterprise-native-guidance-0320/`, including extracted
package, installations, smoke receipts and verification logs. No customer website
was changed. No production deployment or enterprise release occurred.

Next work: repeat exposed development cases with the revised recommendation rubric,
then build and validate the isolated runner/scorer and independent holdout matrix.
Preserve matched baselines, distinct denominators and failure history. Broader
provider, consent, field/manual assessment, remediation and P3–P7 gates remain open.
