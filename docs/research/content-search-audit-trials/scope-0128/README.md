# Semantic scope trial — 0.1.28, interrupted

Fresh extracted installations received the same targets and prompts as coverage-0127.
A combined Codex/Claude installation was also verified. All installed package bytes
and input hashes remained unchanged.

Neither host completed a final report. Claude exited 1 with API connection failure
(`ENOTFOUND`), recording 7277.07 wall seconds while the provider result reports
92967 milliseconds. Codex remained live with a stream-disconnection retry after
26949 wall seconds. The orchestrator then enforced the existing 1200-second trial
wall deadline with SIGTERM; exit -15 was observed at 26958.85 wall seconds. The
cause of the wall/provider timing discrepancy is not established. No process was
restarted because output was delayed.

This is unavailable behavioral evidence, not a semantic pass or failure. No claim
that the scope correction works on either host follows from the partial artifacts.
The failed execution history remains intact. A later retry must be a separate,
explicitly identified trial after checking host availability.

`artifacts.tgz` contains 87 byte-compared files: logs, prompts, inputs, partial run
artifacts, installation locks and terminal/stop receipts. Package trees and extracted
release are excluded. `receipt.json` records the terminal state and limitations.
No commercial acceptance, publication or source changes occurred.
