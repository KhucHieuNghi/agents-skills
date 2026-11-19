import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { runPrivateControlOperation as worker } from "../private-control-transport.mjs";
import { acquireStoredResearchDraft } from "./research-stored-report.mjs";
import {
  readResearchControlStore,
  planStoredResearchDisclosure,
} from "./research-control-store.mjs";
import { validateResearchDraftArtifacts } from "./research-report.mjs";
import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

const namespace = "research-report-content-v1";
const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const exact = (value, keys, label) =>
  assert(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key)),
    `Invalid ${label}`,
  );
const id = (value) =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value);
const hash = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const time = (value) => {
  assert(timestampValue(value), "Invalid content authority clock");
  return Date.parse(value);
};
function snapshot(options) {
  exact(
    options,
    ["directory", "key", "context", "authority"],
    "content store options",
  );
  assert(
    Buffer.isBuffer(options.key) && options.key.length === 32,
    "Content key required",
  );
  return {
    directory: options.directory,
    key: Buffer.from(options.key),
    context: globalThis.structuredClone(options.context),
    authority: globalThis.structuredClone(options.authority),
  };
}
function controlSnapshot(options) {
  exact(
    options,
    ["directory", "key", "context", "authority"],
    "research controller options",
  );
  assert(
    Buffer.isBuffer(options.key) && options.key.length === 32,
    "Research controller key required",
  );
  return {
    directory: options.directory,
    key: Buffer.from(options.key),
    context: globalThis.structuredClone(options.context),
    authority: globalThis.structuredClone(options.authority),
  };
}
function authorize(o, operation) {
  exact(
    o.context,
    ["customerId", "recipientId", "purposeDigest", "storeId", "assessmentAt"],
    "content scope",
  );
  assert(
    id(o.context.customerId) &&
      id(o.context.recipientId) &&
      id(o.context.storeId) &&
      hash(o.context.purposeDigest),
    "Invalid content scope",
  );
  assert(
    typeof o.directory === "string" && resolve(o.directory) === o.directory,
    "Absolute content directory required",
  );
  const scope = enterpriseDigest({
    namespace,
    customerId: o.context.customerId,
    recipientId: o.context.recipientId,
    purposeDigest: o.context.purposeDigest,
    storeId: o.context.storeId,
    directory: o.directory,
  });
  const a = o.authority;
  exact(
    a,
    [
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
    ],
    "content authority",
  );
  assert(
    a.scopeDigest === scope &&
      a.directory === o.directory &&
      a.stagingDirectory === dirname(o.directory) &&
      a.artifactClass === "governed-report-content" &&
      a.operation === operation &&
      a.allowed === true,
    "Scoped content authority required",
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
    "Content authority expired or stale",
  );
  assert(
    a.retainUntil === null || time(a.retainUntil) > at,
    "Invalid content retention authority",
  );
  if (["create", "store"].includes(operation))
    assert(a.retainUntil !== null, "Content retention authority required");
  return scope;
}
const aad = (scope, revision, part, binding) =>
  Buffer.from(stableJson({ namespace, scope, revision, part, binding }));
