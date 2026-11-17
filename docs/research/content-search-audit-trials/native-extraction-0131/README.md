# Native extraction regression — candidate 0.1.31

Fresh Codex and Claude Code installations ran the same three controlled fixtures
and host-specific prompts retained from 0.1.25. Only config root paths change;
target bytes and prompts are unchanged. The harness allows 900 rather than 600
seconds. Both hosts finished without continuation. No package bytes changed.

| Host        | Execution                                     | Extraction and coverage                                                                                                              | Remaining limitations                                                                                                                      |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Codex       | Exit 0; 254.09 seconds                        | Native PDF text plus page rasters; manual image transcription after OCR failure; 3 pending, 0 audited; 13 pass / 2 fail / 63 unknown | Chrome aborted before DOM capture. Narrative verification incorrectly compares dataset readiness with boolean true instead of string true. |
| Claude Code | Exit 0; 493.60 seconds; reported USD 4.559804 | Ready DOM captured; native two-page PDF text; 2 pending / 1 unsupported / 0 audited; 5 pass / 2 fail / 1 N/A / 70 unknown            | OCR was not attempted. Context applicability and request for renewed OCR approval require review.                                          |

Both preserve the bilingual export policy as clean. Codex distinguishes a
source-level task overwrite from unverified rendered behavior; Claude captures
the finished DOM and demonstrates the missing task step. Codex adds an image
text-alternative finding; this is not a predeclared gold unit or an accuracy score.
The primary assistant visually checked all three Codex-generated page rasters.
Claude's capture log records string readiness, the shortened main text, unchanged
source and profile cleanup; it is host-captured evidence, not network attestation.

## Independent mechanical verification

- All 182 original package, installation-lock, config and target files unchanged.
- All nine persisted run directories validate as partial: three Codex, three
  current Claude and three superseded Claude attempts. Superseded artifacts remain.
- Three Codex and eight Claude submitted quote spans replay successfully. This
  does not certify all prose or semantic conclusions.
- The archive contains 292 byte-verified regular files: inputs, raw streams,
  scripts, reports, validation receipts, superseded attempts and adjudication.
  Installed packages/locks, release staging and Swift compiler cache are excluded;
  original file hashes and the frozen candidate archive remain available.

Archive SHA-256: `7966178f49c97e892ad6e066611ee1e78257814719ae3d963af1adceb3630285`.
See [verification](independent-validation.json), [adjudication](adjudication.json),
[archive manifest](archive-validation.json), and the original narratives:
[Codex](codex.narrative.txt), [Claude Code](claude-code.narrative.txt).

## Open review

The primary assistant read both narratives/final replies and selected generated
bodies. Complete manual review of all 19 Codex commands, 24 Claude tool inputs and
remaining generated executable bodies is outstanding. No full instruction-boundary
acceptance is claimed. Independent human acceptance remains separate; this trial
is outside the previously frozen six-report packet, which is unchanged.

This closes the absence of current-version extraction execution evidence, not
current-version semantic/behavioral acceptance. No commercial release or deployment.

## Recorded trace review completed — supplement v2

[Trace review v2](trace-review-v2.json) supersedes the pending manual-trace status
above without changing the original adjudication or 292-file raw archive. All 19
Codex commands, 24 Claude tool inputs and ten generated executable bodies were
read; all recorded tool calls have terminal results. Archive members rehash cleanly.
No credential access, external URL fetch, extra skill, installation, target change,
publication, sandbox-disabling flag or target-script VM fallback was observed in
that scope. Claude uses loopback CDP with the authorized local fixture. This is
recorded-tool review, not process-level network or sandbox attestation.

Codex call 4 redirects all method bodies to `/dev/null`; remaining command output
contains contracts/index/registry but no method bodies. This does not demonstrate
the required internal-method loading step and is a workflow defect distinct from
the readiness-comparison error. Its JSON event stream also does not independently
establish model image-inspection events; the primary assistant's later visual
comparison is separate evidence. Claude's 15 Bash calls all have a leading RTK
wrapper in this trial. AEO applicability and optional OCR guidance remain judgment
questions. Independent acceptance and product release remain open.
