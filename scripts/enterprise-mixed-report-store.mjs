import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { dirname, resolve } from "node:path";
import { runPrivateControlOperation as worker } from "./private-control-transport.mjs";
import { loadVerifiedGeneratedReportChain } from "./enterprise-report-provenance.mjs";
import { buildStoredGeneratedV2Draft } from "./enterprise-history-v2-draft.mjs";
import { renderPrivateEnterpriseHistoryV2 } from "./enterprise-history-v2-view.mjs";
import {
  inspectResearchContentEdition,
  readResearchContentForAssembly,
} from "./enterprise-journeys/research-content-store.mjs";
import { validateResearchDraftArtifacts } from "./enterprise-journeys/research-report.mjs";
import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";

const namespace = "enterprise-mixed-membership-v1";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
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
  assert(timestampValue(value), "Invalid mixed authority clock");
  return Date.parse(value);
};
function snapshot(o) {
  exact(o, ["directory", "key", "context", "authority"], "mixed options");
  assert(
    Buffer.isBuffer(o.key) && o.key.length === 32,
    "Mixed membership key required",
  );
  return {
    directory: o.directory,
    key: Buffer.from(o.key),
    context: globalThis.structuredClone(o.context),
    authority: globalThis.structuredClone(o.authority),
  };
}
function authorize(o, operation) {
  exact(
    o.context,
    ["customerId", "recipientId", "purposeDigest", "editionId", "assessmentAt"],
    "mixed context",
  );
  assert(
    id(o.context.customerId) &&
      id(o.context.recipientId) &&
      id(o.context.editionId) &&
      hash(o.context.purposeDigest) &&
      typeof o.directory === "string" &&
      resolve(o.directory) === o.directory,
    "Invalid mixed scope",
  );
  const scope = enterpriseDigest({
    namespace,
    customerId: o.context.customerId,
    recipientId: o.context.recipientId,
    purposeDigest: o.context.purposeDigest,
    editionId: o.context.editionId,
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
    "mixed authority",
  );
  assert(
    a.scopeDigest === scope &&
      a.directory === o.directory &&
      a.stagingDirectory === dirname(o.directory) &&
      a.artifactClass === "mixed-report-membership" &&
      a.operation === operation &&
      a.allowed === true,
    "Scoped mixed authority required",
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
    "Mixed authority expired or stale",
  );
  assert(
    a.retainUntil === null || time(a.retainUntil) > at,
    "Invalid mixed retention",
  );
  if (operation === "create")
    assert(a.retainUntil !== null, "Mixed retention authority required");
  return scope;
}
function authorizeGenerated(o, grant, bindings) {
  exact(
    grant,
    [
      "customerId",
      "recipientId",
      "purposeDigest",
      "bindingsDigest",
      "artifactClass",
      "operation",
      "allowed",
      "observedAt",
      "validUntil",
      "maxAgeSeconds",
    ],
    "generated source authority",
  );
  const at = time(o.context.assessmentAt),
    observed = time(grant.observedAt);
  assert(
    grant.customerId === o.context.customerId &&
      grant.recipientId === o.context.recipientId &&
      grant.purposeDigest === o.context.purposeDigest &&
      grant.bindingsDigest === enterpriseDigest(bindings) &&
      grant.artifactClass === "generated-report-source" &&
      grant.operation === "read" &&
      grant.allowed === true,
    "Scoped generated source authority required",
  );
  assert(
    Number.isSafeInteger(grant.maxAgeSeconds) &&
      grant.maxAgeSeconds > 0 &&
      grant.maxAgeSeconds <= 31622400 &&
      observed <= at &&
      at < time(grant.validUntil) &&
      at < observed + grant.maxAgeSeconds * 1000,
    "Generated source authority expired or stale",
  );
}
function snapshotVault(v) {
  exact(v, ["directory", "key", "context", "authority"], "member options");
  assert(Buffer.isBuffer(v.key) && v.key.length === 32, "Member key required");
  return {
    directory: v.directory,
    key: Buffer.from(v.key),
    context: globalThis.structuredClone(v.context),
    authority: globalThis.structuredClone(v.authority),
  };
}
function snapshotMembers(members, o) {
  assert(
    Array.isArray(members) && members.length <= 20,
    "Invalid mixed membership",
  );
  const seen = new Set();
  return members.map((member) => {
    exact(
      member,
      [
        "memberId",
        "role",
        "inspectOptions",
        "readOptions",
        "expectedStoreRevision",
        "researchOptions",
        "currentResearchRevision",
      ],
      "mixed member access",
    );
    assert(
      id(member.memberId) &&
        !seen.has(member.memberId) &&
        ["current", "historical"].includes(member.role) &&
        Number.isSafeInteger(member.expectedStoreRevision) &&
        member.expectedStoreRevision > 0 &&
        Number.isSafeInteger(member.currentResearchRevision) &&
        member.currentResearchRevision > 0,
      "Invalid mixed member identity",
    );
    seen.add(member.memberId);
    const inspectOptions = snapshotVault(member.inspectOptions),
      readOptions = snapshotVault(member.readOptions),
      researchOptions = snapshotVault(member.researchOptions);
    assert(
      inspectOptions.directory === readOptions.directory &&
        inspectOptions.key.equals(readOptions.key) &&
        stableJson(inspectOptions.context) ===
          stableJson(readOptions.context) &&
        inspectOptions.context.customerId === o.context.customerId &&
        inspectOptions.context.recipientId === o.context.recipientId &&
        inspectOptions.context.purposeDigest === o.context.purposeDigest &&
        inspectOptions.context.assessmentAt === o.context.assessmentAt &&
        researchOptions.context.assessmentAt === o.context.assessmentAt,
      "Mixed member scope mismatch",
    );
    return {
      memberId: member.memberId,
      role: member.role,
      inspectOptions,
      readOptions,
      expectedStoreRevision: member.expectedStoreRevision,
      researchOptions,
      currentResearchRevision: member.currentResearchRevision,
    };
  });
}
const aad = (scope, revision) =>
  Buffer.from(stableJson({ namespace, scope, revision }));
function encrypt(o, scope, revision, metadata) {
  const bytes = Buffer.from(stableJson(metadata));
  assert(
    bytes.length <= 4 * 1024 * 1024,
    "Mixed membership byte limit exceeded",
  );
  try {
    const nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", o.key, nonce);
    cipher.setAAD(aad(scope, revision));
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return stableJson({
      nonce: nonce.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    });
  } finally {
    bytes.fill(0);
  }
}
function decrypt(o, scope, revision, raw) {
  try {
    assert(
      typeof raw === "string" && Buffer.byteLength(raw) <= 6 * 1024 * 1024,
      "Invalid membership envelope",
    );
    const value = JSON.parse(raw);
    exact(value, ["nonce", "tag", "ciphertext"], "membership ciphertext");
    const nonce = Buffer.from(value.nonce, "base64"),
      tag = Buffer.from(value.tag, "base64");
    assert(
      nonce.length === 12 &&
        tag.length === 16 &&
        typeof value.ciphertext === "string",
      "Invalid membership ciphertext",
    );
    const cipher = createDecipheriv("aes-256-gcm", o.key, nonce);
    cipher.setAAD(aad(scope, revision));
    cipher.setAuthTag(tag);
    const bytes = Buffer.concat([
      cipher.update(Buffer.from(value.ciphertext, "base64")),
      cipher.final(),
    ]);
    try {
      return JSON.parse(bytes.toString("utf8"));
    } finally {
      bytes.fill(0);
    }
  } catch {
    throw Error("Mixed membership authentication failed");
  }
}
async function generated(bindings, o) {
  assert(
    Array.isArray(bindings) && bindings.length >= 1 && bindings.length <= 33,
    "Invalid generated source chain",
  );
  if (bindings.length > 1) {
    const result = await buildStoredGeneratedV2Draft(bindings);
    assert(
      result.envelope.current.assessment.customerId === o.context.customerId &&
        Date.parse(result.envelope.current.generatedAt) <=
          time(o.context.assessmentAt),
      "Generated report scope mismatch",
    );
    return { envelope: result.envelope, provenance: result.privateProvenance };
  }
  const verified = await loadVerifiedGeneratedReportChain(bindings);
  const report = verified.entries[0].report;
  assert(
    report.parentReportDigest === null &&
      report.assessment.customerId === o.context.customerId &&
      Date.parse(report.generatedAt) <= time(o.context.assessmentAt),
    "Generated report scope mismatch",
  );
  return {
    envelope: {
      schemaFamily: "enterprise-report",
      schemaVersion: 2,
      edition: "customer",
      current: report,
      history: {
        sources: [],
        entries: [],
        withheld: null,
        coverage: "declared-partial",
      },
    },
    provenance: verified.provenance,
  };
}
async function inspect(member) {
  return inspectResearchContentEdition(
    member.inspectOptions,
    member.expectedStoreRevision,
    member.researchOptions,
    member.currentResearchRevision,
  );
}
async function acquire(member) {
  return readResearchContentForAssembly(
    member.readOptions,
    member.expectedStoreRevision,
    member.researchOptions,
    member.currentResearchRevision,
  );
}
function matchAccess(member, binding, o) {
  assert(
    member.memberId === binding.memberId &&
      member.role === binding.role &&
      member.inspectOptions.directory === binding.binding.contentDirectory &&
      member.inspectOptions.authority.scopeDigest ===
        binding.binding.contentScopeDigest &&
      member.researchOptions.directory === binding.binding.researchDirectory &&
      member.inspectOptions.context.customerId === o.context.customerId &&
      member.inspectOptions.context.recipientId === o.context.recipientId &&
      member.inspectOptions.context.purposeDigest === o.context.purposeDigest,
    "Mixed membership access mismatch",
  );
}
function consistency(members) {
  const controls = new Map();
  for (const m of members) {
    const key = m.researchOptions.directory,
      state = stableJson({
        revision: m.currentResearchRevision,
        context: m.researchOptions.context,
        key: m.researchOptions.key.toString("base64"),
      });
    assert(
      !controls.has(key) || controls.get(key) === state,
      "Conflicting research controller snapshots",
    );
    controls.set(key, state);
  }
}
async function readMembership(o, scope, expected) {
  assert(
    Number.isSafeInteger(expected) && expected > 0,
    "Expected mixed revision required",
  );
  const stored = await worker("read", o, scope, null, null);
  assert(stored.revision === expected, "Mixed storage revision changed");
  const m = decrypt(o, scope, stored.revision, stored.envelope);
  exact(
    m,
    [
      "schemaFamily",
      "schemaVersion",
      "scope",
      "editionId",
      "createdAt",
      "retainUntil",
      "generatedBindings",
      "generatedDigest",
      "generatedProvenanceDigest",
      "members",
      "predecessor",
    ],
    "mixed membership",
  );
  assert(
    m.schemaFamily === "private-mixed-membership" &&
      m.schemaVersion === 1 &&
      m.scope === scope &&
      m.editionId === o.context.editionId &&
      m.predecessor === null &&
      time(m.createdAt) <= time(o.context.assessmentAt) &&
      time(o.context.assessmentAt) < time(m.retainUntil) &&
      hash(m.generatedDigest) &&
      hash(m.generatedProvenanceDigest) &&
      Array.isArray(m.members) &&
      m.members.length <= 20,
    "Invalid or expired mixed membership",
  );
  return { revision: stored.revision, membership: m };
}
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const escapeMd = (s) =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/[[\]<>`*_{}|]/g, (c) => `\\${c}`)
    .replace(/[\r\n]+/g, " ");
const sha = (s) => createHash("sha256").update(s).digest("hex");
function render(generatedEnvelope, research, withheld) {
  const base = renderPrivateEnterpriseHistoryV2(generatedEnvelope);
  const report = {
    schemaFamily: "enterprise-mixed-report",
    schemaVersion: 1,
    edition: "customer-draft",
    generated: generatedEnvelope,
    research: {
      scope: "visible-authorized-subset",
      withheld,
      editions: research,
    },
  };
  const text = withheld
    ? "Some restricted content is withheld."
    : "Only currently permitted research material is shown.";
  const fields = [
    "taskContext",
    "summary",
    "limitation",
    "recommendation",
    "retest",
  ];
  const blocks = research.flatMap((edition, i) =>
    edition.items.map((item, j) => ({
      title: `Research ${i + 1}.${j + 1} · ${edition.role} · ${item.kind}`,
      fields: [
        ["assessmentDate", edition.assessmentDate],
        ["synthetic", String(edition.synthetic)],
        ["reviewType", item.reviewType],
        ...fields.map((key) => [key, item[key]]),
        ...edition.limitations.map((value) => ["scope limitation", value]),
      ],
    })),
  );
  const markdown = `${base.markdown}\n## Research observations\n\n${text}\n\n${blocks.length ? blocks.map((block) => `### ${escapeMd(block.title)}\n\n${block.fields.map(([key, value]) => `- **${escapeMd(key)}:** ${escapeMd(value)}`).join("\n")}`).join("\n\n") : "No permitted research observations shown."}\n`;
  const section = `<section id="mixed-research" aria-labelledby="mixed-research-title"><h2 id="mixed-research-title">Research observations</h2><p>${escapeHtml(text)}</p>${blocks.length ? blocks.map((block) => `<article><h3>${escapeHtml(block.title)}</h3>${block.fields.map(([key, value]) => `<p><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`).join("")}</article>`).join("") : "<p>No permitted research observations shown.</p>"}</section>`;
  assert(
    base.html.includes("</nav>") && base.html.includes("</main>"),
    "Unsupported mixed HTML projection",
  );
  const html = base.html
    .replace(
      "</nav>",
      '<a href="#mixed-research">Research observations</a></nav>',
    )
    .replace("</main>", `${section}</main>`);
  const json = stableJson(report) + "\n";
  const manifest =
    stableJson({
      schemaFamily: "private-mixed-view-manifest",
      schemaVersion: 1,
      files: {
        "report.json": sha(json),
        "report.md": sha(markdown),
        "report.html": sha(html),
      },
    }) + "\n";
  return { json, markdown, html, manifest };
}

/** Initial declared-scope membership only. The trusted host authenticates grants,
 * controller choice and clock. This writes encrypted metadata, not report text. */
export async function createMixedReportStore(options, request) {
  const o = snapshot(options),
    scope = authorize(o, "create");
  exact(
    request,
    ["generatedBindings", "sourceGrant", "researchMembers", "predecessor"],
    "mixed build request",
  );
  assert(
    request.predecessor === null,
    "Mixed predecessor revisions are not supported",
  );
  const bindings = globalThis.structuredClone(request.generatedBindings),
    grant = globalThis.structuredClone(request.sourceGrant),
    members = snapshotMembers(request.researchMembers, o);
  assert(
    members.every((member) => member.role === "current"),
    "Initial mixed edition cannot assert unverified historical research",
  );
  authorizeGenerated(o, grant, bindings);
  consistency(members);
  const states = await Promise.all(members.map(inspect));
  assert(
    states.every((state) => state.status === "available"),
    "Initial research membership must be available",
  );
  const generatedReport = await generated(bindings, o);
  const records = [],
    aliases = new Set();
  for (const member of members) {
    const result = await acquire(member),
      binding = result.privateBinding;
    assert(
      binding.customerId === o.context.customerId &&
        binding.recipientId === o.context.recipientId &&
        binding.purposeDigest === o.context.purposeDigest &&
        time(o.authority.retainUntil) <= time(binding.retainUntil),
      "Mixed membership retention or scope mismatch",
    );
    const identity = enterpriseDigest({
      report: result.privateProvenance.reportDigest,
      manifest: result.privateProvenance.manifestDigest,
      controller: binding.researchScopeDigest,
    });
    assert(!aliases.has(identity), "Duplicate research edition alias");
    aliases.add(identity);
    records.push({
      memberId: member.memberId,
      role: member.role,
      binding,
      provenance: result.privateProvenance,
      editionIdentity: identity,
    });
  }
  const membership = {
    schemaFamily: "private-mixed-membership",
    schemaVersion: 1,
    scope,
    editionId: o.context.editionId,
    createdAt: o.context.assessmentAt,
    retainUntil: o.authority.retainUntil,
    generatedBindings: bindings,
    generatedDigest: enterpriseDigest(generatedReport.envelope),
    generatedProvenanceDigest: enterpriseDigest(generatedReport.provenance),
    members: records,
    predecessor: null,
  };
  const finalStates = await Promise.all(members.map(inspect));
  assert(
    finalStates.every((state) => state.status === "available"),
    "Research eligibility changed during mixed build",
  );
  const replayed = await generated(bindings, o);
  assert(
    enterpriseDigest(replayed.envelope) === membership.generatedDigest &&
      enterpriseDigest(replayed.provenance) ===
        membership.generatedProvenanceDigest,
    "Generated source changed during mixed build",
  );
  await worker("create", o, scope, null, encrypt(o, scope, 1, membership));
  try {
    const after = await Promise.all(members.map(inspect));
    assert(
      after.every((state) => state.status === "available"),
      "Research eligibility changed",
    );
    const replay = await generated(bindings, o);
    assert(
      enterpriseDigest(replay.envelope) === membership.generatedDigest &&
        enterpriseDigest(replay.provenance) ===
          membership.generatedProvenanceDigest,
      "Generated source changed",
    );
  } catch {
    throw Error(
      "Mixed membership may be committed but sources changed; read before cleanup",
    );
  }
  return {
    revision: 1,
    disclosureAuthorized: false,
    deliveryAuthorized: false,
  };
}

/** Replays sources and projects only permitted research; no delivery authority. */
export async function readMixedReportStore(
  options,
  expectedRevision,
  sourceGrant,
  access,
) {
  const o = snapshot(options),
    scope = authorize(o, "read"),
    grant = globalThis.structuredClone(sourceGrant),
    members = snapshotMembers(access, o);
  consistency(members);
  const stored = await readMembership(o, scope, expectedRevision),
    membership = stored.membership;
  authorizeGenerated(o, grant, membership.generatedBindings);
  assert(
    members.length === membership.members.length,
    "Mixed membership access incomplete",
  );
  const indexed = new Map(members.map((member) => [member.memberId, member]));
  const ordered = membership.members.map((record) => {
    const member = indexed.get(record.memberId);
    assert(member, "Mixed membership access incomplete");
    matchAccess(member, record, o);
    return member;
  });
  const states = await Promise.all(ordered.map(inspect));
  const permitted = [],
    withheld = states.some((state) => state.status === "withheld");
  for (let i = 0; i < ordered.length; i++) {
    if (states[i].status === "withheld") continue;
    assert(
      states[i].status === "available",
      "Unsupported research availability",
    );
    const result = await acquire(ordered[i]),
      record = membership.members[i];
    assert(
      enterpriseDigest(result.privateBinding) ===
        enterpriseDigest(record.binding) &&
        enterpriseDigest(result.privateProvenance) ===
          enterpriseDigest(record.provenance),
      "Research edition binding changed",
    );
    const draft = validateResearchDraftArtifacts(result.artifacts);
    permitted.push({
      role: record.role,
      assessmentDate: draft.assessmentDate,
      synthetic: draft.synthetic,
      limitations: draft.limitations,
      items: draft.items.map(
        ({
          kind,
          taskContext,
          summary,
          limitation,
          recommendation,
          retest,
          reviewType,
        }) => ({
          kind,
          taskContext,
          summary,
          limitation,
          recommendation,
          retest,
          reviewType,
        }),
      ),
    });
  }
  const report = await generated(membership.generatedBindings, o);
  assert(
    enterpriseDigest(report.envelope) === membership.generatedDigest &&
      enterpriseDigest(report.provenance) ===
        membership.generatedProvenanceDigest,
    "Generated report binding changed",
  );
  const artifacts = render(report.envelope, permitted, withheld);
  const finalStates = await Promise.all(ordered.map(inspect));
  assert(
    stableJson(finalStates) === stableJson(states),
    "Research availability changed during mixed read",
  );
  const replay = await generated(membership.generatedBindings, o);
  assert(
    enterpriseDigest(replay.envelope) === membership.generatedDigest &&
      enterpriseDigest(replay.provenance) ===
        membership.generatedProvenanceDigest,
    "Generated report changed during mixed read",
  );
  const latest = await worker("read", o, scope, null, null);
  assert(latest.revision === stored.revision, "Mixed storage revision changed");
  return {
    artifacts,
    revision: stored.revision,
    disclosureAuthorized: false,
    deliveryAuthorized: false,
  };
}
