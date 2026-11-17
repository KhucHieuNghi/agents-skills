# Worked review: evidence to final receipt

Use [the executable example](../scripts/examples/worked-review.mjs) to see a complete
review bundle and quotation ledger. Read it when translating an assessment into
persisted artifacts. Running it is optional and creates only a synthetic demonstration:

```sh
node /absolute/installed-skill/scripts/examples/worked-review.mjs \
  /absolute/installed-skill /absolute/new-demo-directory
```

Node 22+ is required, with no download or extra dependency. The output directory
must not exist. Keep it outside target roots and the installed package. The script
creates its own refund-policy fixture; it does not audit supplied customer content.
Do not include the example in the customer's inventory or run it against their files.

The example connects six steps:

1. Run `start`, then read the actual inventory item and collected content evidence.
2. Add an attributed `claim-sources` record, its artifact, SHA-256 and link to the
   original snapshot. Source context stays explicitly synthetic and owner supplied.
3. Submit a `quality-claims` verdict together with the supporting finding. The
   evidence, scope, severity, confidence and proposed correction are authored
   judgments for this fixture, not values to copy into unrelated assessments.
4. Write `review.json` and apply `review` to a new run directory. A failed check
   without a supported finding is rejected. Keep unrelated checks unresolved.
5. Validate the new revision. Structural validity can coexist with partial coverage;
   this example remains pending. Original source and prior checks stay unchanged.
6. Build a ledger against final report bytes and exact source lines, then run
   `verify-quotes`. A passing receipt verifies submitted quotations, not the logic
   of the finding or every possible quotation in a different report.

For the actual audit, load its applicable methods and rule evidence requirements,
use its collected IDs, register its sources with honest limitations, and submit
all supported findings. Inspect the final validated coverage for the report and
reply. Missing analytics leaves affected checks unknown; it does not prevent
persisting a supported content finding. If an attempted helper fails, preserve
its error and diagnose the concrete bundle problem rather than inventing a receipt.

Do not use the demonstration's fixed IDs, policy, verdict or finding as customer
results. The example is one internal resource of this skill; no other skill is
required or invoked.
