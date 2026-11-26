# Refinement and acceptance checks

## Hallmark and Impeccable passes

Begin with a Hallmark-inspired sweep of the actual rendered page. Look at its
overall composition before adjusting individual components. Trace the visitor's
reading order and verify that section density, alignment, asset choice and CTA
prominence support the brief. Remove redundant sections and visual cues that
make unrelated content look equally important. Preserve the existing visual
system during a scoped redesign.

After the Taste direction is implemented, use an Impeccable-inspired
critique and focused refinement. Capture the initial state where practical and
name the region, observed defect, effect on the visitor, and smallest useful
change. Review type and line lengths, layout, zoom and wrapping, interaction
states, motion, contrast, browser robustness and localization. Recheck changed
regions and the primary journey after fixes. Report what was inspected and what
remains. A native Impeccable audit or detector result can only be reported if an
authorized, available tool actually ran against the stated target.

## Acceptance evidence

Use the project's available browser and testing tools. Store evidence in a
private workspace when it includes customer details. Each check records
applicability, result, artifact or reproduction steps and scope. For redesigns
capture the initial and final primary route when available.

| Gate ID         | What to verify                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| brand-copy      | Evidence and publication permission for material claims and assets, brand fidelity, and approved or clearly provisional identity                                                          |
| build           | Relevant project build/test exits; load the actual page route with expected assets and no blocking errors                                                                                 |
| responsive      | Inspect representative mobile, tablet and desktop widths, including a narrow width around 320 CSS px; check clipping, reading order, navigation and localized text                        |
| accessibility   | Inspect headings, landmarks, labels, visible focus, keyboard order, contrast, meaningful image alternatives, zoom and reduced motion where applicable; manual checks accompany automation |
| conversion      | Exercise the primary CTA and, when applicable, form empty/invalid/valid, service error and success states in a safe environment; verify agreed test event or document its absence         |
| discoverability | Check title, description, language and intended indexability, plus canonical and share data where applicable                                                                              |
| performance     | Inspect blocking or oversized assets, image dimensions, font loading and layout shifts; record measurement conditions if a tool is available                                              |
| privacy-release | Check planned data collection, third-party integrations, consent behavior where applicable, and any required owner approvals                                                              |

Use actual lab results where available and distinguish them from real-user
performance. The accessibility pass is evidence of the listed checks. Formal
conformance needs an appropriately scoped assessment. If the browser, test
environment, or approved data is unavailable, record `pending` with the
specific dependency and action. Static inspection may support narrower findings
with its scope stated. Record a failing known condition as `fail`. Explain
every `not-applicable` gate.
