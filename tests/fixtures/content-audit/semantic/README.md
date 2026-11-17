# Semantic evaluation seed set

Five original synthetic cases exercise review boundaries surfaced during upstream
comparison: response versus citation denominators, data age versus publication
age, unsupported causal diagnosis, source support and a clean scoped control.
They are not real market data, provider captures or customer audits.

Give a host only the selected targets/ file. Keep gold/ annotations outside the
host's accessible input scope. Independent adjudication compares the returned
findings with materialFindings and acceptanceConstraints. Count false positives
on the clean control as well as missed material findings. Save host/version,
package digest, prompt, tool availability, output and adjudication decisions.

This is a seed set, not the complete acceptance benchmark. No Codex/Claude Code
semantic trial has been executed for these cases and no precision/recall result
is claimed. Expand with technical, multilingual, collection, scope/resume and
adversarial cases before evaluating the release targets.

The scenarios were authored for this repository. Their failure-mode selection
was informed by the source comparisons recorded in
`docs/research/content-search-audit-upstreams.md`; no upstream fixture text or
research dataset was copied.
