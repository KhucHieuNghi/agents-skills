import { loadEnterpriseReport } from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { runPrivateControlOperation as worker } from "./private-control-transport.mjs";
import { inspectStoredGeneratedReportProvenance } from "./enterprise-report-provenance.mjs";
import {
  enterpriseDigest as digest,
  stableJson,
  timestampValue,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const namespace = "generated-report-provenance-v1";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const exact = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid provenance registry shape",
  );
const id = (v) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(v);
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const time = (v) => {
  assert(timestampValue(v), "Invalid provenance authority time");
  return Date.parse(v);
};
function snapshot(options) {
  exact(options, ["directory", "key", "context", "authority"]);
  assert(
    Buffer.isBuffer(options.key) && options.key.length === 32,
    "Caller-managed 256-bit key required",
  );
  return {
    ...options,
    key: Buffer.from(options.key),
    context: globalThis.structuredClone(options.context),
    authority: globalThis.structuredClone(options.authority),
  };
}
function authorize(o, operation) {
  exact(o.context, ["customerId", "storeId", "purpose", "assessmentAt"]);
  assert(
    id(o.context.customerId) &&
      id(o.context.storeId) &&
      o.context.purpose === "enterprise-report-history",
    "Invalid provenance registry scope",
  );
  assert(
    typeof o.directory === "string" && resolve(o.directory) === o.directory,
    "Absolute provenance registry directory required",
  );
  const identity = {
      namespace,
      customerId: o.context.customerId,
      storeId: o.context.storeId,
      purpose: o.context.purpose,
    },
    scope = digest(identity),
    a = o.authority;
  exact(a, [
    "scopeDigest",
    "directory",
    "stagingDirectory",
    "artifactClass",
    "operation",
    "allowed",
    "observedAt",
    "validUntil",
    "maxAgeSeconds",
    "retainUntil",
  ]);
  assert(
    a.scopeDigest === scope &&
      a.directory === o.directory &&
      a.stagingDirectory === dirname(o.directory) &&
      a.artifactClass === "generated-report-provenance-metadata" &&
      a.operation === operation &&
      a.allowed === true,
    "Scoped provenance storage authority required",
  );
  const at = time(o.context.assessmentAt),
    observed = time(a.observedAt);
  assert(
    Number.isSafeInteger(a.maxAgeSeconds) &&
      a.maxAgeSeconds > 0 &&
      a.maxAgeSeconds <= 31622400 &&
      observed <= at &&
      at < time(a.validUntil) &&
      at < observed + a.maxAgeSeconds * 1000,
    "Provenance authority expired or stale",
  );
  assert(
    a.retainUntil === null || time(a.retainUntil) > at,
    "Invalid authorized retention deadline",
  );
  if (operation === "register")
    assert(a.retainUntil !== null, "Registration retention authority required");
  return scope;
}
const recordId = (p) =>
  digest({ reportDigest: p.reportDigest, artifactBinding: p.artifactBinding });
