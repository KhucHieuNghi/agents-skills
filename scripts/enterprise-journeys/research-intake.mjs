import {
  enterpriseDigest,
  stableJson,
  timestampValue,
} from "../../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const shape = (v, keys) =>
  assert(
    v &&
      Object.getPrototypeOf(v) === Object.prototype &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid research metadata shape",
  );
const id = (v) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const text = (v) =>
  typeof v === "string" && v.length > 0 && v.length <= 2048 && v.isWellFormed();
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const time = (v) => {
  assert(timestampValue(v), "Invalid research timestamp");
  return Date.parse(v);
};
const list = (v, max = 1000) =>
  assert(Array.isArray(v) && v.length <= max, "Research metadata count limit");
const directKinds = ["observed-behavior", "participant-statement"];
const uniqueIds = (v, max = 1000) => {
  list(v, max);
  assert(
    v.every(id) && new Set(v).size === v.length,
    "Invalid or duplicate research identifiers",
  );
};

function validate(c) {
  shape(c, [
    "customerId",
    "entityId",
    "studyId",
    "recipientId",
    "assessmentAt",
    "maxAccessAgeSeconds",
    "protocol",
    "protocolDigest",
    "access",
  ]);
  for (const k of ["customerId", "entityId", "studyId", "recipientId"])
    assert(id(c[k]), "Invalid research scope");
  time(c.assessmentAt);
  assert(
    Number.isSafeInteger(c.maxAccessAgeSeconds) &&
      c.maxAccessAgeSeconds > 0 &&
      c.maxAccessAgeSeconds <= 31622400,
    "Invalid access freshness",
  );
  const p = c.protocol;
  shape(p, [
    "version",
    "purpose",
    "method",
    "recruitment",
    "targetPopulation",
    "sampling",
    "identityPolicy",
    "allowCrossSessionInference",
    "participants",
    "tasks",
    "prompts",
    "sessions",
  ]);
  assert(
    p.version === 1 && hash(c.protocolDigest),
    "Research protocol mismatch",
  );
  for (const k of [
    "purpose",
    "method",
    "recruitment",
    "targetPopulation",
    "identityPolicy",
  ])
    assert(text(p[k]), "Missing research protocol definition");
  assert(
    ["convenience", "purposive", "probability-declared"].includes(p.sampling) &&
      typeof p.allowCrossSessionInference === "boolean",
    "Invalid research sampling/inference policy",
  );
  for (const k of ["participants", "tasks", "prompts", "sessions"]) list(p[k]);
  assert(
    p.participants.length && p.tasks.length && p.sessions.length,
    "Research manifest required",
  );
  const participants = new Map(),
    aliases = new Map(),
    tasks = new Map(),
    sessions = new Map(),
    prompts = new Map();
  for (const person of p.participants) {
    shape(person, ["participantId", "aliases"]);
    assert(
      id(person.participantId) && !participants.has(person.participantId),
      "Invalid participant identity",
    );
    uniqueIds(person.aliases, 100);
    for (const alias of [person.participantId, ...person.aliases]) {
      assert(!aliases.has(alias), "Ambiguous participant alias");
      aliases.set(alias, person.participantId);
    }
    participants.set(person.participantId, person);
  }
  for (const t of p.tasks) {
    shape(t, ["taskId", "instructions", "requiredKinds"]);
    assert(
      id(t.taskId) && !tasks.has(t.taskId) && text(t.instructions),
      "Invalid research task",
    );
    uniqueIds(t.requiredKinds, 2);
    assert(
      t.requiredKinds.length &&
        t.requiredKinds.every((k) => directKinds.includes(k)),
      "Invalid required evidence kinds",
    );
    tasks.set(t.taskId, t);
  }
  for (const prompt of p.prompts) {
    shape(prompt, ["promptId", "taskId", "text"]);
    assert(
      id(prompt.promptId) &&
        !prompts.has(prompt.promptId) &&
        (prompt.taskId === null || tasks.has(prompt.taskId)) &&
        text(prompt.text),
      "Invalid moderator prompt",
    );
    prompts.set(prompt.promptId, prompt);
  }
  for (const s of p.sessions) {
    shape(s, ["sessionId", "participantId", "taskIds", "startedAt", "endedAt"]);
    uniqueIds(s.taskIds, 100);
    assert(
      id(s.sessionId) &&
        !sessions.has(s.sessionId) &&
        participants.has(s.participantId) &&
        s.taskIds.length &&
        s.taskIds.every((k) => tasks.has(k)) &&
        time(s.startedAt) < time(s.endedAt) &&
        time(s.endedAt) <= time(c.assessmentAt),
      "Invalid research session",
    );
    sessions.set(s.sessionId, s);
  }
  list(c.access);
  const access = new Map();
  const expectedScope = {
    customerId: c.customerId,
    entityId: c.entityId,
    studyId: c.studyId,
    recipientId: c.recipientId,
    protocolDigest: c.protocolDigest,
    purposeDigest: enterpriseDigest(p.purpose),
  };
  for (const a of c.access) {
    shape(a, [
      "participantId",
      "scope",
      "analysisAllowed",
      "customerSummaryAllowed",
      "stateObservedAt",
      "validUntil",
      "evidenceDigest",
    ]);
    assert(
      participants.has(a.participantId) &&
        !access.has(a.participantId) &&
        hash(a.evidenceDigest),
      "Invalid access identity/evidence",
    );
    shape(a.scope, Object.keys(expectedScope));
    for (const k of Object.keys(expectedScope))
      assert(text(a.scope[k]), "Invalid access scope");
    assert(
      [true, false, null].includes(a.analysisAllowed) &&
        [true, false, null].includes(a.customerSummaryAllowed) &&
        time(a.stateObservedAt) <= time(c.assessmentAt) &&
        time(a.validUntil) >= time(a.stateObservedAt),
      "Invalid access state",
    );
    access.set(a.participantId, a);
  }
  const permission = (participant) => {
    const a = access.get(participant),
      reasons = [];
    if (!a) reasons.push("missing-access-state");
    else {
      if (stableJson(a.scope) !== stableJson(expectedScope))
        reasons.push("access-scope-mismatch");
      if (time(a.validUntil) <= time(c.assessmentAt))
        reasons.push("access-expired");
      if (
        time(a.stateObservedAt) + c.maxAccessAgeSeconds * 1000 <=
        time(c.assessmentAt)
      )
        reasons.push("access-state-stale");
      if (a.analysisAllowed !== true)
        reasons.push(
          a.analysisAllowed === false
            ? "analysis-disallowed"
            : "analysis-access-unproven",
        );
    }
    return {
      eligible: reasons.length === 0,
      sharing: reasons.length === 0 && a.customerSummaryAllowed === true,
      reasons,
    };
  };
  assert(
    enterpriseDigest(p) === c.protocolDigest,
    "Research protocol digest mismatch",
  );
  return { participants, aliases, tasks, sessions, prompts, permission };
}

