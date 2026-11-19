# Candidate 0.3.28 — replay-only persisted performance

This checkpoint corrects active performance replay before a general stored-report projector can be added. It does not complete historical inventory, performance assembly or enterprise acceptance.

## Reproduced defects

Independent source review found that Lighthouse received identity checks but not the CrUX semantic comparison; cached observations were not regenerated; required requests were compared only against the editable index. Three adversarial tests reproduced acceptance before the fix: a persisted unknown lab check changed to pass, a required request deleted together with its index reference, and an observation value changed with recomputed content hash/ID. Reassessment rebuilt fresh values, but accepted the inconsistent input run; it did not prove historical claims trustworthy.

## Contract change

New durable bases declare `replayContract: supplied-inputs-v1` and retain no execution-receipt digests. The writer always derives persisted checks and observations using source-only evaluators. Host-bound Lighthouse results are returned separately in `liveCollectorResults`, never inserted into canonical observations or stored checks. Thus a current trusted collector can return repeated-run statistics in-session while the durable repeated-execution check stays unknown with its data request. This is an intentional behavior change, not a website performance regression.

Older collector-enriched bases, unsupported fingerprints and unsupported replay contracts reject explicitly. No stored receipt hashes become authority. A separate assessment or reviewed migration is required; old pilot snapshots and their claims are not rewritten.

Active validation checks the fingerprint, replay contract, policy, regenerated field/lab rows and verdicts, regenerated observation IDs/content/expiry, and required request membership derived from source rows. It runs before reuse and before save. Unknown states remain conservative. Live results are private workflow output, not a durable report or assessment approval.

## Verification

All three adversarial regressions now reject before output. Existing collector tests assert separate live statistics and durable unknown status rather than persisting execution authority. Independent reviewer enterprise_contract_review ran 87 tests across performance/workflow/Lighthouse, all passing, and found no material defect within this correction.

Full repository checks passed: 160 files / 2,058 tests, format, lint, typecheck, build, site typecheck and site tests. No rendering code changed. The versioned archive was built and extracted, then installed into fresh Codex and Claude Code projects. Both installed workflows exercised mixed CrUX/Lighthouse inputs, all three tampering cases, replay contract and canonical JSON/Markdown/HTML validation without raw payloads or live collector output. Adjacent receipts record archive/component/release digests and checks. These are installed-script checks, not native host behavioral trials.

## Remaining implementation

1. Extract one deterministic compiler for base/row/observation/check/request artifacts, shared by persistence and inspection; avoid independent derivation drift.
2. Record and replay complete historical membership. Reject orphan base, row and observation artifacts globally; active-index validation alone does not establish this. Bind activation independently of content-addressed origin for same-time A → B → A reuse.
3. Inspect exact request descriptors and lifecycle, ownership metadata and chronology across the full history. Keep refusals explicit. `mergePerformanceObservations` remains a parent-verified merge helper, not a source verifier.
4. Expose inspector-owned current/historical projections. Enforce final assessment time, preserve origin-versus-URL and field-versus-lab scope, failed attempts and all unknowns; select CrUX findings only from current failed checks.
5. Register performance with general assembly only after these checks pass. Add orphan/history/deleted-request-descriptor, fabricated receipt, expiry, same-time reuse and mixed-module regressions, then package/native/commercial evaluation.

The full enterprise objective remains active. No production deployment, push or commercial release occurred.
