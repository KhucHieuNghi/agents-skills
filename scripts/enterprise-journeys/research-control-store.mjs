import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { setTimeout, clearTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { advanceResearchAccessState } from "./research-access-state.mjs";
import {
  bindResearchCandidateRevision,
  planResearchAtRevision,
} from "./research-revision-workflow.mjs";
import { planResearchDisclosure } from "./research-disclosure.mjs";
import { projectResearchDisclosure } from "./research-projection.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid control-store shape",
  );
const time = (v) => {
  assert(timestampValue(v), "Invalid storage authority timestamp");
  return Date.parse(v);
};
function authorize(options) {
  shape(options, ["directory", "key", "context", "authority"]);
  assert(
    typeof options.directory === "string" &&
      resolve(options.directory) === options.directory,
    "Absolute storage directory required",
  );
  assert(
    Buffer.isBuffer(options.key) && options.key.length === 32,
    "A caller-managed 256-bit key is required",
  );
  const initial = advanceResearchAccessState(null, null, options.context),
    scope = enterpriseDigest(initial.scope),
    a = options.authority;
  shape(a, [
    "scopeDigest",
    "directory",
    "artifactClass",
    "stagingDirectory",
    "allowed",
    "observedAt",
    "validUntil",
    "maxAgeSeconds",
  ]);
  assert(
    a.scopeDigest === scope &&
      a.directory === options.directory &&
      a.stagingDirectory === dirname(options.directory) &&
      a.artifactClass === "research-control-metadata" &&
      a.allowed === true,
    "Scoped storage authority required",
  );
  assert(
    Number.isSafeInteger(a.maxAgeSeconds) &&
      a.maxAgeSeconds > 0 &&
      a.maxAgeSeconds <= 31622400,
    "Invalid storage authority freshness",
  );
  const at = time(options.context.assessmentAt),
    observed = time(a.observedAt);
  assert(
    observed <= at &&
      time(a.validUntil) > at &&
      observed + a.maxAgeSeconds * 1000 > at,
    "Storage authority expired or stale",
  );
  return { initial, scope };
}
const aad = (scope, revision) =>
  Buffer.from(
    stableJson({ namespace: "research-control-v1", scope, revision }),
  );