function seal(key, scope, revision, part, binding, value, limit) {
  const bytes = Buffer.from(stableJson(value));
  assert(bytes.length <= limit, "Content store byte limit exceeded");
  try {
    const nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(aad(scope, revision, part, binding));
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return {
      nonce: nonce.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  } finally {
    bytes.fill(0);
  }
}
function open(key, scope, revision, part, binding, envelope) {
  try {
    exact(envelope, ["nonce", "tag", "ciphertext"], "encrypted compartment");
    const nonce = Buffer.from(envelope.nonce, "base64"),
      tag = Buffer.from(envelope.tag, "base64");
    assert(
      nonce.length === 12 &&
        tag.length === 16 &&
        typeof envelope.ciphertext === "string" &&
        envelope.ciphertext.length <= 5 * 1024 * 1024,
      "Invalid ciphertext",
    );
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(aad(scope, revision, part, binding));
    decipher.setAuthTag(tag);
    const bytes = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]);
    try {
      return JSON.parse(bytes.toString("utf8"));
    } finally {
      bytes.fill(0);
    }
  } catch {
    throw Error("Content store authentication failed");
  }
}
function encode(o, scope, revision, metadata, content) {
  const envelope = {
    schemaVersion: 1,
    metadata: seal(
      o.key,
      scope,
      revision,
      "metadata",
      null,
      metadata,
      512 * 1024,
    ),
    content:
      content === null
        ? null
        : seal(
            o.key,
            scope,
            revision,
            "content",
            enterpriseDigest(metadata),
            content,
            3 * 1024 * 1024,
          ),
  };
  const value = stableJson(envelope);
  assert(
    Buffer.byteLength(value) < 7 * 1024 * 1024,
    "Content transport limit exceeded",
  );
  return value;
}
async function readMetadata(o, scope, expected) {
  assert(
    Number.isSafeInteger(expected) &&
      expected > 0 &&
      expected < Number.MAX_SAFE_INTEGER,
    "Expected content revision required",
  );
  const stored = await worker("read", o, scope, null, null);
  assert(stored.revision === expected, "Content storage revision conflict");
  const envelope = JSON.parse(stored.envelope);
  exact(envelope, ["schemaVersion", "metadata", "content"], "content envelope");
  assert(envelope.schemaVersion === 1, "Unsupported content envelope");
  const metadata = open(
    o.key,
    scope,
    stored.revision,
    "metadata",
    null,
    envelope.metadata,
  );
  assert(
    metadata && ["empty", "stored", "removed"].includes(metadata.status),
    "Invalid content state",
  );
  return { revision: stored.revision, metadata, envelope };
}
async function researchControl(control, o, revision) {
  assert(
    control.context.assessmentAt === o.context.assessmentAt,
    "Research and content authority clocks differ",
  );
  assert(
    Number.isSafeInteger(revision) && revision > 0,
    "Expected research revision required",
  );
  const stored = await readResearchControlStore(control);
  assert(stored.revision === revision, "Research control revision changed");
  const scope = stored.control.state.scope;
  assert(
    scope.customerId === o.context.customerId &&
      scope.recipientId === o.context.recipientId &&
      scope.purposeDigest === o.context.purposeDigest,
    "Research content scope mismatch",
  );
  return stored;
}
function researchMetadataBinding(metadata, control) {
  const scope = metadata.policy?.scope;
  assert(
    scope &&
      enterpriseDigest(scope) === enterpriseDigest(control.control.state.scope),
    "Research policy scope mismatch",
  );
}

/** Local experimental vault: the host supplies authenticated authority and clock.
 * No export, physical erasure, remote revocation, or product release is implied. */
