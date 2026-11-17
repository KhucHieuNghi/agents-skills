## Report assembly contract

Each finding has four parts, in this order:

- **Observed:** the affected artifact and defect, with its source and capture scope.
- **Interpretation:** the bounded conclusion supported by that observation.
  Downstream effects use conditional risk wording. If a causal explanation is
  needed but untraced, label it a hypothesis and state how it would be tested.
- **Correction:** replacement text or a repair preserving the authoritative
  record's material qualifiers. Each factual clause has a supplied or verified
  basis. When feature eligibility is unknown, replacement wording lists the
  properties actually checked and states that eligibility and appearance remain
  unverified. Feature-specific requirements belong to a later verification step
  until the target feature and its current requirements have been established.
- **Verification:** an observable result that demonstrates the correction; later
  engine outcomes are a separate check.

Assemble the summary from the completed findings and coverage records:

- **Findings:** list the final finding IDs and affected artifacts.
- **Clean checks:** list the specific checks supported as clean.
- **Unknown checks:** list unresolved checks and the evidence needed.

Copy aggregate counts only from verified helper output or deterministic tool
results. When those are unavailable, enumerate the IDs/items without a numeric
aggregate. Preserve supplied source counts exactly. A valid page/markup and an
unsupported draft claim about it have separate statuses; name the artifact being
corrected in both summary and detail.
