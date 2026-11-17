/** Normalize a proposal, never an authorization to modify customer content. */
export function resolveActionProposal(finding, { global = false } = {}) {
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
