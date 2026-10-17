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

The final candidate build returned release digest
`957fd93959ead2549c3f45fe7566d7906437b72bb39f742c3975dafdb75f7b9c`
and archive digest
`4af6dccd5cefca19c74accd77e3fefea35be13ebef3724ed3175faf0a082ddce`.
Earlier unpublished local candidate hashes are superseded; none identify a
published customer artifact.
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
An independent review found and reproduced an IPv4-mapped IPv6 private-address
bypass and a Node 22 DNS lookup callback bug. Regression tests now cover those
cases; an ordinary `https://example.com/` fetch using the final code returned
HTML successfully. Optional off-site logo redirects now fall back to a
generated mark, while unsafe homepage destinations remain blocked. Explicit
changes to name, website, or supplied logo bytes invalidate profile reuse.

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

The checker rejects remote `srcset`, unquoted script URLs, SVG image links,
unchecked external script/stylesheet files, base URLs, embedded documents,
automatic redirects, CSS imports in local SVGs, and active citation links. It
requires an early restrictive Content Security Policy (CSP) in the delivered
HTML. A second independent review reproduced an accepted deck that requested
a CDN image through an HTML
`<base>` element; Chrome reached the exporter's blocking proxy, proving the
request attempt. Regression tests now reject that deck and the other observed
unchecked forms. The same review found special-use IP ranges missing from the
brand fetch filter; these are now rejected before transport. A real Chrome
reprint of the pilot with the required CSP passed the revised checker.
The reviewer verified that a real early CSP blocked a dynamically created
remote image in Chrome; commented fake CSP and entity-encoded active links
were then reproduced and added to the checker regression set.

The checker now rejects a malformed PDF with a matching hand-written sidecar
using minimum PDF structure checks. The exporter also rejects source HTML that
changes while it prints. These are structural gates, not a full PDF parser,
evidence auditor, or visual diff. The sidecar is a checksum binding the bytes
delivered together; it does not independently prove Chromium rendered them.
Human review must still confirm PDF rendering, claims, visual quality, source
labels, keyboard use, and local asset portability in the actual customer
output. A disconnected browser run remains necessary because static inspection
cannot prove arbitrary active content works offline. Chrome itself attempted
background Google requests during an export with a fresh profile, so counting
all proxy requests would reject a valid deck; the proxy still blocks transfer.

## Host trial

Both trials use the same brief and an installed bundle in isolated local
projects. The brand is deliberately absent so the host must use the
provisional path.

| Host                         | Observation                                                                                                                                                                                                                                                                                                                                             | Gate                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Codex, first run             | Authored a five-slide HTML deck and provisional brand. Chrome launch was blocked in its sandbox, so it independently generated a PDF. The earlier static checker accepted its page count despite the PDF not being printed from the HTML.                                                                                                               | Fail; exposed gate gap |
| Codex, browser-enabled rerun | Produced a five-slide offline HTML deck, provisional identity, and five-page Chrome-printed PDF with matching provenance. The installed checker passed; the host reported desktop, short, phone, PDF, and disconnected-network inspection.                                                                                                              | Pass for this trial    |
| Claude Code                  | Produced a provisional identity, six-slide HTML, and six-page Chrome-printed PDF after correcting overflow and print layout. The final installed checker returned `valid: true`, `slides: 6`, `errors: []`. The host reported desktop, short, phone, and PDF visual checks; offline network disconnection and external customer review remain untested. | Pass for this trial    |

The Codex result exposed a real acceptance gap. The workflow now explicitly
requires reporting an undelivered PDF when Chrome/Chromium cannot run, and
`check-deck.mjs` rejects a PDF without the exporter's HTML/PDF provenance
sidecar. A regression test rejects separately authored PDFs and another
rejects a stale PDF after the HTML changes. The browser-enabled Codex rerun
passed this gate. It ran before the independent-review safety fixes. The latest
checker requires an early CSP, so this historical output does not pass the
final candidate gate without regeneration.

The [Codex rerun archive](problem-presentation-codex-trial/out/deck.html)
preserves the host-generated HTML, [PDF](problem-presentation-codex-trial/out/deck.pdf),
[provenance sidecar](problem-presentation-codex-trial/out/deck.pdf.provenance.json),
brand profile, and copied local source snapshots. Its PDF and sidecar remain
intact as historical trial evidence.

The [Claude trial archive](problem-presentation-claude-trial/out/deck.html)
preserves the host-generated HTML, [PDF](problem-presentation-claude-trial/out/deck.pdf),
[provenance sidecar](problem-presentation-claude-trial/out/deck.pdf.provenance.json),
brand profile, and the two local source snapshots to which the deck links.
The copied archive passed the earlier installed `check-deck.mjs`; the latest
checker requires a CSP absent from this historical output. The host's first
PDF was only five pages for six slides;
its final print rules and second export corrected that mismatch. The host noted
small print source tags (12px), so readability needs another human review.

## Verification and next gate

Local verification: 161 Vitest tests passed; `npm run format:check`,
`npm run lint`, `npm run typecheck`, `npm run build`, both new skill validators,
and `git diff --check` passed after excluding generated build and session
scratch paths from formatting/lint. Package install proves the files and
notices land in both supported host directories. It does not prove both hosts
complete the customer task.

Before commercial release, rerun both hosts against the final post-review
candidate bundle, verify the offline network-disconnected path and source-tag
readability in the Claude output, and have a customer or independent human
review claim-to-source accuracy, keyboard navigation, and visual quality.
Record any upstream
patch or workflow change with a new component digest and solution version.
