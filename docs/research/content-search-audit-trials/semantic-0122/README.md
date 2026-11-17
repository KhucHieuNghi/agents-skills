# Full development holdout replay — candidate 0.1.22

The candidate moves actual-defect and complete-meaning checks into the entrypoint.
Quotation guidance now preserves negation, conditions and assertion boundaries
across physical lines. Measurement guidance distinguishes descriptive results,
generalization/repeatability and causality, including finding titles and summaries.
No upstream pin, helper implementation or historical archive was changed.

## Native execution and assessment

The frozen archive was extracted into fresh Codex and Claude Code projects.
Both received all 12 numbered dossiers plus context, with the original 0.1.12
prompts (only installed host path differs). Gold annotations were withheld.
These are now known development fixtures, not an unseen or independent benchmark.

| Host        | Duration | Supported findings / gold | Quote ledger               | Local report assessment                         |
| ----------- | -------: | ------------------------- | -------------------------- | ----------------------------------------------- |
| Codex       | 148.27 s | 15 / 15                   | 24, receipt replay matches | No reporting error identified in this review    |
| Claude Code | 169.93 s | 15 / 15                   | 56, receipt replay matches | Four report issues; seven RTK-prefix deviations |

Both preserve the descriptive A-to-B improvement, reject the incompatible causal
claim, and account for all 12 dossiers plus context. The prior lost-negation
quotation does not recur. All inputs and installed/source package hashes match;
all eight Codex command calls and eleven Claude tool calls have terminal results.
Claude invokes the installed native Skill entrypoint; Codex reads the installed
entrypoint. Neither result establishes actual browser/PDF extraction capability.

Claude residual issues are retained with exact excerpts:

1. F4 proposes a price title without the already-approved before-tax qualifier.
2. F7 asserts a script/template mechanism despite evidence establishing only a
   raw-versus-rendered difference; the mechanism remains a hypothesis.
3. F13 says the samples have ten prompts each after listing A, B and D; D has 20.
4. F15 replaces the unsupported guarantee with an unscoped markup prerequisite
   without feature-specific eligibility evidence.

The final Claude reply additionally says rendering evidence is absent, although
scenario 05 supplies a ready-DOM snapshot. Live/engine rendering evidence is
absent; supplied rendered evidence is present. This response issue is recorded
separately in validation.json, not silently attributed to the report evaluator.

The author-side evaluator credits finding detection separately from reporting
errors. Codex meets this local rubric; Claude fails reporting and instruction
gates. Both retain releaseAccepted=false. Fifteen supported findings do not
certify every proposed correction, explanation or final-response sentence.

## Evidence and replay

Exact report/response bytes are stored as `.txt`. Adjudications, evaluator receipts,
quote bundles, original/replayed quote receipts, tool inputs and execution receipts
are adjacent. Codex's temporary quote bundle was reconstructed using its recorded
extraction expression; its bundleHash and entire receipt match the original.
Claude's native bundle was retained directly.

`artifacts.tgz` preserves raw events, stderr, process commands, targets, reports,
prompts, responses, execution files, ledgers and Claude's build scripts/template.
All 48 extracted files were byte-compared with originals. `validation.json` binds
hashes and review limits. To replay a quote check after extraction, change only
bundle.root to the extracted host project and use the frozen installed helper;
this changes bundleHash but not source/report hashes or quote results.

Installation succeeded for Codex, Claude Code and combined targets. Six additional
[upgrade checks](../../content-search-audit-0122-upgrade-snapshot.json) cover
0.1.20 and 0.1.21 to 0.1.22 on all three target configurations: modified local
skills are rejected with edits and lock preserved; clean upgrades match the
new digest and retain the combined-host link. No mid-replacement rollback fault
was injected in that check.

Component: `d382407c6b71bd4b8eb3ec7b12c3d3c1c8b785b6f282e2d6e5870df716aa417d`.
Release: `8a5113d62d4ac4fdd578720d3db0ee530bcfa1deb604146a0bc34cf79296b86b`.
Archive: `46fa5f7c239fc1c9be5bf8f4d736ade06590da2096a4628730f87067f697f78d`.

433 tests (61 files), format, lint, typecheck and build pass. These checks do not
replace semantic acceptance. Next work must preserve scope qualifiers and sample
denominators in corrections and summaries, and keep mechanism hypotheses distinct
from observed differences. Independent acceptance and broader extraction gates
remain open; no push, deployment or commercial publication is claimed.
