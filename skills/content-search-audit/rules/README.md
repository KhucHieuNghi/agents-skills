# Core audit rules, registry 0.1.1

`core.json` contains 26 candidate rules across quality, SEO, AIO, AEO, GEO and
portfolio review. Each declares required evidence, applicability, procedure,
limitations, method reference and source context. Linked official guidance is
context, not proof that an individual finding is a ranking factor. The evidence tier distinguishes direct platform/accessibility documentation from
attributed audit methods and original collection diagnostics. A method source
describes an approach; customer evidence must support each finding. The registry
is an auditable starting set, not proof of exhaustive domain-specific coverage.

Use `createCheckPlan(item, registry)` to plan all rules for every in-scope item.
Unknown relevance must be assessed, not silently filtered out. Excluded items need
the scope contract's reason. The complete registry must remain available when
validating a run, so a caller cannot omit rules to manufacture full coverage.

`evaluateChecks(item, evidence, registry)` resolves only two deterministic modes:
nonempty supplied text extraction and observed final HTTP success. Other rules
remain unknown until review. Missing evidence and multiple competing snapshots
remain unknown. A nonempty extraction is not a content-quality pass; an HTTP 200
is not an indexing pass. Empty extraction can indicate extractor failure.

Evidence records retain the main evidence contract fields and additionally carry
`kind` and `value`. Collectors must expose raw content as `content`; extracted text
needs a separate `extracted-text` record with extraction provenance. HTTP evidence
uses `http-response` with `value.status`. Do not relabel raw HTML as extracted text.
Derived records keep their own evidence IDs and snapshot references.

`mergeReviewedChecks(item, evidence, registry, reviews)` accepts explicit host
assessments with ruleId, status, reason, evidenceIds, reviewer and reviewedAt.
Semantic pass/fail must reference all required evidence kinds. Not-applicable
requires evidence supporting applicability. Unknown is retained when evidence is
missing. All references must resolve to that item; cross-item analyses attach a
derived scoped record citing their source dependencies. The final artifact
validator must verify those dependencies separately.

The merger checks structural support, not whether a semantic judgment is true.
Host reviews cannot override deterministic pass/fail; reconcile source evidence
instead. A host may document non-applicability (for example a private export's live
HTTP status), but absence of data alone is not a reason to use not-applicable.

These methods inherit selected upstream procedures documented in NOTICE and the
provenance lock. No numerical global score or ranking-effect weights are present.
New rules require source/applicability review and fixtures before release.