function encrypt(key, scope, revision, control) {
  const nonce = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aad(scope, revision));
  const plaintext = Buffer.from(stableJson(control));
  assert(
    plaintext.length <= 4 * 1024 * 1024,
    "Research control metadata too large",
  );
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  plaintext.fill(0);
  return JSON.stringify({
    nonce: nonce.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
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
    shape(raw, ["nonce", "tag", "ciphertext"]);
    const nonce = Buffer.from(raw.nonce, "base64"),
      tag = Buffer.from(raw.tag, "base64"),
      ciphertext = Buffer.from(raw.ciphertext, "base64");
    assert(nonce.length === 12 && tag.length === 16, "Envelope parameters");
    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAAD(aad(scope, revision));
    decipher.setAuthTag(tag);
    const bytes = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    try {
      return JSON.parse(bytes.toString("utf8"));
    } finally {
      bytes.fill(0);
    }
  } catch {
    throw Error("Research control authentication failed");
  }
}
function worker(operation, options, scope, expected, envelope) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      "python3",
      [
        "-I",
        fileURLToPath(new URL("./research_control_store.py", import.meta.url)),
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          PATH: "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
          LANG: "C.UTF-8",
        },
      },
    );
    let output = "",
      done = false;
    const finish = (error, result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolvePromise(result);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(
        Error(
          "Research storage timeout; commit outcome unknown, read before retry",
        ),
      );
    }, 30000);
    child.on("error", () =>
      finish(Error("Research storage worker unavailable")),
    );
    child.stdin.on("error", () => {});
    child.stderr.resume();
    child.stdout.on("data", (data) => {
      output += data.toString();
      if (Buffer.byteLength(output) > 8 * 1024 * 1024) {
        child.kill("SIGKILL");
        finish(Error("Research storage output limit; commit outcome unknown"));
      }
    });
    child.on("close", () => {
      try {
        const result = JSON.parse(output);
        if (result.error)
          finish(
            Error(
              result.error === "conflict"
                ? "Research storage revision conflict"
                : "Research storage operation failed; commit outcome unknown, read before retry",
            ),
          );
        else if (
          !Number.isSafeInteger(result.revision) ||
          result.revision < 1 ||
          typeof result.envelope !== "string"
        )
          finish(Error("Invalid research storage response"));
        else finish(null, result);
      } catch {
        finish(
          Error(
            "Research storage response unavailable; commit outcome unknown",
          ),
        );
      }
    });
    child.stdin.end(
      JSON.stringify({
        operation,
        directory: options.directory,
        scope,
        expected,
        envelope,
      }),
    );
  });
}
function validateControl(input, context, scope) {
  let control = input;
  if (control?.schemaVersion === 1) {
    shape(control, ["schemaVersion", "state", "registrations"]);
    assert(
      Array.isArray(control.registrations) &&
        control.registrations.length === 0,
      "Unsupported legacy control store",
    );
    control = {
      ...control,
      schemaVersion: 2,
      retiredCandidateIds: [],
      retiredArtifactHashes: [],
    };
  }
  shape(control, [
    "schemaVersion",
    "state",
    "registrations",
    "retiredCandidateIds",
    "retiredArtifactHashes",
  ]);
  assert(
    control.schemaVersion === 2 &&
      Array.isArray(control.registrations) &&
      control.registrations.length <= 1000 &&
      Array.isArray(control.retiredCandidateIds) &&
      control.retiredCandidateIds.length <= 10000 &&
      Array.isArray(control.retiredArtifactHashes) &&
      control.retiredArtifactHashes.length <= 20000,
    "Unsupported control-store content",
  );
  advanceResearchAccessState(
    control.state,
    enterpriseDigest(control.state),
    context,
  );
  assert(
    enterpriseDigest(control.state.scope) === scope,
    "Stored research scope mismatch",
  );
  const id = (v) =>
    typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
  const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
  const retiredHashes = new Set(control.retiredArtifactHashes);
  assert(
    retiredHashes.size === control.retiredArtifactHashes.length &&
      control.retiredArtifactHashes.every(hash),
    "Invalid retired artifact registry",
  );
  const seen = new Set(control.retiredCandidateIds);
  assert(
    seen.size === control.retiredCandidateIds.length &&
      control.retiredCandidateIds.every(id),
    "Invalid retired candidate registry",
  );
  const participants = new Set(
    context.protocol.participants.map((p) => p.participantId),
  );
  for (const entry of control.registrations) {
    shape(entry, [
      "candidateId",
      "metadataDigest",
      "registration",
      "candidateArtifactHash",
      "receiptArtifactHash",
    ]);
    assert(
      [entry.candidateArtifactHash, entry.receiptArtifactHash].every(
        (h) => hash(h) && !retiredHashes.has(h),
      ),
      "Invalid active artifact registry",
    );
    assert(
      id(entry.candidateId) &&
        !seen.has(entry.candidateId) &&
        hash(entry.metadataDigest),
      "Invalid active candidate registry",
    );
    seen.add(entry.candidateId);
    shape(entry.registration, ["candidateId", "binding"]);
    assert(
      entry.registration.candidateId === entry.candidateId,
      "Registration identity mismatch",
    );
    const b = entry.registration.binding;
    shape(b, [
      "schemaVersion",
      "contributorIds",
      "validUntil",
      "scope",
      "generation",
      "accessDigest",
      "artifactDigest",
      "reviewedAt",
    ]);
    assert(
      b.schemaVersion === 1 &&
        stableJson(b.scope) === stableJson(control.state.scope) &&
        b.generation === control.state.generation &&
        b.accessDigest === control.state.accessDigest &&
        b.artifactDigest === entry.metadataDigest,
      "Stored registration binding mismatch",
    );
    assert(
      Array.isArray(b.contributorIds) &&
        b.contributorIds.length > 0 &&
        b.contributorIds.length <= 1000 &&
        new Set(b.contributorIds).size === b.contributorIds.length &&
        b.contributorIds.every((p) => participants.has(p)),
      "Invalid stored contributors",
    );
    assert(
      time(b.reviewedAt) >= time(control.state.changedAt) &&
        time(b.reviewedAt) <= time(context.assessmentAt) &&
        time(b.validUntil) > time(b.reviewedAt),
      "Invalid stored review chronology",
    );
  }
  return control;
}
export async function createResearchControlStore(options) {
  const { initial, scope } = authorize(options),
    control = {
      schemaVersion: 2,
      state: initial,
      registrations: [],
      retiredCandidateIds: [],
      retiredArtifactHashes: [],
    };
  await worker(
    "create",
    options,
    scope,
    null,
    encrypt(options.key, scope, 1, control),
  );
  return { revision: 1, control };
}
export async function readResearchControlStore(options) {
  const { scope } = authorize(options),
    record = await worker("read", options, scope, null, null);
  const control = validateControl(
    decrypt(options.key, scope, record.revision, record.envelope),
    options.context,
    scope,
  );
  return { revision: record.revision, control };
}
export async function advanceStoredResearchAccess(options, expectedRevision) {
  const { scope } = authorize(options);
  assert(
    Number.isSafeInteger(expectedRevision) &&
      expectedRevision > 0 &&
      expectedRevision < Number.MAX_SAFE_INTEGER,
    "Invalid expected storage revision",
  );
  const previous = await readResearchControlStore(options);
  assert(
    previous.revision === expectedRevision,
    "Research storage revision conflict",
  );
  const state = advanceResearchAccessState(
    previous.control.state,
    enterpriseDigest(previous.control.state),
    options.context,
  );
  const changed = state.generation !== previous.control.state.generation;
  const control = {
    schemaVersion: 2,
    state,
    registrations: changed ? [] : previous.control.registrations,
    retiredArtifactHashes: changed
      ? [
          ...new Set([
            ...previous.control.retiredArtifactHashes,
            ...previous.control.registrations.flatMap((r) => [
              r.candidateArtifactHash,
              r.receiptArtifactHash,
            ]),
          ]),
        ].sort()
      : previous.control.retiredArtifactHashes,
    retiredCandidateIds: changed
      ? [
          ...new Set([
            ...previous.control.retiredCandidateIds,
            ...previous.control.registrations.map((r) => r.candidateId),
          ]),
        ].sort()
      : previous.control.retiredCandidateIds,
  };
  validateControl(control, options.context, scope);
  await worker(
    "replace",
    options,
    scope,
    expectedRevision,
    encrypt(options.key, scope, expectedRevision + 1, control),
  );
  return { revision: expectedRevision + 1, control };
}