function validateProvenance(p, customerId) {
  exact(p, [
    "schemaFamily",
    "schemaVersion",
    "audience",
    "reportDigest",
    "revisionId",
    "scope",
    "compilerDigest",
    "items",
    "persistenceAuthorized",
    "disclosureAuthorized",
    "historyPreserved",
    "artifactBinding",
    ...(p?.schemaVersion === 2 ? ["assessment"] : []),
  ]);
  exact(p.scope, ["customerId", "runId"]);
  exact(p.artifactBinding, [
    "manifestDigest",
    "reportJsonDigest",
    "edition",
    "sourceRunDigest",
  ]);
  assert(
    p.schemaFamily === "private-generated-report-provenance" &&
      [1, 2].includes(p.schemaVersion) &&
      p.audience === "private" &&
      p.scope.customerId === customerId &&
      id(p.scope.runId) &&
      id(p.revisionId) &&
      hash(p.reportDigest) &&
      hash(p.compilerDigest) &&
      p.artifactBinding.edition === "customer" &&
      ["manifestDigest", "reportJsonDigest", "sourceRunDigest"].every((k) =>
        hash(p.artifactBinding[k]),
      ) &&
      p.persistenceAuthorized === false &&
      p.disclosureAuthorized === false &&
      p.historyPreserved === false,
    "Invalid generated provenance metadata",
  );
  if (p.schemaVersion === 2) {
    exact(p.assessment, [
      "generatedAt",
      "assessmentAt",
      "parentRunIds",
      "parentReportDigest",
    ]);
    assert(
      time(p.assessment.assessmentAt) <= time(p.assessment.generatedAt) &&
        Array.isArray(p.assessment.parentRunIds) &&
        p.assessment.parentRunIds.every(id) &&
        new Set(p.assessment.parentRunIds).size ===
          p.assessment.parentRunIds.length &&
        !p.assessment.parentRunIds.includes(p.scope.runId) &&
        (p.assessment.parentReportDigest === null ||
          hash(p.assessment.parentReportDigest)),
      "Invalid provenance assessment metadata",
    );
  }
  assert(
    Array.isArray(p.items) && p.items.length <= 10000,
    "Provenance item limit",
  );
  const seen = new Set();
  for (const item of p.items) {
    exact(item, [
      "collection",
      "itemId",
      "itemDigest",
      "targetDigest",
      "origin",
    ]);
    exact(item.origin, [
      "kind",
      "moduleId",
      "compilerDigest",
      "sourceRunDigest",
      "evidenceBindings",
    ]);
    const key = item.collection + ":" + item.itemId;
    assert(
      ["findings", "observations", "narrative"].includes(item.collection) &&
        id(item.itemId) &&
        !seen.has(key) &&
        hash(item.itemDigest) &&
        hash(item.targetDigest) &&
        item.origin.kind === "generated" &&
        id(item.origin.moduleId) &&
        item.origin.compilerDigest === p.compilerDigest &&
        item.origin.sourceRunDigest === p.artifactBinding.sourceRunDigest,
      "Invalid provenance item",
    );
    seen.add(key);
    assert(
      Array.isArray(item.origin.evidenceBindings) &&
        item.origin.evidenceBindings.length <= 10000,
      "Provenance evidence limit",
    );
    const ids = new Set();
    for (const e of item.origin.evidenceBindings) {
      exact(e, ["evidenceId", "digest"]);
      assert(
        id(e.evidenceId) && hash(e.digest) && !ids.has(e.evidenceId),
        "Invalid provenance evidence",
      );
      ids.add(e.evidenceId);
    }
  }
}
function validateState(state, o) {
  exact(state, [
    "schemaVersion",
    "namespace",
    "customerId",
    "storeId",
    "records",
  ]);
  assert(
    state.schemaVersion === 1 &&
      state.namespace === namespace &&
      state.customerId === o.context.customerId &&
      state.storeId === o.context.storeId &&
      Array.isArray(state.records) &&
      state.records.length <= 1000,
    "Invalid provenance registry state",
  );
  const ids = new Set();
  for (const r of state.records) {
    exact(r, ["registrationId", "registeredAt", "retainUntil", "provenance"]);
    validateProvenance(r.provenance, state.customerId);
    if (r.provenance.schemaVersion === 2)
      assert(
        time(r.registeredAt) >= time(r.provenance.assessment.generatedAt),
        "Registration predates stored report generation",
      );
    assert(
      r.registrationId === recordId(r.provenance) &&
        !ids.has(r.registrationId) &&
        time(r.registeredAt) < time(r.retainUntil) &&
        time(r.registeredAt) <= time(o.context.assessmentAt),
      "Invalid provenance registration",
    );
    ids.add(r.registrationId);
  }
  return state;
}
const aad = (scope, revision) =>
  Buffer.from(stableJson({ namespace, scope, revision }));