export async function createResearchContentStore(options) {
  const o = snapshot(options),
    scope = authorize(o, "create");
  const result = await worker(
    "create",
    o,
    scope,
    null,
    encode(o, scope, 1, { status: "empty" }, null),
  );
  return { revision: result.revision };
}
export async function storeResearchContentEdition(
  options,
  expectedStoreRevision,
  researchOptions,
  expectedResearchRevision,
  inputMetadata,
  loaders,
) {
  const o = snapshot(options),
    scope = authorize(o, "store"),
    control = controlSnapshot(researchOptions),
    metadata = globalThis.structuredClone(inputMetadata);
  assert(
    loaders &&
      typeof loaders.research === "function" &&
      typeof loaders.candidate === "function",
    "Research content loaders required",
  );
  const readResearch = loaders.research,
    readCandidate = loaders.candidate,
    verifiedReceipts = new Map();
  const before = await researchControl(control, o, expectedResearchRevision);
  researchMetadataBinding(metadata, before);
  const prior = await readMetadata(o, scope, expectedStoreRevision);
  assert(
    prior.metadata.status === "empty" && prior.envelope.content === null,
    "Content store is not empty",
  );
  const result = await acquireStoredResearchDraft(
    control,
    expectedResearchRevision,
    metadata,
    {
      research: readResearch,
      candidate: async (descriptor) => {
        const payload = globalThis.structuredClone(
          await readCandidate(descriptor),
        );
        verifiedReceipts.set(payload.candidateId, payload.receiptText);
        return payload;
      },
    },
  );
  await researchControl(control, o, expectedResearchRevision);
  const content = {
    artifacts: result.customerArtifacts,
    provenance: result.privateProvenance,
  };
  validateResearchDraftArtifacts(content.artifacts);
  const candidateIds = result.privateProvenance.items.map(
    (item) => item.origin.candidateId,
  );
  assert(
    Number.isSafeInteger(metadata.policy.reviewMaxAgeSeconds) &&
      metadata.policy.reviewMaxAgeSeconds > 0,
    "Invalid verified review age",
  );
  let reviewNotAfterMs = time(metadata.policy.validUntil);
  for (const candidateId of candidateIds) {
    let receipt;
    try {
      receipt = JSON.parse(verifiedReceipts.get(candidateId));
    } catch {
      throw Error("Missing verified review receipt");
    }
    reviewNotAfterMs = Math.min(
      reviewNotAfterMs,
      time(receipt.validUntil),
      time(receipt.reviewedAt) + metadata.policy.reviewMaxAgeSeconds * 1000,
    );
  }
  assert(
    Number.isSafeInteger(reviewNotAfterMs) &&
      time(o.context.assessmentAt) < reviewNotAfterMs,
    "Verified review expiry invalid",
  );
  const storedMetadata = {
    status: "stored",
    researchRevision: expectedResearchRevision,
    researchDirectory: control.directory,
    researchScopeDigest: enterpriseDigest(before.control.state.scope),
    metadata,
    candidateIds,
    reviewNotAfterMs,
    retainUntil: o.authority.retainUntil,
    contentDigest: enterpriseDigest(content),
  };
  const next = expectedStoreRevision + 1;
  await worker(
    "replace",
    o,
    scope,
    expectedStoreRevision,
    encode(o, scope, next, storedMetadata, content),
  );
  try {
    await researchControl(control, o, expectedResearchRevision);
  } catch {
    throw Error(
      "Content may be committed but research access changed; block access and clean up",
    );
  }
  return { revision: next, deliveryAuthorized: false };
}
export async function readResearchContentEdition(
  options,
  expectedStoreRevision,
  researchOptions,
  expectedResearchRevision,
) {
  const o = snapshot(options),
    scope = authorize(o, "read"),
    control = controlSnapshot(researchOptions);
  const first = await researchControl(control, o, expectedResearchRevision);
  const stored = await readMetadata(o, scope, expectedStoreRevision),
    meta = stored.metadata;
  assert(
    meta.status === "stored" && stored.envelope.content !== null,
    "Content edition unavailable",
  );
  exact(
    meta,
    [
      "status",
      "researchRevision",
      "researchDirectory",
      "researchScopeDigest",
      "metadata",
      "candidateIds",
      "reviewNotAfterMs",
      "retainUntil",
      "contentDigest",
    ],
    "stored content metadata",
  );
  assert(
    meta.researchDirectory === control.directory,
    "Research controller directory changed",
  );
  assert(
    meta.researchRevision === expectedResearchRevision &&
      meta.researchScopeDigest ===
        enterpriseDigest(first.control.state.scope) &&
      time(o.context.assessmentAt) < time(meta.retainUntil),
    "Research revision or content retention expired",
  );
  assert(
    Number.isSafeInteger(meta.reviewNotAfterMs) &&
      time(o.context.assessmentAt) < meta.reviewNotAfterMs,
    "Verified research review expired",
  );
  researchMetadataBinding(meta.metadata, first);
  const planned = await planStoredResearchDisclosure(
    control,
    meta.metadata.descriptors,
    meta.metadata.policy,
    meta.metadata.candidates,
  );
  assert(
    planned.revision === expectedResearchRevision &&
      Array.isArray(meta.candidateIds) &&
      meta.candidateIds.every((id) =>
        planned.plan.candidates.some(
          (candidate) =>
            candidate.candidateId === id && candidate.fetchEligible,
        ),
      ),
    "Research disclosure eligibility changed",
  );
  await researchControl(control, o, expectedResearchRevision);
  const beforeDecrypt = await worker("read", o, scope, null, null);
  assert(
    beforeDecrypt.revision === stored.revision,
    "Content storage revision changed",
  );
  const content = open(
    o.key,
    scope,
    stored.revision,
    "content",
    enterpriseDigest(meta),
    stored.envelope.content,
  );
  exact(content, ["artifacts", "provenance"], "stored content");
  assert(
    enterpriseDigest(content) === meta.contentDigest,
    "Stored content binding mismatch",
  );
  validateResearchDraftArtifacts(content.artifacts);
  await researchControl(control, o, expectedResearchRevision);
  const beforeReturn = await worker("read", o, scope, null, null);
  assert(
    beforeReturn.revision === stored.revision,
    "Content storage revision changed",
  );
  return {
    artifacts: content.artifacts,
    revision: stored.revision,
    exportAuthorized: false,
  };
}
export async function removeResearchContentEdition(
  options,
  expectedStoreRevision,
) {
  const o = snapshot(options),
    scope = authorize(o, "remove");
  const stored = await readMetadata(o, scope, expectedStoreRevision);
  if (stored.metadata.status === "removed")
    return {
      revision: stored.revision,
      alreadyRemoved: true,
      physicalErasureVerified: false,
    };
  const next = expectedStoreRevision + 1;
  await worker(
    "replace",
    o,
    scope,
    expectedStoreRevision,
    encode(o, scope, next, { status: "removed" }, null),
  );
  return {
    revision: next,
    alreadyRemoved: false,
    physicalErasureVerified: false,
  };
}
