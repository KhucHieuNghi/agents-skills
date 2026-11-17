# First semantic seed trial: frozen 0.1.0 candidate

Four actual CLI runs completed successfully on 2026-11-16: baseline and installed
skill arms for Codex and Claude Code. Prompts, final responses, hashes, host flags,
tool calls and host-reported usage are retained here. Raw event logs stay in the
local temporary directory recorded in snapshot.json; they are not published because
host initialization can contain account/session metadata. Cost fields are host
reports, not independently reconciled billing. No model was pinned.

## Trial design and boundaries

Each arm received a fresh project with the same five synthetic target files.
Skill arms received the exact installed 0.1.0 component bytes. Gold stayed outside
those project directories. The main prompt was identical except for the explicit
skill invocation versus own-judgment instruction. This was a bounded editorial
review, not the full helper workflow or a technical website audit.

Codex used read-only sandbox, ephemeral execution and ignore-user-config. This
still exposed global skill discovery: stderr contained unrelated global skill
metadata warnings. Consequently this is not a hermetic no-skills experiment.
Claude used restricted mode with Read/Glob/Grep/Skill, no MCP configuration,
no persistence and dontAsk; the baseline additionally disabled slash commands.
Tools differ between hosts. No observed tool call read gold, wrote project files
or fetched the network. This observation does not establish OS-level gold isolation.

Codex read the installed entrypoint, required contracts and relevant internal
methods. Claude read the installed entrypoint and report contract, but did not
read the required rule/workflow/scope/evidence contracts or internal methods.
Neither trace demonstrates a dedicated Skill-tool invocation: filesystem reads
prove installed content use, not a complete native skill-discovery acceptance test.

## Manual adjudication

The primary coding agent compared all four final responses with every target and
the withheld annotations. This is not independent human acceptance review.

| Arm             | Gold material issues found | Clean control | Material response defects                                                                      |
| --------------- | -------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| Codex baseline  | 5 of 5                     | Accepted      | None identified in this small sample                                                           |
| Codex skill     | 5 of 5                     | Accepted      | None identified in this small sample                                                           |
| Claude baseline | 5 of 5                     | Accepted      | Incorrect elapsed months; redundant clean-control advice; inaccurate wording-equivalence claim |
| Claude skill    | 5 of 5                     | Accepted      | Incorrect elapsed months; cross-file evidence quoted as the clean control's study              |

Gold issue units are denominator confusion, data freshness, causal overreach,
price/storage contradiction, and unsupported worldwide scope. Split findings were
matched to these units once; counting eight Claude headings as eight gold findings
would inflate the denominator. Four problematic files and one clean file were
accounted for in every arm. No absent live ranking, citation or analytics metric
was represented as measured. These observations are not a general precision/recall
estimate, proof of zero fabrication or demonstrated skill uplift: baseline also
found every gold issue, and response-level errors remain.

### Defect evidence

- Both Claude outputs say the February 2024 collection is "about 21 months" before
  November 2026. The calendar-month difference is 33. Exact collection dates in
  their proposed corrections are preserved, but the supporting explanation is
  factually wrong. Require deterministic date arithmetic or retain exact dates
  without an unnecessary elapsed-age estimate.
- Claude skill's clean-control section attributes "Responses citing at least one
  top-ten result: 80" and counts to that file's study. That exact study extract is
  in denominator.md; clean-control.md instead says the draft's period, surface and
  counts match. The conclusion is correct, but the quotation location is false.
  Require checking each quoted span against its specific file before reporting.
- Claude baseline suggests explicitly adding "synthetic API" to the clean control,
  which already starts "In a synthetic API panel". It also says its rewritten
  denominator paragraph is the same wording as the control, although it adds
  "organic" and changes wording. Avoid issuing fixes for already-present text and
  verify claimed equivalence instead of assuming it.
- Codex skill additionally notices that the study extract does not specify
  "organic". This is supported by the supplied text, not automatically a false
  positive simply because the seed annotation omitted it.

## Next action

Preserve this frozen baseline. Add focused quotation/date/clean-control regression
cases and strengthen the review contract in a new candidate version; rerun affected
host trials. Expand the labeled set and run actual full offline/public/missing-data/
resume workflows before commercial release. Helpers, transport tests and these
five seed cases do not replace those gates.
