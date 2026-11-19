# Contract acquisition lifecycle — candidate 0.3.15

This unpublished candidate corrects the missing-contract lifecycle in the measurement workflow. It does not complete general check retirement, evaluator migration or enterprise commercial acceptance. Prior 0.3.14 artifacts remain unchanged.

## Behavior and evidence boundary

Every configuration/business-mapping evaluation now includes the same stable acquisition check, whether the initial contract is present or supplied later. A pass means a fully validated, current contract has been supplied. Row evidence records the exact contract digest, acquisition-only purpose and contract expiry. It does not authenticate the owner or prove configuration, runtime delivery or business outcomes. Result flags explicitly retain those distinctions.

Fresh contract evidence is independent of stale configuration exports and missing application mappings: only acquisition passes, while substantive checks retain their own verdicts. At exact contract expiry acquisition becomes unknown. Renewal can restore it; removal returns it to unknown and retains prior verdict history. One configuration/business renewal request covers acquisition and every affected expectation instead of repeatedly asking for the same contract.

Real requirements/dependencies that disappear still remain unknown with a disposition-review request. They never receive an acquisition pass. General attributed retirement and older evaluator-fingerprint migration are still open; this increment must not be used to bypass either gate.

## Independent review

Reviewer `measurement_workflow_review` recommended a stable check inventory to avoid path-dependent coverage and independently found duplicate configuration renewal requests. That defect was reproduced as three requests for one expired contract, then fixed with a failing-to-passing regression requiring one request covering all affected checks. Final independent focused run passed 18/18 workflow tests in 5.10 seconds, with no remaining blocker in this scope.

Coverage includes configuration and business supplementation, exact expiry/renewal/removal, stale exports and missing mappings, stable initially-complete versus supplemented identities, immutable source/history/report revisions, foreign/future/malformed rejection, explicit false authority/acceptance flags, and unchanged unknown treatment for genuinely superseded dependency checks. These are synthetic regression tests, not precision/recall measurements or native-host commercial trials.

The packaged synthetic example now accounts for 21 checks: seven pass, three fail and eleven unknown. Two additional acquisition passes explain the change from 0.3.14; no website improvement or additional semantic accuracy is inferred. The three substantive candidate findings remain unchanged. Intake obligations and unavailable built-in trigger evidence remain visible.

## Package and final verification

| Artifact          | Digest                                                             |
| ----------------- | ------------------------------------------------------------------ |
| Component tree    | `e678e3502d624f0688f30e90b513d68e46048f6a76adcb54a9acb9e0c0e8ae26` |
| Release directory | `34938e4a68dc7e716a4055c6358eadcd317ed795ee4341fdd9cbecb9c6858e29` |
| Versioned archive | `4bdbcdd6099cc7a54b55353260edfefcc25c211c9bcb1ed7280773785fff6c1c` |

The archive at `build/enterprise-measurement-0315/agent-skills-solution-content-search-audit-0.3.15.tgz` was extracted and installed into fresh Codex and Claude Code projects. Both installed CLIs, canonical report projections and manifest hashes passed under Node 22.23.4, including the 21-check accounting above and cross-installation replay. Independent reviewer verified exact source/extraction/both-install component digests, all 157 provenance hashes and 81-module installed import closure. No upstream pin changed.

An actual retained 0.3.14 run was tested against the new CLI: it rejected `Unsupported measurement evaluator evidence`, preserved the original source digest and created no output. Receipt: `build/enterprise-measurement-0315/migration-rejection.json`. This proves conservative incompatibility handling, not a migration implementation. Installed receipts and the reproduction script are in the same build directory.

Final repository verification passed 127 files / 1,501 tests in 71.96 seconds, plus lint, typecheck, build, format, site typecheck and 19 site tests. These results establish the scoped implementation and package behavior. They do not establish native-host autonomous correctness, commercial accuracy thresholds or production readiness.
