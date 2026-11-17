# First artifact-producing offline host trial

Candidate 0.1.2 was installed from its verified extracted archive into two fresh
projects. Each received exactly four original synthetic files: English pricing
claims with a supplied policy, a Vietnamese how-to clean control, a JavaScript
shell and an unavailable PDF. No analytics, HTTP capture, rendered DOM or PDF
extraction was supplied. Gold is retained separately in
`tests/fixtures/content-audit/host-offline/gold/annotations.json` and was not copied
into either host project.

## Execution and configuration

Codex used workspace-write sandbox and its configured default model. Claude used
normal project-settings mode, explicit Skill/Read/Glob/Grep/Bash/Write tools and
no MCP servers. No model was pinned. Source edits, external network access and
out-of-project inspection were prohibited by the prompt; this is not a claim of
OS-enforced isolation for every tool.

The first Claude attempt stopped on a denied Bash command: the host used a cd
wrapper instead of the exact allowlisted helper invocation. A second fresh session
with the canonical absolute command stopped on a denied Write call; its directory
permission pattern did not match as intended. Both terminal failures are retained.
Neither produced artifacts or is counted as successful workflow execution. A third
fresh session explicitly allowed Bash and Write for this isolated synthetic task,
then completed the workflow. No global settings or skill bytes were changed.
The successful hosts therefore had different tool/permission configurations;
this is a compatibility exercise, not a controlled comparative model ranking.

## Independently checked artifacts

Both successful processes invoked packaged start/review/validate and produced
actual inventory, raw snapshots, checks, findings, reports and separate recovery
notes. After termination, the primary agent invoked validate again and compared
all four source hashes with their pre-run values. Both inputs remained unchanged.
The snapshot records the independent results and hashes of all retained audit
files, including intermediate runs and review bundles. Raw audit bytes are excluded
from formatting/lint rewriting because they are recorded model outputs, not product
implementation. Original paths remain in records for provenance.

| Result                                 | Codex          | Claude Code, successful third session |
| -------------------------------------- | -------------- | ------------------------------------- |
| Inventory items                        | 4              | 4                                     |
| Planned checks                         | 104            | 104                                   |
| Pass / fail / not applicable / unknown | 3 / 5 / 4 / 92 | 1 / 2 / 0 / 101                       |
| Fully audited / pending / unsupported  | 0 / 3 / 1      | 0 / 3 / 1                             |
| Structural validation                  | valid          | valid                                 |
| Completion allowed                     | false          | false                                 |
| Findings persisted                     | 2              | 2                                     |
| Markdown / HTML / action CSV           | present        | present                               |
| Source hashes unchanged                | yes            | yes                                   |

Four items are enumerated, but the coverage field `accounted` is 1 because only the
unsupported item has reached a terminal state. Do not translate inventory presence
into four fully audited items. Both final answers accurately report partial status
and the unsupported PDF. Missing metrics are not replaced with zero. No network
operation appears in the reviewed tool trace. This does not prove complete semantic
coverage: many local checks also remain unknown, and the six-dimension acceptance
contract is not satisfied by inventory presence or structural validation.

## Manual semantic adjudication and defects

- Both persisted the supported pricing contradiction, including US-only scope,
  $29 before taxes, 100 GB and the effective date. The duplicate dimension tags in
  Codex are consolidated into one pricing finding. Neither made a material finding
  against the Vietnamese how-to control or invented PDF content.
- Codex's second finding is scoped to the empty initial body mount and requests a
  rendered capture before any conditional implementation. That is a supported
  evidence-gap observation; it does not prove a live indexing failure.
- Claude's second finding fails seo-metadata and says the source has no descriptive
  metadata. The file has a title, and no audience/task evidence establishes that
  the synthetic title is inadequate. Empty raw body and absent meta description
  are observable, but they do not establish the broad failure or remediation by
  themselves. Treat this as an overreaching finding, not a verified material SEO
  defect. Its final answer also says the script fills the root; the script was not
  supplied or executed, so that behavior is unknown.
- Claude's review script hardcodes derived evidence/review time to
  `2026-11-16T00:00:00.000Z`. Actual collector records are around
  `2026-11-15T22:13:45Z`; the independent clock check at the end was
  `2026-11-15 22:15:35 UTC`. The precise review timestamp was invented and was still
  in the future at verification. Structural date parsing did not catch this semantic
  provenance error. Future guidance/checks must require actual observation time or
  clearly separate supplied historical timestamps from host review time.
- No zero-fabrication or general precision/recall claim is made. The above judgments
  are by the primary coding agent, not independent human acceptance. Permission
  retries and remaining semantic defects remain visible rather than being erased
  by the final successful process exit codes.

## Acceptance status

This establishes that both installed packages can produce and validate partial
offline audit artifacts under workable host configurations. It does not establish
full content audit completion, public-site collection, 1200-item host recovery,
rendered extraction, all labeled semantic classes or commercial release readiness.
Next work should address provenance and unsupported rule decisions while adding
the missing schemas and broader workflow coverage.
