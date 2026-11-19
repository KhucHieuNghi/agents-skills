import { Buffer } from "node:buffer";
import { boundedJson, evaluateMeasurementConfiguration } from "./config.mjs";
import { enterpriseDigest, timestampValue } from "../enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const name = (v) => typeof v === "string" && v.length > 0 && v.length <= 256;
const id = (v) => typeof v === "string" && /^\d{1,32}$/.test(v);
function shape(value, keys, label) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${label}`,
  );
}
function validateInventory(inventory, context) {
  if (inventory === null) return;
  shape(
    inventory,
    [
      "schemaVersion",
      "customerId",
      "entityId",
      "resource",
      "versionId",
      "observedAt",
      "validUntil",
      "complete",
      "ids",
    ],
    "builtin trigger inventory",
  );
  assert(
    inventory.schemaVersion === 1 &&
      inventory.customerId === context.run.customerId &&
      inventory.entityId === context.entityId &&
      inventory.resource === context.resource &&
      inventory.versionId === context.versionId,
    "Foreign builtin trigger inventory scope",
  );
  assert(
    timestampValue(inventory.observedAt) &&
      timestampValue(inventory.validUntil) &&
      Date.parse(inventory.observedAt) <=
        Date.parse(context.run.assessmentAt) &&
      Date.parse(inventory.observedAt) < Date.parse(inventory.validUntil),
    "Invalid inventory validity",
  );
  assert(
    typeof inventory.complete === "boolean" &&
      Array.isArray(inventory.ids) &&
      inventory.ids.length <= 100 &&
      inventory.ids.every(id) &&
      new Set(inventory.ids).size === inventory.ids.length,
    "Invalid builtin trigger inventory IDs",
  );
}
const triggerParameterFields = [
  "waitForTags",
  "checkValidation",
  "waitForTagsTimeout",
  "uniqueTriggerId",
  "eventName",
  "interval",
  "limit",
  "selector",
  "intervalSeconds",
  "maxTimerLengthSeconds",
  "verticalScrollPercentageList",
  "horizontalScrollPercentageList",
  "visibilitySelector",
  "visiblePercentageMin",
  "visiblePercentageMax",
  "continuousTimeMinMilliseconds",
  "totalTimeMinMilliseconds",
];

/** Static references only; never runs tag code, templates, conditions or provider calls. */
export function evaluateGtmDependencies(args) {
  boundedJson(args);
  shape(
    args,
    ["input", "context", "builtinTriggerInventory"],
    "dependency assessment",
  );
  const { input, context, builtinTriggerInventory: inventory } = args;
  assert(
    name(context?.resource) &&
      id(context?.versionId) &&
      name(context?.entityId) &&
      name(context?.run?.customerId) &&
      name(context?.run?.runId) &&
      name(context?.windowId),
    "Expected bounded dependency scope",
  );
  const base = evaluateMeasurementConfiguration({
    kind: "gtm-version",
    input,
    context,
    contract: null,
  });
  validateInventory(inventory, context);
  const version = input.payload.version,
    receipts = input.payload.collections ?? {};
  const collections = ["tag", "trigger", "variable", "builtInVariable"];
  const current = !base.providerGaps.some((g) =>
    ["stale-snapshot", "deleted-configuration"].includes(g.code),
  );
  const inventoryCurrent =
    inventory !== null &&
    Date.parse(inventory.validUntil) > Date.parse(context.run.assessmentAt);
  const checks = [],
    graph = new Map();
  let outputBytes = 0;
  function budget(value) {
    outputBytes += Buffer.byteLength(JSON.stringify(value));
    assert(outputBytes <= 8 * 1024 * 1024, "Dependency output budget exceeded");
    return value;
  }
  function emit(ruleId, owner, path, detail) {
    assert(checks.length < 5000, "Dependency check budget exceeded");
    checks.push(
      budget({
        checkId: enterpriseDigest([
          context.run.customerId,
          context.entityId,
          context.resource,
          context.versionId,
          owner,
          path,
          ruleId,
        ]),
        ruleId,
        ruleVersion: "1",
        owner,
        path,
        ...detail,
        ...(!current
          ? { status: "unknown", reason: "ineligible-snapshot" }
          : {}),
      }),
    );
  }
  const complete = (key) =>
    Array.isArray(version[key]) && receipts[key]?.complete === true;
  for (const key of collections) {
    if (version[key] !== undefined)
      assert(Array.isArray(version[key]), "Invalid dependency collection");
    if (key !== "builtInVariable")
      for (const entry of version[key] ?? [])
        assert(
          id(entry[`${key}Id`]),
          "Expected bounded dependency component ID",
        );
    const receipt = receipts[key];
    if (receipt !== undefined)
      assert(
        receipt &&
          typeof receipt === "object" &&
          !Array.isArray(receipt) &&
          typeof receipt.complete === "boolean" &&
          (receipt.nextPageToken === undefined ||
            typeof receipt.nextPageToken === "string") &&
          !(receipt.complete && receipt.nextPageToken),
        "Invalid dependency completeness",
      );
    emit("gtm-dependency-inventory", "container", key, {
      status: complete(key) ? "pass" : "unknown",
      reason: complete(key)
        ? "supplied-collection-complete"
        : "incomplete-source-collection",
    });
  }
  const [, , , containerId] = context.resource.split("/"),
    accountId = context.resource.split("/")[1];
  for (const variable of version.builtInVariable ?? []) {
    assert(
      variable &&
        typeof variable === "object" &&
        !Array.isArray(variable) &&
        name(variable.name),
      "Invalid builtin variable",
    );
    assert(
      (variable.accountId === undefined || variable.accountId === accountId) &&
        (variable.containerId === undefined ||
          variable.containerId === containerId),
      "Foreign builtin variable scope",
    );
    if (variable.path !== undefined)
      assert(
        typeof variable.path === "string" &&
          variable.path.startsWith(`${context.resource}/`) &&
          /^accounts\/\d+\/containers\/\d+\/(?:workspaces\/\d+\/)?built_in_variables\/[^/]+$/.test(
            variable.path,
          ),
        "Foreign builtin variable path",
      );
  }
  const tags = version.tag ?? [],
    variables = version.variable ?? [],
    builtins = version.builtInVariable ?? [],
    triggers = version.trigger ?? [];
  function named(targetKind, target) {
    const entries = targetKind === "tag" ? tags : [...variables, ...builtins];
    const matches = entries.filter((e) => e.name === target);
    if (matches.length > 1)
      return { status: "unknown", reason: "ambiguous-reference" };
    const exhaustive =
      targetKind === "tag"
        ? complete("tag")
        : complete("variable") && complete("builtInVariable");
    if (!exhaustive || entries.some((e) => !name(e.name)))
      return { status: "unknown", reason: "incomplete-name-inventory" };
    if (!matches.length) return { status: "fail", reason: "missing-reference" };
    const entry = matches[0];
    return {
      status: "pass",
      reason: "reference-resolved",
      resolvedTo:
        targetKind === "tag"
          ? `tag:${entry.tagId}`
          : variables.includes(entry)
            ? `variable:${entry.variableId}`
            : `builtin-variable:${enterpriseDigest(entry.name)}`,
    };
  }
  function trigger(target) {
    const found = triggers.find((t) => t.triggerId === target);
    const builtin = inventoryCurrent && inventory.ids.includes(target);
    if (found && builtin)
      return { status: "unknown", reason: "ambiguous-reference" };
    if (found)
      return {
        status: "pass",
        reason: "reference-resolved",
        resolvedTo: `trigger:${target}`,
      };
    if (builtin)
      return {
        status: "pass",
        reason: "supplied-builtin-reference",
        resolvedTo: `builtin-trigger:${target}`,
      };
    return complete("trigger") && inventoryCurrent && inventory.complete
      ? { status: "fail", reason: "missing-reference" }
      : { status: "unknown", reason: "incomplete-trigger-inventory" };
  }
  function reference(owner, path, targetKind, target) {
    assert(
      targetKind === "trigger" ? id(target) : name(target),
      "Invalid dependency reference",
    );
    const result =
      targetKind === "trigger" ? trigger(target) : named(targetKind, target);
    emit("gtm-reference-resolution", owner, path, {
      targetKind,
      target,
      ...result,
    });
    if (result.status === "pass" && current) {
      if (!graph.has(owner)) graph.set(owner, new Set());
      graph.get(owner).add(result.resolvedTo);
    }
  }
  function templates(owner, path, value) {
    const refs = [];
    let end = 0,
      ambiguous = false;
    for (const match of value.matchAll(/\{\{([^{}]+)\}\}/g)) {
      if (/[{}]/.test(value.slice(end, match.index))) ambiguous = true;
      refs.push(match[1]);
      end = match.index + match[0].length;
      assert(refs.length <= 1000, "Template reference budget exceeded");
    }
    if (
      /[{}]/.test(value.slice(end)) &&
      (value.includes("{{") || value.includes("}}"))
    )
      ambiguous = true;
    if (ambiguous) {
      emit("gtm-parameter-coverage", owner, path, {
        status: "unknown",
        reason: "ambiguous-template-syntax",
      });
      return false;
    }
    refs.forEach((target, index) =>
      reference(owner, `${path}/variable/${index}`, "variable", target),
    );
    return true;
  }
  function parameters(owner, path, items, requireKeys = true) {
    assert(Array.isArray(items), "Invalid parameter list");
    const keys = new Set();
    items.forEach((item, index) => {
      assert(
        item && typeof item === "object" && !Array.isArray(item),
        "Invalid parameter",
      );
      if (requireKeys) {
        assert(
          name(item.key) && !keys.has(item.key),
          "Missing or duplicate parameter key",
        );
        keys.add(item.key);
      }
      parameter(owner, `${path}/${index}`, item);
    });
  }
  function parameter(owner, path, item) {
    assert(
      item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof item.type === "string",
      "Invalid typed parameter",
    );
    if (item.isWeakReference !== undefined)
      assert(
        typeof item.isWeakReference === "boolean",
        "Invalid weak reference flag",
      );
    if (item.isWeakReference === true) {
      emit("gtm-parameter-coverage", owner, path, {
        status: "unknown",
        reason: "weak-reference-semantics-unassessed",
      });
      return;
    }
    const type =
      {
        TEMPLATE: "template",
        BOOLEAN: "boolean",
        INTEGER: "integer",
        LIST: "list",
        MAP: "map",
        TRIGGER_REFERENCE: "triggerReference",
        TAG_REFERENCE: "tagReference",
      }[item.type] ?? item.type;
    if (type === "list" || type === "map") {
      assert(
        item.value === undefined &&
          item[type === "list" ? "map" : "list"] === undefined,
        "Conflicting parameter representation",
      );
      parameters(owner, `${path}/${type}`, item[type], type === "map");
      return;
    }
    if (
      ![
        "template",
        "integer",
        "boolean",
        "triggerReference",
        "tagReference",
      ].includes(type)
    ) {
      emit("gtm-parameter-coverage", owner, path, {
        status: "unknown",
        reason: "unsupported-parameter-type",
      });
      return;
    }
    assert(
      typeof item.value === "string" &&
        item.list === undefined &&
        item.map === undefined,
      "Invalid scalar parameter",
    );
    if (!templates(owner, path, item.value)) return;
    const dynamic = item.value.includes("{{") || item.value.includes("}}");
    if (type === "tagReference" || type === "triggerReference") {
      if (dynamic)
        emit("gtm-parameter-coverage", owner, path, {
          status: "unknown",
          reason: "dynamic-reference-unassessed",
        });
      else
        reference(
          owner,
          `${path}/reference`,
          type === "tagReference" ? "tag" : "trigger",
          item.value,
        );
    } else if (!dynamic && type === "boolean")
      assert(
        ["true", "false"].includes(item.value),
        "Invalid boolean parameter",
      );
    else if (!dynamic && type === "integer")
      assert(
        /^-?(0|[1-9][0-9]*)$/.test(item.value) &&
          item.value.length <= 20 &&
          BigInt(item.value) >= -9223372036854775808n &&
          BigInt(item.value) <= 9223372036854775807n,
        "Invalid integer parameter",
      );
  }
  for (const collection of ["tag", "trigger", "variable"])
    for (const entity of version[collection] ?? []) {
      const owner = `${collection}:${entity[`${collection}Id`]}`;
      if (entity.parameter !== undefined)
        parameters(owner, "parameter", entity.parameter);
      if (collection === "tag") {
        for (const field of ["firingTriggerId", "blockingTriggerId"])
          if (entity[field] !== undefined) {
            assert(
              Array.isArray(entity[field]) &&
                entity[field].every(id) &&
                new Set(entity[field]).size === entity[field].length,
              "Invalid trigger references",
            );
            entity[field].forEach((target, index) =>
              reference(owner, `${field}/${index}`, "trigger", target),
            );
          }
        for (const field of ["setupTag", "teardownTag"])
          if (entity[field] !== undefined) {
            assert(
              Array.isArray(entity[field]) && entity[field].length <= 1,
              "Invalid sequencing references",
            );
            entity[field].forEach((entry, index) =>
              reference(owner, `${field}/${index}`, "tag", entry?.tagName),
            );
          }
        if (entity.priority !== undefined)
          parameter(owner, "priority", entity.priority);
      }
      if (collection === "trigger") {
        for (const field of ["filter", "customEventFilter", "autoEventFilter"])
          if (entity[field] !== undefined) {
            assert(Array.isArray(entity[field]), "Invalid trigger filters");
            entity[field].forEach((condition, index) => {
              assert(
                condition &&
                  typeof condition === "object" &&
                  !Array.isArray(condition),
                "Invalid condition",
              );
              if (condition.parameter !== undefined)
                parameters(
                  owner,
                  `${field}/${index}/parameter`,
                  condition.parameter,
                );
            });
          }
        for (const field of triggerParameterFields)
          if (entity[field] !== undefined)
            parameter(owner, field, entity[field]);
      }
    }
  // Iterative DFS; a structural cycle requires review, not an inferred runtime failure.
  const colors = new Map();
  for (const start of graph.keys()) {
    if (colors.has(start)) continue;
    const stack = [
      { node: start, edges: [...(graph.get(start) ?? [])], index: 0 },
    ];
    colors.set(start, 1);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.index === frame.edges.length) {
        colors.set(frame.node, 2);
        stack.pop();
        continue;
      }
      const target = frame.edges[frame.index++];
      if (colors.get(target) === 1)
        emit("gtm-reference-cycle", frame.node, `cycle/${target}`, {
          status: "unknown",
          reason: "static-reference-cycle-review-required",
          targetKind: "graph-node",
          target,
        });
      else if (!colors.has(target)) {
        colors.set(target, 1);
        stack.push({
          node: target,
          edges: [...(graph.get(target) ?? [])],
          index: 0,
        });
      }
    }
  }
  const requestGroups = new Map();
  for (const check of checks.filter((c) => c.status === "unknown")) {
    const artifact = [
      "incomplete-source-collection",
      "incomplete-name-inventory",
      "ineligible-snapshot",
    ].includes(check.reason)
      ? "container-version-export"
      : check.reason === "incomplete-trigger-inventory"
        ? "trigger-and-builtin-inventories"
        : "reviewed-dependency-interpretations";
    if (!requestGroups.has(artifact))
      requestGroups.set(artifact, {
        artifact,
        checkIds: [],
        reasons: new Set(),
      });
    const group = requestGroups.get(artifact);
    group.checkIds.push(check.checkId);
    group.reasons.add(check.reason);
  }
  const dataRequests = [...requestGroups.values()].map((group) =>
    budget({
      requestId: enterpriseDigest([
        context.run.customerId,
        context.entityId,
        context.resource,
        context.versionId,
        group.artifact,
      ]),
      checkIds: group.checkIds,
      reasons: [...group.reasons].sort(),
      neededArtifact: group.artifact,
      customerId: context.run.customerId,
      entityId: context.entityId,
      resource: context.resource,
      versionId: context.versionId,
      ownerRole: "measurement-owner",
      acceptedFormats:
        group.artifact === "container-version-export"
          ? [
              "GTM ContainerVersion JSON with per-collection completeness metadata",
            ]
          : group.artifact === "trigger-and-builtin-inventories"
            ? [
                "GTM ContainerVersion JSON and scoped builtin trigger inventory JSON",
              ]
            : [
                "Owner-reviewed dependency interpretation keyed by affected check IDs, with source/version evidence",
              ],
      instructions:
        group.artifact === "container-version-export"
          ? "Provide current complete tag, trigger, variable and builtin-variable collections for this exact version, preserving source timestamp and completeness metadata."
          : group.artifact === "trigger-and-builtin-inventories"
            ? "Provide the trigger collection and a complete, current builtin-trigger inventory bound to this customer, container and version; do not classify an unresolved ID as absent without both."
            : "Review the affected checks and supply source-backed disambiguation or a supported static representation. Do not execute supplied code to satisfy this request.",
      fallback:
        "Keep affected checks unknown and continue unrelated checks. A response requires fresh assessment; it does not itself resolve findings.",
    }),
  );
  const result = {
    schemaFamily: "enterprise-gtm-dependencies",
    schemaVersion: 1,
    synthetic: base.synthetic,
    runId: base.runId,
    evidenceId: base.evidenceId,
    customerId: context.run.customerId,
    entityId: context.entityId,
    assessmentAt: context.run.assessmentAt,
    sourceDigest: base.sourceDigest,
    evidenceDigest: base.evidenceDigest,
    inventoryDigest: inventory === null ? null : enterpriseDigest(inventory),
    checks,
    dataRequests,
    providerAuthenticated: false,
    inventoryAuthenticated: false,
    runtimeVerified: false,
    publicationVerified: false,
    assessmentAccepted: false,
    coverageComplete: false,
    limitations: [
      "Static references in supported tag/trigger/variable parameter surfaces only; no code or conditions executed.",
      "Builtin trigger inventory and collection completeness are supplied scope-bound assertions, not provider authentication.",
      "Custom template internals, transformations, zones, clients, consent semantics and dynamic references are not assessed; no full-container correctness claim.",
      "Cycles are review candidates, not demonstrated execution failures. Report integration and independent customer acceptance remain required.",
    ],
  };
  assert(
    Buffer.byteLength(JSON.stringify({ ...result, digest: "0".repeat(64) })) <=
      8 * 1024 * 1024,
    "Dependency output budget exceeded",
  );
  return { ...result, digest: enterpriseDigest(result) };
}
