import { readFile } from "node:fs/promises";
import {
  checkIdentity,
  validateEnterpriseRun,
  textValue,
} from "./enterprise-state.mjs";
import { createDataRequest, mergeDataRequests } from "./data-requests.mjs";
const registry = JSON.parse(
  await readFile(
    new URL("../../rules/enterprise.json", import.meta.url),
    "utf8",
  ),
);
const profileIds = [
  "lead-generation",
  "commerce",
  "booking",
  "subscription",
  "publishing",
];
const profiles = Object.fromEntries(
  await Promise.all(
    profileIds.map(async (id) => [
      id,
      JSON.parse(
        await readFile(
          new URL(`../../profiles/${id}.json`, import.meta.url),
          "utf8",
        ),
      ),
    ]),
  ),
);

export function resolveAuditContext(input, capabilities = []) {
  if (
    !input ||
    !Array.isArray(input.profileIds) ||
    new Set(input.profileIds).size !== input.profileIds.length ||
    input.profileIds.some((id) => !Object.hasOwn(profiles, id))
  )
    throw new Error("Invalid business profiles");
  if (!Array.isArray(capabilities)) throw new Error("Invalid capabilities");
  if (input.inventoryMode === "full" && input.inventoryComplete !== true)
    throw new Error("Full inventory needs explicit completeness assertion");
  if (
    !Array.isArray(input.entities) ||
    !input.entities.some((entity) => entity.type === "site")
  )
    throw new Error("A scoped site entity is required");
  const run = {
    schemaFamily: "enterprise-audit",
    schemaVersion: 1,
    customerId: input.customerId,
    runId: input.runId,
    operationMode: input.operationMode ?? "audit",
    inventoryMode: input.inventoryMode ?? "sample",
    assessmentAt: input.assessmentAt,
    profileVersions: Object.fromEntries(
      input.profileIds.map((id) => [id, profiles[id].version]),
    ),
    ruleVersions: {},
    policyVersions: input.policyVersions ?? {},
    entities: input.entities.map((entity) => ({
      customerId: input.customerId,
      runId: input.runId,
      ...globalThis.structuredClone(entity),
    })),
    moduleIds: registry.modules.map((module) => module.id),
    checks: [],
    evidence: globalThis.structuredClone(input.evidence ?? []),
    capabilities: globalThis.structuredClone(capabilities),
    businessOutcomes: [
      ...new Set(
        input.profileIds.flatMap((id) => profiles[id].businessOutcomes),
      ),
    ],
    dataRequests: [],
    planningStatus: "intake-only",
    registryVersion: registry.version,
  };
  for (const module of registry.modules) {
    for (const rule of module.rules) {
      run.ruleVersions[`${module.id}/${rule.id}`] = rule.version;
      for (const entity of run.entities.filter((entity) =>
        rule.entityTypes.includes(entity.type),
      )) {
        const identity = {
          moduleId: module.id,
          ruleId: rule.id,
          ruleVersion: rule.version,
          entityId: entity.entityId,
          scenarioId: null,
          windowId: input.windowId ?? null,
        };
        const check = {
          ...identity,
          checkId: checkIdentity(identity),
          status: "unknown",
          reason: "Intake only; collect evidence and assess this check",
          evidenceIds: [],
          dependencies: [],
          policyIds: [],
          assessedAt: null,
        };
        run.checks.push(check);
        for (const artifact of rule.requiredArtifacts) {
          const method = registry.artifacts[artifact];
          if (!method || !textValue(method.instructions))
            throw new Error("Invalid packaged artifact contract");
          run.dataRequests.push(
            createDataRequest({
              customerId: run.customerId,
              runId: run.runId,
              requestedArtifact: artifact,
              scopeKey: entity.entityId,
              windowId: identity.windowId,
              moduleIds: [module.id],
              affectedCheckIds: [check.checkId],
              reason: `${rule.question} Evidence is required before deciding.`,
              acceptedFormats: method.formats,
              leastPrivilegeAccess: method.access,
              exportInstructions: [
                method.instructions,
                ...(["business-observations", "business-context"].includes(
                  artifact,
                )
                  ? [
                      run.businessOutcomes.length
                        ? `For the selected business models, define and provide evidence for these outcomes: ${run.businessOutcomes.join(", ")}. Confirm which outcomes actually apply; profile labels are not business evidence.`
                        : "First identify the intended business outcomes; do not guess a business model.",
                    ]
                  : []),
              ].join(" "),
              suggestedOwnerRole: method.owner,
              fallback: method.fallback,
              priority: rule.priority,
            }),
          );
        }
      }
    }
  }
  // Context may be missing even when an industry's profile has been selected: business definitions are always evidence.
  run.dataRequests = mergeDataRequests(run.dataRequests);
  run.declaredScope = {
    moduleIds: [...run.moduleIds],
    checks: run.checks.map(({ checkId, moduleId, entityId }) => ({
      checkId,
      moduleId,
      entityId,
    })),
  };
  validateEnterpriseRun(run);
  return run;
}
