# Enterprise Landing Page 0.2.0 candidate evaluation

The development candidate remains on an isolated branch. The public pilot
continues to use 0.1.0. Keep the public installer on an immutable 0.1.0
revision before merging any change to the version built from `main`.

## Artifact identity

| Item                                                      | SHA-256                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| Release directory for `install-solution --digest`         | `62d2aafd5dd395e445de1e4fc6bb769490f92cc62556e8a3cfafcffc649c1e27` |
| `agent-skills-solution-enterprise-landing-page-0.2.0.tgz` | `a3e9117f9a021c1890d336cc06a9f375b8c414cebfdfe2981db41843256547ab` |
| Preserved 0.1.0 archive                                   | `fc248f6dc376565dd0008efb476e0f5ef3cff137939c3a76e5e52658a8972d30` |

Both archives installed into separate test projects targeting Codex and Claude
Code. The published CLI archive also installed 0.2.0 offline into one fresh
project with both host targets on the lock. The 0.2.0 lock includes the previously pinned design and copy guidance,
Product Marketing and CRO at the reviewed commit, and the MIT-licensed Vercel
Web Interface Guidelines snapshot. The Vercel wrapper and Impeccable engine
are outside the installed package.

## Host and browser observations

The [test briefs](../../tests/fixtures/enterprise-landing-page/briefs/vague.md)
use fictional brands and a local booking fixture. The runs used Codex CLI
0.166.0 and Claude Code 2.1.332. Chromium was exercised independently of the
host to measure rendered width, basic metadata, primary action and motion
preference. Restricted Claude Code runs could read the installed package but
one explicitly reported the slash command unavailable in that configuration.
A separate non-restricted vague-prompt run asked before editing. Some original
build runs exceeded the trial timeout, with follow-up runs used to collect
missing files. These outcomes are exploratory and should not be aggregated
as a clean first-run completion rate.

- Both 0.2.0 hosts asked for audience, offer and CTA on the vague brief without
  creating implementation files. In the 0.1.0 replay Codex started writing a
  generic page, and the restricted Claude run timed out without a usable reply.
- The complete Vietnamese SaaS briefs proceeded to implementation on both
  0.2.0 hosts. Independent browser replay found no horizontal overflow at
  320, 390, 768 and 1440 CSS pixels and the demo anchor worked with keyboard
  input in both motion modes. The Claude build had one active animation at the
  sample point in default mode and zero in reduced mode.
- Both candidate redesigns preserved the reserved destination and loaded the
  original illustration. The reservation link worked by keyboard in both
  motion modes and the page had no horizontal overflow across the four widths.
  Codex placed the two handoffs alongside its fixture directory to preserve
  the requested project scope. Both review-mode runs preserved the HTML bytes.
- Both booking candidates sent zero requests with empty or invalid input,
  received 201 for the valid synthetic booking and 503 for the error case,
  and displayed error feedback. These checks ran against a fixture service.
  The Claude Code candidate needed a follow-up to complete the implementation
  and produce both handoff files.
- All eight non-vague candidate handoff JSON files passed schema validation
  after collecting the follow-up artifacts. This validates their structure.
  The separate browser replay provides observations for the served pages.

## Independent visual comparison

One independent reviewer scored anonymized 390px captures. Each row shows
baseline → candidate scores on the 1–5 rubric.

| Fixture                       | Composition | Clarity | Credibility | Brand fit | CTA findability |
| ----------------------------- | ----------- | ------- | ----------- | --------- | --------------- |
| Vietnamese SaaS · Claude Code | 4 → 4       | 5 → 4   | 5 → 5       | 5 → 5     | 5 → 5           |
| Booking · Codex               | 4 → 5       | 5 → 5   | 5 → 4       | 5 → 5     | 5 → 5           |
| Redesign · Codex              | 4 → 4       | 4 → 5   | 4 → 4       | 5 → 5     | 5 → 5           |

The candidate booking layout brought the form closer but made the explicitly
test-only context easier to miss. The candidate SaaS layout surfaced its sample
data warning but made the warehouse reassignment harder to follow. The
candidate redesign made the heading more concise. Motion suitability was
unrated from still captures. These mixed observations do not establish a
consistent design improvement.

## Distribution decision

The candidate is ready for further testing from the verified archive.
Commercial acceptance remains open under the
[published evaluation criteria](../guides/enterprise-landing-page.md#evaluation-before-commercial-distribution).
Complete a clean first-run matrix, repeat on a representative customer
staging integration, and record the owner's acceptance before changing the
public status. No production leads, tracking or publication occurred during
these trials.

The repository programming suite passed 2,272 tests across 169 files. The
site build, typecheck, 19 unit tests and 11 targeted browser tests passed.
