# Customer branding and source dates — 0.1.12

The pinned 0.1.12 archive was extracted and installed into three fresh projects:
Codex, Claude Code and the combined target set. Installed CLI commands executed
start, campaign, campaign-index, campaign-review and campaign-report against one
local synthetic Markdown item per project. All global reviews explicitly remain
unknown; the trial does not manufacture a completed semantic audit.

Both standalone and unified HTML/Markdown reports preserve a Vietnamese customer
brand containing HTML-like text, an ampersand and quotes. HTML escapes the entire
value; neither report contains an executable script tag or forced NKSkills name.
Both disclose unavailable measurements and partial completion. Every collected
evidence timestamp and all 26 rule review dates appear in both formats. Markdown
date comparisons account for escaped punctuation. Campaign manifest hashes match
the actual output bytes. Original content and installed component digests remain
unchanged.

This closes the previously unverified CLI branding path. It proves timestamp
display, **not computed elapsed source age**, visual browser rendering, a complete
brand design system, live measurements or native model semantic quality. The
compound Task 6 output requirement remains open for its other requirements.

## Reproduction and evidence

```sh
npm run build
node docs/research/content-search-audit-trials/branding-0112/verify.mjs
```

The runner verifies the frozen archive hash and creates fresh temporary projects;
it never overwrites this retained receipt. See receipt.json for the runner/package
hashes and assertions. artifacts.tgz preserves content, config, source audit,
index, review and report files for all three projects. archive-validation.json
records every archived file hash and the successful byte-for-byte extraction check.
Installed skill trees are omitted from the evidence archive; use the pinned
release archive to reproduce installations.

Two initial runner attempts failed because the runner requested evidence.json
instead of evidence.jsonl and compared Markdown timestamps without unescaping
punctuation. These were harness corrections; no package bytes changed. The final
runner completed all three target configurations.