const metadataDigest = (candidate, policy) =>
  enterpriseDigest({ candidate, policyDigest: enterpriseDigest(policy) });
/** Persist verified registration metadata only; no candidate/source text is retained. */
export async function registerStoredResearchReviews(
  options,
  expectedRevision,
  bundle,
) {
  const { scope } = authorize(options);
  assert(
    Number.isSafeInteger(expectedRevision) &&
      expectedRevision > 0 &&
      expectedRevision < Number.MAX_SAFE_INTEGER,
    "Invalid expected storage revision",
  );
  shape(bundle, [
    "descriptors",
    "researchPayloads",
    "policy",
    "candidates",
    "payloads",
  ]);
  const previous = await readResearchControlStore(options);
  assert(
    previous.revision === expectedRevision,
    "Research storage revision conflict",
  );
  const state = previous.control.state,
    next = advanceResearchAccessState(
      state,
      enterpriseDigest(state),
      options.context,
    );
  assert(
    next.generation === state.generation,
    "Advance stored access before registration",
  );
  const { descriptors, researchPayloads, policy, candidates, payloads } =
    bundle;
  const plan = planResearchDisclosure(
    options.context,
    descriptors,
    policy,
    candidates,
  );
  assert(
    candidates.length > 0 && plan.candidates.every((c) => c.fetchEligible),
    "Research registration metadata is ineligible",
  );
  const existing = new Map(
      previous.control.registrations.map((r) => [r.candidateId, r]),
    ),
    retired = new Set(previous.control.retiredCandidateIds);
  assertUnretiredResearchArtifacts(previous.control, descriptors, candidates);
  // All candidate lifecycle checks precede source/candidate payload inspection.
  for (const c of candidates) {
    assert(
      !retired.has(c.candidateId),
      "Retired candidate requires a new identity and review",
    );
    const old = existing.get(c.candidateId);
    assert(
      !old || old.metadataDigest === metadataDigest(c, policy),
      "Candidate identity cannot be reused for changed evidence or review",
    );
  }
  const result = projectResearchDisclosure(
    options.context,
    descriptors,
    researchPayloads,
    policy,
    candidates,
    payloads,
  );
  assert(
    result.privateDecision.decisions.length === candidates.length &&
      result.privateDecision.decisions.every(
        (d) => d.status === "included-in-draft",
      ),
    "Every registration requires accepted exact evidence and review",
  );
  const accepted = new Map(
    result.privateDecision.decisions.map((d) => [d.candidateId, d]),
  );
  for (const c of candidates) {
    const registration = bindResearchCandidateRevision(
      state,
      options.context,
      descriptors,
      policy,
      c,
      accepted.get(c.candidateId).reviewedAt,
    );
    existing.set(c.candidateId, {
      candidateId: c.candidateId,
      metadataDigest: metadataDigest(c, policy),
      candidateArtifactHash: c.artifactHash,
      receiptArtifactHash: c.receiptHash,
      registration,
    });
  }
  const control = {
    ...previous.control,
    registrations: [...existing.values()].sort((a, b) =>
      a.candidateId < b.candidateId ? -1 : 1,
    ),
  };
  validateControl(control, options.context, scope);
  if (stableJson(control) === stableJson(previous.control)) return previous;
  await worker(
    "replace",
    options,
    scope,
    expectedRevision,
    encrypt(options.key, scope, expectedRevision + 1, control),
  );
  return { revision: expectedRevision + 1, control };
}
/** Read the latest private registry before historical payload acquisition. */
export async function planStoredResearchDisclosure(
  options,
  descriptors,
  policy,
  candidates,
) {
  const stored = await readResearchControlStore(options),
    ids = new Set(candidates.map((c) => c.candidateId));
  const registrations = stored.control.registrations
    .filter((r) => ids.has(r.candidateId))
    .map((r) => r.registration);
  const plan = planResearchAtRevision(
    stored.control.state,
    options.context,
    descriptors,
    policy,
    candidates,
    registrations,
  );
  const retired = new Set(stored.control.retiredArtifactHashes);
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i],
      support = new Set(c.supportBindings.map((b) => b.recordId));
    if (
      retired.has(c.artifactHash) ||
      retired.has(c.receiptHash) ||
      descriptors.some(
        (d) => support.has(d.recordId) && retired.has(d.artifactHash),
      )
    ) {
      plan.candidates[i].fetchEligible = false;
      plan.candidates[i].reasons = [
        ...new Set([...plan.candidates[i].reasons, "retired-artifact"]),
      ].sort();
    }
  }
  return { revision: stored.revision, plan };
}

/** Private metadata gate shared by stored registration, acquisition and report assembly. */
export function assertUnretiredResearchArtifacts(
  control,
  descriptors,
  candidates,
) {
  assert(
    Array.isArray(descriptors) &&
      descriptors.length <= 10000 &&
      Array.isArray(candidates) &&
      candidates.length <= 1000,
    "Research artifact metadata limit",
  );
  const retired = new Set(control.retiredArtifactHashes);
  assert(
    !descriptors.some((d) => retired.has(d.artifactHash)) &&
      !candidates.some(
        (c) => retired.has(c.artifactHash) || retired.has(c.receiptHash),
      ),
    "Retired artifact cannot be reacquired under another identity",
  );
}
