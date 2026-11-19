# Journey evidence coexistence checkpoint

The development integration test `tests/content-audit-journey-composition.test.ts` exercises three workflows in one immutable enterprise run: a reviewed synthetic experiment at 4 November, a task observation at 19 November, a supplied funnel assessed at that same later time, and experiment reassessment. Each workflow deliberately uses the same evaluation ID in its separate namespace. Two cases begin with provided and declined experiment requests respectively.

Both cases pass. Every prior evidence object and source-run digest is checked after each transition. The original experiment evidence remains present, its one request becomes expired or remains declined, and UX checks stay unknown. A combined canonical report is saved and reloaded with task, funnel and experiment projections; JSON, Markdown and HTML retain task interpretation and historical/blocked experiment text while withholding raw source fields and private fixture identifiers.

The funnel is intentionally stale at the final assessment. This is coexistence and lifecycle evidence, not three fresh providers or a real customer audit. The test supplies fixture bytes and manually concatenates the returned projections. It does not implement automatic report assembly, prove completeness of every narrative, or exercise native hosts, all modules, browser layout, production accounts or release packaging. No customer evidence is relabeled as a fixture.

## Required next implementation

The product still needs an authoritative assembly path that reconstructs every supported module projection from the final stored run, using one assessment time and its actual evaluator fingerprint. It must reject incompatible history, retain declined/expired requests, mark historical evidence accurately, and prevent a caller from omitting a module simply by leaving its projection out of the report bundle. Reusing an earlier workflow return after later scope, policy or time changes is not an acceptable freshness contract.

Implementation should separate replay/projection from mutation in the existing journey workflows, then assemble only after final run validation. Each supported index must account for every owned evidence/check/request; unsupported namespaces must remain explicit rather than disappear. Tests must cover both execution orders, source/hash tampering, stale clocks, same IDs across namespaces, deleted indices, projection omissions and private-content exclusion. This extends the parent journey plan and does not replace analytics, tracking, accessibility, performance or technical SEO assembly requirements.

## Independent review corrections

The reviewer independently ran the initial two cases and identified two material coverage gaps, not demonstrated production defects: only experiment ownership was asserted, and generic report markers did not prove the funnel contribution. The tests now require exact task/funnel index and check preservation, nonempty expected check sets, policy and request continuity, and retained evidence references after experiment reassessment. They also assert the experiment request is already expired or declined immediately after the task advances the clock.

The final canonical report must contain the funnel-specific unknown/ineligible check and request, plus exactly four unknown/null funnel observations tied to its evidence. Missing data therefore cannot silently become zero, and experiment-only narrative markers cannot satisfy funnel coverage. Both strengthened cases pass. Automatic assembly and reverse-order coverage remain open as described above.

Final independent review reran both strengthened cases successfully and found no remaining material issue within the tested order/caller-assembly scope. Final repository checks returned zero for format, lint, typecheck, build, root tests, site typecheck and site tests; logs are retained in `build/enterprise-journey-composition-final-verification/`. No production workflow, skill package or deployment was changed.
