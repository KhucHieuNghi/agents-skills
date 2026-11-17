# Named output parity — candidate 0.1.11

Three design-contract omissions are now implemented:

- Campaign `coverage.json` preserves recomputed item coverage separately from
  global review completion, unresolved rules, denominator and limitations. Its
  `scope: campaign` envelope has a dedicated campaign-coverage schema; standalone
  coverage retains its existing shape/schema.
- Both render paths emit optional `ai-observations.jsonl` from validated,
  deduplicated observations. Rows carry the bundle-level synthetic label and the
  exact evidence bundle filename/hash. Original input (including duplicate rows)
  and response/source bytes remain unchanged in the JSON evidence bundle. No AI
  input produces no JSONL; explicitly empty observations produce an empty file.
- Campaign HTML/Markdown show all packaged rule IDs, source URLs, review dates and
  limitations. The appendix concerns methodology provenance, not current ranking.

Three tests failed before implementation; affected tests now pass, including
exact standalone/campaign JSONL equality, schema checks, dedup/missingness and
manifest hashes. The full root suite passes 58 files / 418 tests plus format,
lint, typecheck, build and diff. No model behavioral accuracy follows from this.

The frozen archive was extracted and installed fresh for Codex, Claude Code and
combined. Installed campaign-report CLI runs replayed the same historical native
synthetic campaign/review/measurement data. Each output validates against schemas,
retains both observation records with synthetic context and exact original input,
and shows all 26 rule IDs, review dates and source URLs. All manifest hashes match;
coverage stays partial. Source campaign, review and measurements were hash-checked
unchanged. This is installed CLI replay, not a new native model session.

[Installation/replay receipt](../../content-search-audit-output-installation-snapshot.json)
records package/archive identities and per-output hashes. `artifacts.tgz` retains
three exact report directories and the source campaign/review; evidence bundles
inside reports contain the supplied observations and source text. Archive validation
compares every extracted file byte for byte; historical absolute paths are retained.

The campaign action-type column/decision contract and broader native report-fidelity
and independent acceptance gates remain open. Earlier archives are unchanged; no
commercial release or deployment was performed.
