import { textValue, timestampValue, stableJson } from "./enterprise-state.mjs";
const actions = [
  "read",
  "submit-test",
  "apply-patch",
  "publish",
  "deploy",
  "transact",
  "change-policy",
];
const mutations = new Set([
  "apply-patch",
  "publish",
  "deploy",
  "transact",
  "change-policy",
]);
const deny = (reason) => ({ allowed: false, reason });
/** The host supplies complete trustedAuthorizations from session state, never from imports. */
export function authorizeAction(envelope, action, context, now) {
  if (!envelope || !action || !context || !timestampValue(now))
    return deny("invalid-authorization-input");
  if (
    !textValue(envelope.authorizationRef) ||
    !Array.isArray(context.trustedAuthorizations)
  )
    return deny("untrusted-authorization-reference");
  const grants = context.trustedAuthorizations.filter(
    (grant) => grant?.authorizationRef === envelope.authorizationRef,
  );
  if (grants.length !== 1 || stableJson(grants[0]) !== stableJson(envelope))
    return deny("authorization-binding-mismatch");
  if (
    !timestampValue(envelope.grantedAt) ||
    (envelope.expiresAt !== null && !timestampValue(envelope.expiresAt))
  )
    return deny("invalid-authorization-validity");
  if (
    envelope.expiresAt === null &&
    (!textValue(envelope.sessionId) || envelope.sessionId !== context.sessionId)
  )
    return deny("missing-session-validity");
  if (
    Date.parse(now) < Date.parse(envelope.grantedAt) ||
    (envelope.expiresAt !== null &&
      Date.parse(now) >= Date.parse(envelope.expiresAt))
  )
    return deny("authorization-expired-or-not-started");
  if (envelope.revokedAt !== null) return deny("authorization-revoked");
  if (
    !textValue(envelope.customerId) ||
    !textValue(envelope.environment) ||
    envelope.customerId !== context.customerId ||
    envelope.environment !== context.environment
  )
    return deny("authorization-scope-mismatch");
  if (
    !Array.isArray(envelope.assetIds) ||
    envelope.assetIds.some((id) => !textValue(id) || id === "*") ||
    !envelope.assetIds.includes(context.assetId)
  )
    return deny("asset-not-authorized");
  if (
    !textValue(envelope.identityId) ||
    envelope.identityId !== context.identityId
  )
    return deny("identity-not-authorized");
  if (
    !Array.isArray(envelope.allowedActions) ||
    envelope.allowedActions.some((kind) => !actions.includes(kind)) ||
    !envelope.allowedActions.includes(action.kind)
  )
    return deny("action-not-authorized");
  if (
    !["audit", "plan", "remediate", "verify"].includes(context.operationMode) ||
    (mutations.has(action.kind) && context.operationMode !== "remediate")
  )
    return deny("operation-mode-prohibits-action");
  if (
    typeof action.realTransaction !== "boolean" ||
    typeof envelope.sideEffectConstraints?.allowRealTransactions !==
      "boolean" ||
    (action.realTransaction &&
      !envelope.sideEffectConstraints.allowRealTransactions)
  )
    return deny("side-effect-not-authorized");
  return {
    allowed: true,
    reason: "authorized",
    authorizationRef: envelope.authorizationRef,
  };
}