function encrypt(key, scope, revision, state) {
  const bytes = Buffer.from(stableJson(state));
  assert(bytes.length <= 4 * 1024 * 1024, "Provenance registry size limit");
  const nonce = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad(scope, revision));
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  bytes.fill(0);
  return JSON.stringify({
    nonce: nonce.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });
}
function decrypt(key, scope, revision, envelope) {
  try {
    assert(
      typeof envelope === "string" &&
        Buffer.byteLength(envelope) <= 6 * 1024 * 1024,
      "Envelope limit",
    );
    const raw = JSON.parse(envelope);
    exact(raw, ["nonce", "tag", "ciphertext"]);
    const nonce = Buffer.from(raw.nonce, "base64"),
      tag = Buffer.from(raw.tag, "base64");
    assert(nonce.length === 12 && tag.length === 16, "Envelope parameters");
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(aad(scope, revision));
    decipher.setAuthTag(tag);
    const bytes = Buffer.concat([
      decipher.update(Buffer.from(raw.ciphertext, "base64")),
      decipher.final(),
    ]);
    try {
      return JSON.parse(bytes.toString("utf8"));
    } finally {
      bytes.fill(0);
    }
  } catch {
    throw Error("Provenance registry authentication failed");
  }
}
async function readState(o, scope) {
  const result = await worker("read", o, scope, null, null);
  return {
    revision: result.revision,
    state: validateState(
      decrypt(o.key, scope, result.revision, result.envelope),
      o,
    ),
  };
}
async function replace(o, scope, expected, state) {
  assert(
    Number.isSafeInteger(expected) && expected > 0,
    "Expected provenance revision required",
  );
  validateState(state, o);
  const result = await worker(
    "replace",
    o,
    scope,
    expected,
    encrypt(o.key, scope, expected + 1, state),
  );
  return result.revision;
}
export async function createGeneratedProvenanceRegistry(options) {
  const o = snapshot(options),
    scope = authorize(o, "create"),
    state = {
      schemaVersion: 1,
      namespace,
      customerId: o.context.customerId,
      storeId: o.context.storeId,
      records: [],
    };
  const result = await worker(
    "create",
    o,
    scope,
    null,
    encrypt(o.key, scope, 1, state),
  );
  return { revision: result.revision };
}
/** Records only verified inspector output, never a caller provenance object. */
export async function registerGeneratedProvenance(
  options,
  expectedRevision,
  binding,
  retainUntil,
) {
  const o = snapshot(options),
    scope = authorize(o, "register"),
    input = globalThis.structuredClone(binding);
  assert(
    Number.isSafeInteger(expectedRevision) && expectedRevision > 0,
    "Expected provenance revision required",
  );
  assert(
    time(retainUntil) > time(o.context.assessmentAt) &&
      time(retainUntil) <= time(o.authority.retainUntil),
    "Retention exceeds authority",
  );
  const provenance = await inspectStoredGeneratedReportProvenance(input);
  validateProvenance(provenance, o.context.customerId);
  const report = await loadEnterpriseReport(input.reportDirectory, {
    expectedManifestDigest: input.manifestDigest,
  });
  assert(
    digest(report) === provenance.reportDigest &&
      time(report.generatedAt) <= time(o.context.assessmentAt),
    "Registration predates report generation or report binding changed",
  );
  const stored = await readState(o, scope);
  assert(
    stored.revision === expectedRevision,
    "Provenance storage revision conflict",
  );
  const registrationId = recordId(provenance),
    prior = stored.state.records.find(
      (r) => r.registrationId === registrationId,
    );
  if (prior) {
    assert(
      stableJson(prior.provenance) === stableJson(provenance) &&
        prior.retainUntil === retainUntil,
      "Registration rebinding or retention extension requires separate authorization",
    );
    return { revision: stored.revision, registrationId, created: false };
  }
  stored.state.records.push({
    registrationId,
    registeredAt: o.context.assessmentAt,
    retainUntil,
    provenance,
  });
  return {
    revision: await replace(o, scope, expectedRevision, stored.state),
    registrationId,
    created: true,
  };
}
/** No id returns revision only for uncertain-outcome reconciliation. */
export async function readGeneratedProvenance(options, registrationId = null) {
  const o = snapshot(options),
    scope = authorize(o, "read"),
    stored = await readState(o, scope);
  if (registrationId === null) return { revision: stored.revision };
  assert(hash(registrationId), "Invalid registration identity");
  const record = stored.state.records.find(
    (r) => r.registrationId === registrationId,
  );
  assert(record, "Missing provenance registration");
  assert(
    time(record.retainUntil) > time(o.context.assessmentAt),
    "Provenance registration expired; cleanup required",
  );
  return {
    revision: stored.revision,
    record,
    currentReplayVerified: false,
    disclosureAuthorized: false,
  };
}
/** Logical removal only; no permanent denylist or physical-erasure claim. */
export async function removeGeneratedProvenance(
  options,
  expectedRevision,
  registrationId = null,
) {
  const o = snapshot(options),
    scope = authorize(o, registrationId === null ? "purge-expired" : "remove"),
    stored = await readState(o, scope);
  assert(
    stored.revision === expectedRevision,
    "Provenance storage revision conflict",
  );
  if (registrationId !== null)
    assert(
      hash(registrationId) &&
        stored.state.records.some((r) => r.registrationId === registrationId),
      "Missing provenance registration",
    );
  const before = stored.state.records.length;
  stored.state.records = stored.state.records.filter((r) =>
    registrationId === null
      ? time(r.retainUntil) > time(o.context.assessmentAt)
      : r.registrationId !== registrationId,
  );
  return {
    revision: await replace(o, scope, expectedRevision, stored.state),
    removed: before - stored.state.records.length,
    physicalErasureVerified: false,
    revocationEnforced: false,
  };
}

