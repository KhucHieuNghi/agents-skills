# Supplied raw and rendered snapshots

Snapshot R1: /instructions, capture 2026-11-16T01:00:00Z, raw HTML main text:
"To disable renewal, open Billing and select Disable renewal."
Snapshot R2: same URL, locale, build and time, authorized browser DOM after the
owner-specified ready signal. Complete main text:
"To disable renewal, open Billing."
The owner confirms this ready signal marks completed content rendering, not a
transient loading state. Approved task requires selecting Disable renewal after
opening Billing. Neither snapshot shows another equivalent instruction.

Separate page /dashboard has only an empty root div in the supplied raw HTML.
No scripts, rendered snapshot, owner task or readiness signal are supplied for it.
No engine rendering or index evidence is available for either page.
