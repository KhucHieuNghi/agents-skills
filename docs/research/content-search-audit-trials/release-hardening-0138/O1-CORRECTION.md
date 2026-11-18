# O-1 correction after independent review

The user confirmed O-1 as a reporting error on 2026-11-18. The exact verdict
and original report digest are recorded in [the supplemental receipt](claude-code.human-review.o1.json).
The frozen report and review packet remain unchanged.

## Report correction

In section 1, replace this sentence:

> No rankings, citations, mentions or index states are asserted anywhere in this report.

with:

> The supplied historical study reports that 40 of 100 responses in a synthetic English API panel collected 2024-02-01 through 2024-02-14 cited video sources. This does not establish current brand citation performance. Current rankings, brand mentions and index states remain unknown.

This correction is authored after review; it is not native host output, a new
trial, or proof that the skill prevents recurrence. The original O-1 failure
continues to count against the original trial. Historical evidence, dates and
synthetic labels remain intact; no current measurement is inferred.

## Remaining technical work

The deterministic delivery summary already distinguishes historical studies from
current performance (`scripts/lib/delivery-summary.mjs` in the package). The
contradiction was introduced by supplemental host prose. A further reminder or
a keyword check on this one sentence would not establish semantic consistency.
Before promoting a changed package, evaluate summary consistency against both
historical evidence and current observations, including mixed and absent inputs.

Claude also violated the project command convention. That failure is separate
from O-1 and remains open. A shell prefix allowlist does not enforce all compound
commands; see the frozen [execution investigation](EXECUTION-BOUNDARY.md).
No execution guard or changed permission contract is introduced by this erratum.

The remaining human case verdicts, complete trace review and final-package
scenario matrix are still required. Neither this erratum nor the user's O-1
verdict accepts the release.

## Additional execution evidence inspected after O-1

The retained Bash input `toolu_01QRdJi7YqnGEpad8aRrKVQF` reads the generated
`delivery-summary.md`, lists evidence and pipes findings through `head` using
unwrapped `cat`, `ls` and `head`. This independently extends the existing X-1
examples; the prefix instruction is not consistently followed even when reading
helper output. The command also shows that the correct generated summary was
requested before the erroneous narrative was written. Presence of a correct
summary file alone therefore does not prevent O-1.

`toolu_01SKinkNz8c6bxxQuPCyGESe` writes a quote-ledger helper with unwrapped
`cat`, then runs wrapped Node quote verification, followed by unwrapped `echo`,
`ls` and `head`. A quote verifier checks quotations against source bytes; it
does not check a contradictory unquoted summary sentence. These are observed
command inputs from `claude-code.raw.tgz:claude-code.events.jsonl`. This scoped
inspection does not mark the full execution or reporting review complete.
