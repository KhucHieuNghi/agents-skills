# Enterprise Landing Page 0.2.0 Implementation Plan

> For agentic workers, use the executing-plans workflow and track progress with the checkboxes below.

**Goal** — Ship a candidate that asks for missing customer decisions, builds a recognizable brand-specific page and supplies reproducible evidence for design, motion, conversion, responsive behavior and basic SEO.

**Architecture** — Keep one customer entrypoint and extend its internal references. Preserve customer design systems and use optional browser tools as test-time capabilities. Keep package provenance and product acceptance under the existing release workflow.

**Stack** — Codex, Claude Code, Markdown, JSON Schema, TypeScript release CLI, Vitest and Playwright. Optional axe automation supplements manual accessibility checks.

**Baseline** — [0.1.0 workflow](https://github.com/KhucHieuNghi/agents-skills/tree/160b3079a25342020b1ac2d154bdb83cfea40485/skills/enterprise-landing-page), [evaluation record](../research/enterprise-landing-page-evaluation.md) and [commercial criteria](../guides/enterprise-landing-page.md#evaluation-before-commercial-distribution).

**Execution status** — The 0.2.0 candidate implementation and archive are complete. See the [candidate evidence](../research/enterprise-landing-page-evaluation-0.2.0.md) for host trials, retries and the independent visual comparison. A clean first-run matrix and commercial acceptance remain open.

## Constraints

- Preserve the `0.1.0` release bytes, install record and setup route during development. Develop `0.2.0` as a candidate. Publish a new setup only after verifying the exact package it installs.
- The live `0.1.0` setup currently downloads `main` and validates a fixed digest. Keep candidate changes off `main` until the setup is pinned to an immutable `0.1.0` source revision or the verified replacement can go live with the merge.
- Maintain one skill for Codex and Claude Code. Support English and Vietnamese collaboration and the page locale requested in the brief.
- Respect existing routes, integrations and approved brand sources. Keep publishing, production lead submission, tracking and external asset uploads subject to explicit customer authorization.
- Keep Motion and UI/UX Pro Max optional. Review commit, license, notices, adapted material and runtime behavior before adding upstream dependencies or redistributing guidance. [Composition provenance](../guides/composition-provenance.md)

## Failure cases to exercise

| Case                                               | Expected behavior                                                                | Owner     |
| -------------------------------------------------- | -------------------------------------------------------------------------------- | --------- |
| Vague brief with no product or audience            | Ask targeted questions before editing implementation files                       | Task 1    |
| Complete brief or approved brand docs              | Reuse supplied context and proceed without redundant questions                   | Task 1    |
| Long bilingual text, disabled motion or slow start | Primary message and action stay visible and operable                             | Tasks 2–3 |
| Unknown production URL or private campaign         | Preview keeps the intended visibility and avoids inventing a canonical           | Task 3    |
| Existing form plus a scoped redesign               | Preserve the approved integration and unrelated routes, test with synthetic data | Tasks 3–4 |

## Task 1 — Ask the missing questions and choose a direction

**Files** — Update `skills/enterprise-landing-page/SKILL.md`, `references/brief-copy.md` and `references/direction-build.md` within that package. Freeze the paired prompts in `tests/fixtures/enterprise-landing-page/briefs/`.

- [ ] Record the baseline behavior for a vague request and a complete request on both hosts. Preserve the prompt, first substantive reply and changed-file list.
- [ ] Adapt the intake pattern from [Product Marketing](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/product-marketing/SKILL.md). Read the customer brief, brand guide, repository and current routes. Ask one batch about missing decisions that affect the page. Cover audience, offer, channel, primary action and destination, approved assets or proof, and style references only as needed.
- [ ] Make the routing observable. Missing audience, offer or primary action triggers targeted questions before page implementation. An explicit prototype request can proceed with visible assumptions. A complete brief proceeds with the direction summarized in the handoff. Missing proof is excluded from copy and recorded as an open input.
- [ ] Have Taste and Hallmark inform a short direction containing the real material shown in the hero, reading order on phone and desktop, and one reason the visual idea fits this customer. Offer distinct options when the brief leaves a consequential design choice open. Use Copywriting to connect each section to a visitor question and a supported product fact.
- [ ] Re-run the paired prompts. Verify that an incomplete brief requests the missing decisions before editing, a complete brief proceeds, and the proposed hero includes a product or brand-specific element.

## Task 2 — Define motion, reading order and typography

**Files** — Add `skills/enterprise-landing-page/references/motion-responsive.md` and link it from `references/direction-build.md`. Update `references/refinement-qa.md` within the package.

- [ ] Review the pinned Taste and Impeccable material and the newer upstream guidance. Record which rules to adapt in `NOTICE.md` and the provenance lock. Use Impeccable's animation, adaptation and typography guidance selectively. [Taste Skill changelog](https://github.com/Leonxlnx/taste-skill/blob/main/CHANGELOG.md) · [Impeccable](https://github.com/pbakaus/impeccable)
- [ ] Give animation a purpose in the brief, such as showing product behavior or confirming an action. Prefer CSS or an existing project primitive for simple motion. Provide a reduced-motion treatment and keep the headline, essential content and CTA available before enhancement. Offer Motion only where the stack and interaction warrant it. [Motion accessibility](https://motion.dev/docs/react-accessibility) · [web.dev animation guidance](https://web.dev/articles/animations-guide)
- [ ] Specify how the layout reflows and how copy wraps. Cover fonts with Vietnamese diacritics, long localized strings, tap and focus states, and image sizing. Check the hero and the primary action at 320, 390, 768 and 1440 CSS pixels.
- [ ] Test default and reduced motion on rendered pages. Capture the hero and an interaction state in each mode. Verify that the primary action and content remain available in both and the page stays usable when enhancement is disabled.

## Task 3 — Make conversion, SEO and QA results verifiable

**Files** — Update `references/refinement-qa.md`, `references/handoff.md` and `references/handoff.schema.json` within `skills/enterprise-landing-page/`. Extend `tests/enterprise-landing-page-solution.test.ts`. Add the replay cases under `tests/fixtures/enterprise-landing-page/`.

- [ ] Select applicable rules from Vercel's pinned Web Interface Guidelines for focus, touch, forms, typography, images and motion. Check the license and attribution of the source snapshot before copying or adapting text. Keep the standards-based test criteria usable when a host lacks an optional tool. [Vercel skill](https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/web-design-guidelines/SKILL.md)
- [ ] Add a basic SEO pass. Check semantic HTML, descriptive title and description, document language, meaningful image alt text and link destinations. Check intended indexability and a canonical only when the production URL is known. Use localized alternates only for actual published equivalents. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [ ] Add targeted CRO checks when a conversion flow exists. Verify the primary CTA and its destination, form validation, success and service-error handling in a local or authorized test environment. Keep the existing wiring during a scoped redesign. [CRO skill](https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/cro/SKILL.md)
- [ ] Attach evidence to the existing handoff gate IDs. Use `responsive` for viewport results, `accessibility` for keyboard, reduced-motion and axe findings where available, `discoverability` for SEO and `conversion` for the primary journey. Record device, environment, result and artifact. Missing tools or an unreachable test integration leave the affected check pending and produce a specific next action.
- [ ] Run `npx vitest run tests/enterprise-landing-page-solution.test.ts`. Extend it to reject unsupported readiness when conversion evidence is pending or responsive evidence is missing. Run browser and manual checks separately, including a test with reduced motion and a test with no production URL. [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)

## Task 4 — Compare both versions and prepare the release

**Files** — Update `skills/enterprise-landing-page/NOTICE.md`, `skills/enterprise-landing-page/provenance.lock.json`, `solutions/enterprise-landing-page.yaml` and the package tests as needed for the new version. Record results in `docs/research/enterprise-landing-page-evaluation-0.2.0.md`. Synchronize the customer guide and `site/src/components/EnterpriseLandingSetup.astro` when the new candidate is ready to distribute.

- [ ] Freeze four brief types. Use a Vietnamese SaaS lead page, an English booking page with a test endpoint, a retail redesign in an existing repo, and a review with missing asset rights and analytics. Include the incomplete and complete intake variants from Task 1 as behavior checks.
- [ ] Run the same briefs against installed `0.1.0` and `0.2.0` on Codex and Claude Code. Record host version, package digest, prompt and answers, screenshots, test environment and handoff. Use synthetic accounts and fixture endpoints for integration tests.
- [ ] Have independent reviewers score anonymized outputs against the brief. Preserve the existing 1–5 rubric for composition, clarity and credibility. Record brand fit, CTA findability and suitability of motion separately. Use differing briefs to check whether the outputs still share the same hero or section formula. Report the reviewed outcomes and unresolved cases before making any improvement claim.
- [ ] Recompute and verify source and package locks. Run formatting, lint, typecheck, build and tests. Build `0.2.0`, extract its archive and install independently into fresh Codex and Claude Code projects. Verify the version, installed lock and entrypoint. Compare against the frozen `0.1.0` artifacts.
- [ ] Before updating the manifest on `main`, verify the existing `0.1.0` setup against the preserved source and archive. Use the installed state to check target, version and directory digest.
- [ ] Check the [existing commercial release criteria](../guides/enterprise-landing-page.md#evaluation-before-commercial-distribution) against the evidence. Record the owner decision separately. For distribution, update the public label and guide to match the decision, validate the version and digest used in the setup block, and verify the deployed Vietnamese and English pages plus both host install paths.
