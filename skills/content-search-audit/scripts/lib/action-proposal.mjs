/** Normalize a proposal, never an authorization to modify customer content. */
export function resolveActionProposal(finding, { global = false } = {}) {
  if (
    finding.actionCondition !== undefined &&
    (typeof finding.actionCondition !== "string" ||
      !finding.actionCondition.trim())
  )
    throw new Error("Invalid finding action condition; nonempty text required");
  if (finding.action === undefined && finding.actionReason === undefined)
    return {
      action:
        !global && finding.classification === "observed"
          ? "update"
          : "investigate",
      origin: "default-triage",
      reason:
        "No explicit action decision supplied; review the finding before implementation.",
    };
  if (
    !["keep", "update", "consolidate", "investigate"].includes(
      finding.action,
    ) ||
    typeof finding.actionReason !== "string" ||
    !finding.actionReason.trim()
  )
    throw new Error(
      "Invalid finding action proposal; supported action and nonempty actionReason required",
    );
  return {
    action: finding.action,
    origin: "reviewer-proposal",
    reason: finding.actionReason,
  };
}

/** A declared prerequisite scopes both the action and its verification. */
export function conditionalActionText(finding, field) {
  resolveActionProposal(finding);
  const value = finding[field];
  return finding.actionCondition === undefined
    ? value
    : `Only if ${finding.actionCondition}: ${value}`;
}