/** Private ordered comparison only. Standalone registrations are not a revision chain. */
export async function compareRegisteredGeneratedReports(
  options,
  expectedRevision,
  registrationIds,
) {
  const o = snapshot(options),
    scope = authorize(o, "read-history"),
    ids = globalThis.structuredClone(registrationIds);
  assert(
    Number.isSafeInteger(expectedRevision) &&
      expectedRevision > 0 &&
      Array.isArray(ids) &&
      ids.length >= 2 &&
      ids.length <= 100 &&
      ids.every(hash) &&
      new Set(ids).size === ids.length,
    "Invalid registered report comparison selection",
  );
  const stored = await readState(o, scope);
  assert(
    stored.revision === expectedRevision,
    "Provenance storage revision conflict",
  );
  const selected = ids.map((id) => {
    const r = stored.state.records.find((r) => r.registrationId === id);
    assert(
      r && time(r.retainUntil) > time(o.context.assessmentAt),
      "Selected registration unavailable or expired",
    );
    assert(
      r.provenance.schemaVersion === 2,
      "Legacy provenance lacks assessment lineage; explicit migration required",
    );
    return r.provenance;
  });
  assert(
    new Set(selected.map((p) => p.reportDigest)).size === selected.length,
    "Duplicate logical report identity",
  );
  const seenRuns = new Map(),
    seenRevisions = new Set();
  for (const [index, p] of selected.entries()) {
    assert(
      !seenRevisions.has(p.revisionId),
      "Duplicate selected revision identity",
    );
    seenRevisions.add(p.revisionId);
    const source = p.artifactBinding.sourceRunDigest;
    assert(
      !seenRuns.has(p.scope.runId) || seenRuns.get(p.scope.runId) === source,
      "Selected source run was rewritten",
    );
    seenRuns.set(p.scope.runId, source);
    if (index === 0) continue;
    const prior = selected[index - 1];
    assert(
      time(p.assessment.generatedAt) > time(prior.assessment.generatedAt) &&
        time(p.assessment.assessmentAt) >= time(prior.assessment.assessmentAt),
      "Selected report chronology mismatch",
    );
    assert(
      p.scope.runId === prior.scope.runId ||
        p.assessment.parentRunIds.includes(prior.scope.runId),
      "Selected report run ancestry mismatch",
    );
  }
  const key = (i) => i.collection + ":" + i.itemId;
  const transitions = selected.slice(1).map((next, index) => {
    const prior = selected[index],
      before = new Map(prior.items.map((i) => [key(i), i])),
      after = new Map(next.items.map((i) => [key(i), i]));
    return {
      fromRegistrationId: ids[index],
      toRegistrationId: ids[index + 1],
      compilerChanged: prior.compilerDigest !== next.compilerDigest,
      items: prior.items.map((item) => {
        const current = after.get(key(item));
        return {
          collection: item.collection,
          itemId: item.itemId,
          previousDigest: item.itemDigest,
          nextDigest: current?.itemDigest ?? null,
          contentState: !current
            ? "not-present"
            : item.itemDigest === current.itemDigest
              ? "equal"
              : "changed",
          contextState: !current
            ? "not-present"
            : item.targetDigest === current.targetDigest
              ? "equal"
              : "changed",
        };
      }),
      additions: next.items
        .filter((i) => !before.has(key(i)))
        .map((i) => ({
          collection: i.collection,
          itemId: i.itemId,
          itemDigest: i.itemDigest,
          targetDigest: i.targetDigest,
        })),
    };
  });
  return {
    schemaFamily: "private-generated-report-comparison",
    schemaVersion: 1,
    audience: "private",
    registryRevision: stored.revision,
    registrationIds: ids,
    reports: selected.map((p) => ({
      reportDigest: p.reportDigest,
      revisionId: p.revisionId,
      scope: p.scope,
      assessment: p.assessment,
      artifactBinding: p.artifactBinding,
    })),
    transitions,
    revisionChainVerified: false,
    historicalCoverageComplete: false,
    currentReplayVerified: false,
    persistenceAuthorized: false,
    disclosureAuthorized: false,
    remediationVerified: false,
    limitation:
      "Ordered selected metadata only; contextState compares the full review-target digest, including item content. Content equality is not dependency validity. Absence does not establish remediation, withdrawal, deletion or loss of permission. Omitted registrations are not assessed.",
  };
}