/** Private metadata-only preflight. Do not supply record text or source bytes here. */
export function planResearchIntake(context, descriptors) {
  const m = validate(context);
  list(descriptors, 10000);
  const sourceIds = new Set(),
    groups = new Map(),
    normalized = [];
  for (const d of descriptors) {
    shape(d, [
      "scope",
      "sourceId",
      "recordId",
      "kind",
      "sessionId",
      "participantAlias",
      "taskId",
      "promptId",
      "observedAt",
      "capturedAt",
      "supportingRecordIds",
      "artifactHash",
    ]);
    shape(d.scope, ["customerId", "entityId", "studyId", "protocolDigest"]);
    assert(
      Object.keys(d.scope).every((k) => d.scope[k] === context[k]),
      "Research descriptor scope mismatch",
    );
    assert(
      id(d.sourceId) &&
        !sourceIds.has(d.sourceId) &&
        id(d.recordId) &&
        hash(d.artifactHash) &&
        [...directKinds, "analyst-inference"].includes(d.kind),
      "Invalid research descriptor identity",
    );
    sourceIds.add(d.sourceId);
    assert(
      time(d.observedAt) <= time(d.capturedAt) &&
        time(d.capturedAt) <= time(context.assessmentAt),
      "Invalid research record chronology",
    );
    uniqueIds(d.supportingRecordIds, 100);
    let participantId = null;
    if (directKinds.includes(d.kind)) {
      const s = m.sessions.get(d.sessionId);
      participantId = m.aliases.get(d.participantAlias);
      assert(
        s &&
          participantId === s.participantId &&
          s.taskIds.includes(d.taskId) &&
          time(d.observedAt) >= time(s.startedAt) &&
          time(d.observedAt) <= time(s.endedAt) &&
          d.supportingRecordIds.length === 0,
        "Research record/session mismatch",
      );
      assert(
        d.promptId === null ||
          (m.prompts.has(d.promptId) &&
            [null, d.taskId].includes(m.prompts.get(d.promptId).taskId)),
        "Unbound moderator prompt",
      );
    } else
      assert(
        d.sessionId === null &&
          d.participantAlias === null &&
          d.promptId === null &&
          (d.taskId === null || m.tasks.has(d.taskId)) &&
          d.supportingRecordIds.length > 0 &&
          !d.supportingRecordIds.includes(d.recordId),
        "Invalid inference dependencies",
      );
    const record = { ...globalThis.structuredClone(d), participantId };
    normalized.push(record);
    if (!groups.has(d.recordId)) groups.set(d.recordId, []);
    groups.get(d.recordId).push(record);
  }
  const signatures = (record) =>
    enterpriseDigest({
      recordId: record.recordId,
      kind: record.kind,
      sessionId: record.sessionId,
      participantId: record.participantId,
      taskId: record.taskId,
      promptId: record.promptId,
      observedAt: record.observedAt,
      supportingRecordIds: [...record.supportingRecordIds].sort(),
    });
  const conflicts = new Set(
    [...groups]
      .filter(([, records]) => new Set(records.map(signatures)).size > 1)
      .map(([key]) => key),
  );
  // Acquisition is record-isolated. Hash aliases for one record are fine;
  // a shared artifact containing multiple records cannot be fetched here.
  const artifactRecords = new Map();
  for (const record of normalized) {
    if (!artifactRecords.has(record.artifactHash))
      artifactRecords.set(record.artifactHash, new Set());
    artifactRecords.get(record.artifactHash).add(record.recordId);
  }
  const nonisolated = new Set(
    normalized
      .filter((record) => artifactRecords.get(record.artifactHash).size > 1)
      .map((record) => record.recordId),
  );
  const decisions = new Map();
  for (const [recordId, records] of groups) {
    const first = records[0];
    if (nonisolated.has(recordId))
      decisions.set(recordId, {
        eligible: false,
        sharing: false,
        reasons: ["record-isolated-artifact-required"],
        participants: [],
      });
    else if (conflicts.has(recordId))
      decisions.set(recordId, {
        eligible: false,
        sharing: false,
        reasons: ["conflicting-record-metadata"],
        participants: [],
      });
    else if (directKinds.includes(first.kind))
      decisions.set(recordId, {
        ...m.permission(first.participantId),
        participants: [first.participantId],
      });
  }
  for (const [recordId, records] of groups) {
    if (decisions.has(recordId)) continue;
    const first = records[0],
      reasons = [],
      participantSet = new Set(),
      sessionSet = new Set();
    let sharing = true;
    for (const supportId of first.supportingRecordIds) {
      const support = groups.get(supportId)?.[0],
        decision = decisions.get(supportId);
      if (
        !support ||
        !directKinds.includes(support.kind) ||
        !decision?.eligible
      ) {
        reasons.push("unavailable-direct-dependency");
        continue;
      }
      if (first.taskId !== null && support.taskId !== first.taskId)
        reasons.push("inference-task-scope-mismatch");
      if (time(first.observedAt) < time(support.observedAt))
        reasons.push("inference-predates-observation");
      participantSet.add(support.participantId);
      sessionSet.add(support.sessionId);
      sharing &&= decision.sharing;
    }
    if (sessionSet.size > 1 && !context.protocol.allowCrossSessionInference)
      reasons.push("cross-session-inference-not-declared");
    decisions.set(recordId, {
      eligible: reasons.length === 0,
      sharing: reasons.length === 0 && sharing,
      reasons: [...new Set(reasons)],
      participants: [...participantSet],
    });
  }
  const sources = normalized.map((d) => {
    const p = decisions.get(d.recordId);
    return {
      sourceId: d.sourceId,
      recordId: d.recordId,
      artifactHash: d.artifactHash,
      descriptorDigest: enterpriseDigest(d),
      fetchEligible: p.eligible,
      customerSummaryEligible: p.sharing,
      reasons: p.reasons,
    };
  });
  const coverage = [],
    dataRequests = [];
  for (const s of m.sessions.values())
    for (const taskId of s.taskIds)
      for (const kind of m.tasks.get(taskId).requiredKinds) {
        const records = normalized.filter(
            (d) =>
              d.sessionId === s.sessionId &&
              d.taskId === taskId &&
              d.kind === kind,
          ),
          p = m.permission(s.participantId);
        const eligible = records.filter(
          (d) => decisions.get(d.recordId).eligible,
        );
        const state = !p.eligible
          ? "withheld"
          : eligible.length
            ? "metadata-supplied-content-unverified"
            : records.length
              ? "conflicted-or-ineligible-metadata"
              : "missing-metadata";
        coverage.push({
          sessionId: s.sessionId,
          taskId,
          kind,
          state,
          plannedParticipant: s.participantId,
          submittedDescriptors: records.length,
          eligibleRecordIdentities: new Set(eligible.map((d) => d.recordId))
            .size,
        });
        if (
          state === "missing-metadata" ||
          state === "conflicted-or-ineligible-metadata"
        )
          dataRequests.push({
            type: "missing-record-metadata",
            sessionId: s.sessionId,
            taskId,
            kind,
            reason: state,
            instructions:
              "Supply or resolve metadata for the declared session/task; do not upload raw participant text until this preflight is eligible.",
          });
        else if (state === "withheld")
          dataRequests.push({
            type: "restricted-scope-notice",
            sessionId: s.sessionId,
            taskId,
            kind,
            reason: p.reasons.join(", "),
            instructions:
              "Do not upload or re-upload restricted content. The owner must follow the applicable access/withdrawal process; this notice does not request consent reinstatement.",
          });
      }
  const eligibleParticipants = new Set(
    normalized
      .filter(
        (d) =>
          directKinds.includes(d.kind) && decisions.get(d.recordId).eligible,
      )
      .map((d) => d.participantId),
  );
  return {
    schemaVersion: 1,
    namespace: "private-research-intake-plan",
    contextDigest: enterpriseDigest(context),
    protocolDigest: context.protocolDigest,
    descriptorSetDigest: enterpriseDigest(descriptors),
    sources,
    coverage,
    dataRequests,
    accounting: {
      plannedParticipants: m.participants.size,
      plannedSessions: m.sessions.size,
      plannedCoverageCells: coverage.length,
      submittedDescriptors: descriptors.length,
      declaredRecordIdentities: groups.size,
      declaredEligibleParticipants: eligibleParticipants.size,
      withheldCoverageCells: coverage.filter((c) => c.state === "withheld")
        .length,
      missingCoverageCells: coverage.filter(
        (c) => c.state === "missing-metadata",
      ).length,
      conflictedRecordIdentities: conflicts.size,
      nonisolatedRecordIdentities: nonisolated.size,
    },
    contentVerified: false,
    studyComplete: false,
    consentAuthenticated: false,
    populationPrevalenceAccepted: false,
    semanticAcceptance: false,
    actionAuthorized: false,
    limitations: [
      "Private metadata only; do not publish participant identities or protected counts from this plan.",
      "Current scoped access is declared, not authenticated. Host/owner authorization is still required before any acquisition.",
      "Re-run preflight at every new assessment, including historical evidence. Existing exported copies cannot be recalled by this function.",
      "Eligible metadata does not validate record content, semantic claims, independent participants, sample representativeness or population prevalence.",
    ],
  };
}
