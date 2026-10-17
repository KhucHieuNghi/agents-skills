# Problem Presentation Solution evaluation

- Date: 2026-10-17
- Candidate: `problem-presentation@0.1.0`
- Status: **evaluation candidate; commercial acceptance is open**

## Composition and traceability

The [solution lock](../../solutions/problem-presentation.yaml) orders four
components: original `problem-presentation` workflow, original
`presentation-brand` adapter, pinned public `visual-explainer`, and pinned
public `diagram-design`. The [catalog](../../catalog.yaml) records each public
repository, full commit, skill path, tree digest, MIT license, attribution,
and local-change state. The release builder copied all four skills and their
notices into an immutable candidate bundle; it did not update
`codebase-onboarding@1.1.0`.

| Upstream           | Pinned commit                              | Skill digest                                                       |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------ |
| `visual-explainer` | `5a1b3c4d6e86c6d0225c6d8ee0972f4d02108be2` | `3c0edcd831bd5954fa851590b56380260e8fd1119f5c45f119735b02381efd54` |
| `diagram-design`   | `550fd66edff058bc73056c3416b76d69cfe865ba` | `70ed7ab8bcace86ae0f754da986a240ec9d5a6f826fe8e7df1d3310b218a0794` |

Candidate build command:

```bash
node dist/cli.js build-solution problem-presentation --output build/problem-presentation-0.1.0
```

The local build returned release digest
`6e3550759c1096c3efc695d09acc7c9aab3020a93f51c53eddaf79250c072480`
and archive digest
`36408df6473af26df577b30948e164d9fe8e146e97df9107aea3d07d8b9cd05e`.
These identify the evaluated local build, not a published customer artifact.
The release installed into an isolated project with canonical copies under
`.agents/skills/` and Claude links under `.claude/skills/` for all four
components. The installer verified the release digest before copying.

## Brand scenarios

The adapter tests exercise three paths with controlled website responses.
They do not establish visual fidelity for arbitrary real company websites.

| Input                                      | Observed behavior                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Official site with usable first-party logo | Copies a raster logo locally; records source URL, candidate colors, and contrast adjustments.     |
| Site with weak or unsafe assets            | Rejects active SVG/private redirect and creates a safe provisional mark for the missing logo.     |
| No name and no URL                         | Generates a deterministic provisional name, palette, and local SVG; reuse keeps the same profile. |

The [pilot brand profile](problem-presentation-solution-pilot/brand/brand.json)
uses the third path: “Aster Studio” is explicitly provisional. It is an
illustrative identity, not a claim about a real company.

## Pilot deck and delivery checks

The [HTML pilot](problem-presentation-solution-pilot/deck.html) addresses one
real catalog decision: the local `html-slides` rewrite has no recorded original
derivation commit. It cites the local catalog and product model, shows the
missing link as unknown in a diagram, and asks for a bounded provenance
search. It uses the pinned Visual Explainer slide template, adapted with the
brand profile and an SVG diagram based on Diagram Design's composition rules.
No invented metric or business impact is used.

The HTML has five slides and no remote assets. The static checker returned
`valid: true`, `slides: 5`, `errors: []`. Chromium printed the same HTML to
[PDF](problem-presentation-solution-pilot/deck.pdf) and wrote its
[provenance sidecar](problem-presentation-solution-pilot/deck.pdf.provenance.json).
The combined checker verified PDF bytes, source HTML digest, and five page
markers. A visual inspection of a rendered PDF contact sheet found five
separate readable pages with source labels and the diagram. Browser inspection
at desktop, 1280×600, and 390×844 found no slide overflow or horizontal page
scroll. A narrow-screen collision with the navigation dots was fixed by
reserving right-edge space; the narrow view was checked again.

The checker is a structural gate, not an evidence auditor or a full visual
diff. The sidecar binds the bytes delivered together but cannot prove a
browser render independently of the controlled exporter. Human review must
still confirm claims, visual quality, source labels, keyboard use, and local
asset portability in the actual customer output.

## Host trial

Both trials use the same brief and an installed bundle in isolated local
projects. The brand is deliberately absent so the host must use the
provisional path.

| Host        | Observation                                                                                                                                                                                                                                                                                                                                             | Gate                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Codex       | Authored a five-slide HTML deck and provisional brand. Chrome launch was blocked in its sandbox, so it independently generated a PDF. The earlier static checker accepted its page count despite the PDF not being printed from the HTML.                                                                                                               | Fail                |
| Claude Code | Produced a provisional identity, six-slide HTML, and six-page Chrome-printed PDF after correcting overflow and print layout. The final installed checker returned `valid: true`, `slides: 6`, `errors: []`. The host reported desktop, short, phone, and PDF visual checks; offline network disconnection and external customer review remain untested. | Pass for this trial |

The Codex result exposed a real acceptance gap. The workflow now explicitly
requires reporting an undelivered PDF when Chrome/Chromium cannot run, and
`check-deck.mjs` rejects a PDF without the exporter's HTML/PDF provenance
sidecar. A regression test rejects separately authored PDFs and another
rejects a stale PDF after the HTML changes. This correction has passed local
tests; the Codex host trial has **not yet been rerun** against it.

The [Claude trial archive](problem-presentation-claude-trial/out/deck.html)
preserves the host-generated HTML, [PDF](problem-presentation-claude-trial/out/deck.pdf),
[provenance sidecar](problem-presentation-claude-trial/out/deck.pdf.provenance.json),
brand profile, and the two local source snapshots to which the deck links.
The copied archive also passes the installed `check-deck.mjs` without changing
the HTML or PDF bytes. The host's first PDF was only five pages for six slides;
its final print rules and second export corrected that mismatch. The host noted
small print source tags (12px), so readability needs another human review.

## Verification and next gate

Local verification: 143 Vitest tests passed; `npm run format:check`,
`npm run lint`, `npm run typecheck`, `npm run build`, both new skill validators,
and `git diff --check` passed after excluding generated build and session
scratch paths from formatting/lint. Package install proves the files and
notices land in both supported host directories. It does not prove both hosts
complete the customer task.

Before commercial release, rerun the same brief in Codex with a browser
available, verify the offline network-disconnected path and source-tag
readability in the Claude output, inspect each host's HTML and browser-printed
PDF on desktop/short/phone/print views, and have a human review
claim-to-source accuracy and keyboard navigation. Record any upstream
patch or workflow change with a new component digest and solution version.
