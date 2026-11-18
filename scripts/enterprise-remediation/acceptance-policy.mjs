import {
  enterpriseDigest,
  timestampValue,
  textValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const id = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(x);
const hash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
function exact(x, keys) {
  if (
    !x ||
    typeof x !== "object" ||
    Array.isArray(x) ||
    Object.keys(x).sort().join(",") !== keys.sort().join(",")
  )
    throw new Error("Invalid acceptance fields");
}
/** A host-reviewed acceptance contract is not a mutation grant or proof of successful retest. */
export function bindAcceptancePolicy(policy, binding) {
  exact(binding, [
    "customerId",
    "checkId",
    "contextDigest",
    "assetBindingDigest",
    "assessmentAt",
    "authorId",
    "earliestReviewAt",
    "baselineWindowId",
    "baselineScenarioId",
  ]);
  exact(policy, [
    "policyRef",
    "customerId",
    "checkId",
    "contextDigest",
    "assetBindingDigest",
    "authorId",
    "reviewerId",
    "reviewerType",
    "reviewReason",
    "reviewedAt",
    "expectedStatus",
    "minimumCompleteness",
    "window",
    ...(Object.hasOwn(policy, "scenarioMapping") ? ["scenarioMapping"] : []),
  ]);
  if (
    binding.baselineScenarioId !== null &&
    !textValue(binding.baselineScenarioId)
  )
    throw new Error("Invalid baseline scenario");
  if (Object.hasOwn(policy, "scenarioMapping")) {
    const mapping = policy.scenarioMapping;
    exact(mapping, ["baselineScenarioId", "retestScenarioId", "reason"]);
    if (
      mapping.baselineScenarioId !== binding.baselineScenarioId ||
      (mapping.retestScenarioId !== null &&
        !textValue(mapping.retestScenarioId)) ||
      typeof mapping.reason !== "string" ||
      !mapping.reason.trim() ||
      mapping.reason.length > 2048
    )
      throw new Error("Invalid reviewed scenario mapping");
  }
  if (
    !id(policy.policyRef) ||
    !id(policy.reviewerId) ||
    !id(policy.authorId) ||
    policy.authorId === policy.reviewerId ||
    !["human", "independent-ai"].includes(policy.reviewerType) ||
    typeof policy.reviewReason !== "string" ||
    !policy.reviewReason.trim() ||
    policy.reviewReason.length > 2048 ||
    !timestampValue(binding.earliestReviewAt) ||
    Date.parse(policy.reviewedAt) < Date.parse(binding.earliestReviewAt) ||
    policy.reviewerId === binding.authorId ||
    !timestampValue(policy.reviewedAt) ||
    !timestampValue(binding.assessmentAt) ||
    Date.parse(policy.reviewedAt) > Date.parse(binding.assessmentAt) ||
    policy.expectedStatus !== "pass" ||
    policy.minimumCompleteness !== 1
  )
    throw new Error("Invalid acceptance review or predicate");
  for (const key of [
    "customerId",
    "checkId",
    "contextDigest",
    "assetBindingDigest",
  ])
    if (policy[key] !== binding[key])
      throw new Error("Acceptance binding mismatch");
  if (
    !hash(policy.contextDigest) ||
    !hash(policy.assetBindingDigest) ||
    typeof policy.customerId !== "string" ||
    !policy.customerId.trim() ||
    !id(policy.checkId) ||
    !id(binding.authorId)
  )
    throw new Error("Invalid acceptance identity");
  const w = policy.window;
  exact(w, [
    "kind",
    "baselineWindowId",
    "retestWindowId",
    "start",
    "end",
    "timezone",
    "filtersDigest",
    "ingestionLagSeconds",
  ]);
  if (
    !["point", "period"].includes(w.kind) ||
    w.baselineWindowId !== binding.baselineWindowId ||
    !timestampValue(w.start) ||
    !timestampValue(w.end) ||
    Date.parse(w.start) < Date.parse(binding.assessmentAt) ||
    Date.parse(w.end) <= Date.parse(w.start) ||
    !hash(w.filtersDigest) ||
    !Number.isSafeInteger(w.ingestionLagSeconds) ||
    w.ingestionLagSeconds < 0 ||
    w.ingestionLagSeconds > 31622400
  )
    throw new Error("Invalid acceptance window");
  if (
    w.kind === "point" &&
    (w.baselineWindowId !== null ||
      w.retestWindowId !== null ||
      w.timezone !== "UTC")
  )
    throw new Error(
      "Point observation requires unwindowed baseline and UTC bounds",
    );
  if (
    w.kind === "period" &&
    (!id(w.baselineWindowId) ||
      !id(w.retestWindowId) ||
      w.baselineWindowId === w.retestWindowId)
  )
    throw new Error("Period retest requires distinct explicit window");
  if (typeof w.timezone !== "string" || w.timezone.length > 128)
    throw new Error("Invalid acceptance timezone");
  try {
    new Intl.DateTimeFormat("en", { timeZone: w.timezone });
  } catch {
    throw new Error("Invalid acceptance timezone");
  }
  return {
    policy: globalThis.structuredClone(policy),
    policyDigest: enterpriseDigest(policy),
    executionAllowed: false,
  };
}
