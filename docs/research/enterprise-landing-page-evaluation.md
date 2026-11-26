# Enterprise Landing Page 0.1.0 evaluation

Status on 2026-11-26 is an evaluation candidate. The public product lifecycle
requires the acceptance matrix in the
[customer guide](../guides/enterprise-landing-page.md#evaluation-before-commercial-distribution).

## Artifact record

| Artifact                                                       | SHA-256                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Solution directory fingerprint for `install-solution --digest` | `8c30a1fb42e59e718104810d443a51736b4803e0cd834ada97debcd515694592` |
| `agent-skills-solution-enterprise-landing-page-0.1.0.tgz`      | `fc248f6dc376565dd0008efb476e0f5ef3cff137939c3a76e5e52658a8972d30` |
| `agent-skills-cli-1.3.0.tgz`                                   | `c728f1fa1ddc2f070249b9533d652bb77ee40670264bfd7ee95fbfb4f4ac54c0` |

The CLI archive installed offline into a fresh prefix. Its bundled installer
verified and installed the extracted Solution archive in clean Codex-only,
Claude Code-only and dual-host projects. The dual-host install lock records one
component and both targets. The source review independently fetched the pinned
upstream commits and matched all five tree digests plus the separate Claude
Code Impeccable tree. The archive includes the MIT and Apache-2.0 license texts
and the original Impeccable notice.

## Host trials

- Build fixture. Vietnamese workshop landing page with provisional branding,
  a local signup-information anchor, no booking endpoint, and an unsupported
  request to claim 98% customer satisfaction. Expected output is a truthful
  preview, no data collection and an explicit request for the missing inputs.
- Review fixture. English bicycle tune-up booking page with a broken anchor and
  unsupported certification. Expected output is an evidence-based review
  across both handoff formats with the original route bytes preserved.

Use the same brief, archive and acceptance criteria for each host. Collect the
page, handoff, screenshots and browser results. For the workshop preview, check
320, 768 and 1440 CSS pixels, language, H1 count, horizontal overflow, keyboard
activation of the primary CTA, target visibility, unsupported proof, remote
requests and page errors. Verify both handoffs and validate the JSON schema.

| Trial                               | Codex CLI 0.166.0                                                                                                | Claude Code 2.1.332                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Vietnamese build and handoff        | HTML, Markdown and schema-valid JSON                                                                             | HTML, Markdown and schema-valid JSON             |
| Chrome 158 responsive smoke test    | Passed at 320, 768 and 1440 CSS px                                                                               | Passed at 320, 768 and 1440 CSS px               |
| Provisional signup                  | Keyboard-activated CTA reached the informational section at all three widths. Live booking stayed pending.       | Same checks passed. Live booking stayed pending. |
| Missing proof and external activity | Unsupported statistic absent from the page, no remote requests, page errors or data fields in the observed views | Same checks passed                               |
| English review-only                 | Identified the broken CTA and unsupported certification, wrote both handoffs and preserved the original HTML     | Same checks passed                               |

The compact mobile captures show how the two hosts handled typography,
section density and disclosure of the provisional state. These trials cover
local static authoring and source review. They did not exercise a real
registration service, consent or measurement system, a framework redesign, or
a full accessibility conformance audit. The design quality advantage of the
combined workflow remains unmeasured.

## Repository verification

Package validation, format, lint, typecheck, build and patch whitespace checks
passed. The first full suite hit timeouts under default parallelism. The
full suite rerun with `npm test -- --maxWorkers=3 --testTimeout=30000`
passed all 2,272 tests across 169 files. The two packager and landing page
suites also passed in isolation.
