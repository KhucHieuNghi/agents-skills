# Tracking payload and same-source ordering review

Status: implementation/evaluation subset after 0.3.6; not full P4 acceptance.

## Implemented

Typed supplied payload fields support booleans, safe integers, bounded enum tokens, SHA-256 digests and exact decimal strings (30 integer / 9 fractional digits). Required/optional fields, enum membership, equality and numeric bounds are owner-declared. Missing or incomplete payload evidence stays unknown; complete evidence missing required fields fails. No floating-point conversion or implied currency conversion occurs. Field values stay out of evaluator checks and customer report projections; original evidence still requires disclosure review.

Stage occurrence and payload validity are separate checks. Runtime identity includes checkKind to avoid collisions. Comparator code fingerprint includes the new payload helper. Normalized payload schema remains backward-compatible with traces omitting payloads. The validator reports the first confirmed field violation, not an exhaustive defect inventory or raw provider protocol validation.

Optional orderRules bind before/after stages, allowed timestamp ties and maximum delay. Both stage checks must be eligible, exactly one accepted record must exist per side and both must come from the same source clock. Separate sources remain unknown even if clock labels agree. Ambiguous pairs/timestamp ties remain unknown; reversed or excessive elapsed time fails. This does not establish causality, dedup implementation or cross-system synchronization.

## Independent review and regression evidence

Independent payload review passed 43 focused tests and 100 additional exact-decimal probes, including negative values, signed zero, maximum precision, malformed exponent/NaN/Infinity/leading-zero/excess-precision rejection. It found no material false pass or value leakage; stale comments were corrected.

Independent ordering review passed 46 focused tests and verified evidence merging, distinct check identities, cross-source/tie/pair ambiguity and latency bounds. Minor finding: orderRules:null was silently accepted as omitted. A new regression reproduced that behavior before changing defaulting to undefined-only. Local combined payload/observation/evaluator/runtime suite then passed 47 tests. A subsequent schema test now also validates normalized decimal payload evidence with Ajv.

Installed examples and versioned packaging are verified separately. Dedup semantics, actual browser capture, live provider authenticity and remaining enterprise modules/gates are not covered by this review.
