# 0.1.38 absolute-helper evaluation

Status: evaluation candidate; no commercial acceptance or production deployment.

The 0.1.37 material-classification improvement is retained. Its Claude trace still
contains unwrapped directory changes and pipeline stages, followed by an inaccurate
blanket compliance claim. See the retained 0.1.37 TRACE-REVIEW.md.

## Change and hypothesis

The entrypoint and helper guide now recommend host file-reading tools where
available and absolute installed helper paths from the customer project. Helper
command examples no longer require changing into the package directory. The guide
also corrects its stale count of four report files to five base files, matching
the existing delivery-summary implementation. No runtime code or rule changed.

This addresses concrete command forms observed in the trace. It is not a claim
that prompting can enforce a shell policy. Existing per-executable conventions,
semantic thresholds, gold fixtures and independent-human gates remain unchanged.

## Frozen package and verification

- Component: `8410ebd40cea5cd2c6eac6ee043bc272a413b94a388ccc5e79f6b9c0e4da1c47`.
- Release: `19b170425b26cfc5a8749c76945a2305dcd3f62db4ee57a9c4c2d3d896b0bd30`.
- Archive: `5d0184f6a4c72498528cb85ec1573dd855755e22fd904289443b2b713f2d780f`.

Format, lint, typecheck, all 474 tests, build and diff checks passed. The
skill-creator validator passed in the existing isolated PyYAML environment.
Fresh archive installation succeeded for both hosts. From each fresh project
working directory, absolute-path `methods`, `start` and `validate` invocations
succeeded without directory changes. This checks the documented invocation, not
host compliance. Receipts are in `build/release-hardening-0138/`.

The same Expanded prompts and target bytes are running in fresh host projects;
no gold, suspected defect or prior conclusions are supplied. Results remain
pending. Earlier artifacts are retained unchanged. No 0.1.37 success is transferred
to this changed package, and no additional matrix is claimed complete.

## Codex completed; remaining Claude execution

Codex completed in 214.905 seconds with unchanged original inputs. Trusted replay
validates three partial revisions: 12 declared, zero audited, ten pending and two
blocked items. All 15 source quotes verify. The complete narrative and final reply
were read; primary material-unit adjudication records six supported units and
six recalled gold units, consolidated into five findings. Reporting and instruction
reviews remain incomplete; thresholdsMet and releaseAccepted remain false.

The 200-file `codex.raw.tgz` retains hidden `.audit-evidence/` output as well as
installation, input, event and execution records. Every member hash was verified
against `codex-archive.json`. A limited scan found no selected private-key-header
or GitHub/OpenAI/Anthropic token-pattern matches; this is not a comprehensive
secrecy guarantee. Exact narrative and response are in `review-inputs/`.

### Replay discovery correction

The earlier local replay runner skipped every directory whose name began with a
dot. Codex legitimately used `.audit-evidence/`, so that discovery policy would
omit its actual runs. Before replay, discovery was narrowed to skip only `.agents`,
`.claude`, `.agent-skills` and `.git`. It found all three runs and the quote ledger.
The validator, package digests and acceptance criteria were unchanged. The exact
runner is retained as `replay-script.txt`; it was executed from the repository
using the same relative imports as `build/release-hardening-0138/replay.mjs`.

Claude is still running. Its observed early Bash commands already include
unwrapped directory changes, mkdir and pipeline stages, so no clean compliance
result can be inferred from the example revision. Preserve the complete terminal
trace before final assessment. Another wording-only revision is not justified
by merely repeating the same failure.
