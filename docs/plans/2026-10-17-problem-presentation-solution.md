# Problem Presentation Solution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a versioned Codex/Claude Solution Skill that turns one evidenced problem into a branded, offline HTML and PDF decision deck using two pinned public skills.

**Architecture:** `problem-presentation` coordinates intake, narrative, and QA. A bundled `presentation-brand` skill creates a local brand profile and logo with safe website extraction and a deterministic provisional fallback. Pinned `visual-explainer` provides the slide workflow and engine; pinned `diagram-design` supplies a diagram when it adds information. The existing solution builder packages all four components with notices and immutable digests.

**Tech Stack:** Node.js 22 ESM, TypeScript catalog/release engine, YAML manifests, Vitest, Chromium print pipeline.

**Spec:** [Problem Presentation Solution design](../designs/2026-10-17-problem-presentation-solution-design.md)

## Global Constraints

- Supported hosts: Codex and Claude Code only.
- HTML opens offline; PDF renders the same deck, preserving readable text and source references.
- Never fabricate claims, numbers, quotes, or an official company identity.
- Pin public components to full commits and SHA-256 skill digests; preserve MIT notices and exact source paths.
- Keep `SKILL.md` entrypoints concise and put detailed procedures in references.
- Do not change the released `codebase-onboarding@1.1.0` bundle or its component digests.

## Review Focus

- A URL resolves to a private address or redirects to one: refuse network access.
- A logo is SVG with active content or points off site: reject it and generate a local safe mark.
- A site has no usable logo, colors, or brand name: produce stable provisional tokens and mark them as proposed.
- A slide references a remote font, script, image, or CSS: reject offline delivery until localized or removed.
- A deck overflows at a short viewport or loses a factual source in PDF: fail the delivery check.

---

### Task 1: Pin and package the slide upstream

**Files:** Modify `catalog.yaml`; test `tests/upstreams.test.ts` and `tests/solutions.test.ts` as needed.

**Interfaces:** Produce catalog upstream record `visual-explainer` with `skillPath: plugins/visual-explainer`; reuse existing pinned `diagram-design` record. Later tasks consume their IDs and digests.

- [ ] Inspect exact upstream commit, license, skill contents, bundled scripts, and external resource references. Record SHA-256 tree digest.
- [ ] Add the upstream source and record to `catalog.yaml`; do not mark a Solution release ready yet.
- [ ] Run catalog/skill validation and pinned digest check. Commit the reviewed pin.

### Task 2: Build the brand adapter

**Files:** Create `skills/presentation-brand/SKILL.md`, `skills/presentation-brand/references/brand-workflow.md`, `skills/presentation-brand/scripts/brand.mjs`, focused helper modules under `scripts/lib/`, and `tests/presentation-brand.test.ts`.

**Interfaces:** `createPresentationBrand({ title, brandName?, website?, logoPath?, outputDirectory, refresh?, fetchImpl?, lookupImpl? }) -> Promise<BrandProfile>` writes `brand.json` and a safe local logo asset. CLI accepts `--title`, `--brand-name`, `--website`, `--logo`, `--output-dir`, `--refresh`. The profile records `status: official-source | provisional`, source URL/path and confidence, palette, font stack, and local logo path.

- [ ] Write failing tests for first-party raster logo and color extraction, unsafe URL/redirect and SVG rejection, no-brand fallback stability, contrast, and profile reuse.
- [ ] Implement bounded public HTTP(S) fetch and first-party asset selection; reuse the established static extraction approach while keeping released skills unchanged.
- [ ] Implement deterministic fallback palette, safe SVG monogram/wordmark, profile write/reuse, and CLI.
- [ ] Run focused tests and skill validator; commit adapter.

### Task 3: Compose the presentation workflow and delivery checks

**Files:** Modify `skills/problem-presentation/SKILL.md`; create `skills/problem-presentation/references/production-workflow.md`, `skills/problem-presentation/scripts/check-deck.mjs`, `skills/problem-presentation/scripts/export-pdf.mjs`, and `tests/problem-presentation.test.ts`.

**Interfaces:** `checkDeck(htmlPath, { pdfPath? }) -> Promise<CheckResult>` checks portable references, slide structure, source pointers, and print style; CLI exits nonzero on failure. `exportPdf(htmlPath, pdfPath, { chromePath? })` prints from a local Chromium/Chrome browser and verifies nonempty PDF. The skill directs the host to use the pinned upstream slide template and diagram skill, then run both checks.

- [ ] Write failing tests for remote assets, missing source mapping, empty/malformed slide structure, and valid offline deck.
- [ ] Implement the static checker and a narrow Chrome/Chromium PDF export path. Keep source content out of shell interpolation.
- [ ] Write the handoff instructions: brand profile precedes layout, `visual-explainer` owns the slide engine, `diagram-design` receives factual labels and tokens only when needed, and final QA covers browser sizes and PDF.
- [ ] Run focused tests and skill validator; commit the workflow.

### Task 4: Version, build, install, and evaluate

**Files:** Create `solutions/problem-presentation.yaml`, `docs/research/problem-presentation-solution-evaluation.md`; modify `catalog.yaml`, `docs/agent-catalog.md`, `README.md`, and `docs/guides/technical-v1.md`; add a release integration test under `tests/`.

**Interfaces:** Solution ID and entrypoint `problem-presentation`, version `0.1.0` until both host trials meet the design's quality gates; components in execution order: `problem-presentation`, `presentation-brand`, `visual-explainer`, `diagram-design`.

- [ ] Add a manifest with exact bundled and upstream digests, ordered components, hosts, outcome, and quality gates. Test release build and install into temporary Codex/Claude target paths.
- [ ] Rebuild the pilot from the new workflow. Evaluate a supplied brand, weak brand, and no-brand case; inspect desktop, short, narrow, offline, and PDF output, and record evidence and any limits.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, skill validation, `git diff --check`, and `build-solution problem-presentation`.
- [ ] Try end-to-end tasks in actual Codex and Claude Code hosts if available. Record unrun host checks as release blockers; do not claim commercial readiness from package tests alone.
- [ ] Update catalog and setup docs with accurate status; commit the integration.

## Self-review

Tasks 1–4 cover provenance, brand input and fallback, slide composition, diagram handoff, offline/PDF, release lock, and evaluation. Interface names and component IDs match the spec. The builder may choose the concrete profile schema details, output filenames, and browser discovery order within the contracts above.
