import {
  mkdtemp,
  realpath,
  writeFile,
  stat,
  lstat,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { setTimeout, clearTimeout } from "node:timers";
import { prepareChange } from "./prepare-change.mjs";
const targets = new WeakMap();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const label = (x) =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(x);
const deny = (reason) => ({ status: "denied", reason, receipt: null });
const unknown = (reason) => ({
  status: "unknown",
  reason,
  receipt: null,
  recoveryRequired: true,
});
/** Creates only a new inert fixture; arbitrary existing roots cannot be registered. */
export async function createSandboxTarget({
  assetId,
  environment,
  initialText,
}) {
  if (
    !label(assetId) ||
    environment !== "sandbox" ||
    typeof initialText !== "string" ||
    Buffer.byteLength(initialText) > 1024 * 1024
  )
    throw new Error("Invalid sandbox target");
  const parent = await realpath(tmpdir()),
    root = await mkdtemp(path.join(parent, "nkskills-remediation-"));
  try {
    await writeFile(path.join(root, "fixture.txt"), initialText, {
      flag: "wx",
      mode: 0o600,
    });
    const info = await stat(root);
    if (!Number.isSafeInteger(info.dev) || !Number.isSafeInteger(info.ino))
      throw new Error("Unsupported directory identity");
    const identity = Object.freeze([info.dev, info.ino]);
    const target = Object.freeze({
      assetId,
      environment,
      root,
      rootIdentity: identity,
    });
    targets.set(target, {
      root,
      identity,
      assetId,
      environment,
      inFlight: false,
      disposing: false,
      uncertain: false,
      attempts: new Set(),
    });
    return target;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
/** Explicit cleanup only; caller owns retention. Exclusive ownership remains a prerequisite. */
export async function disposeSandboxTarget(target) {
  const t = targets.get(target);
  if (!t) throw new Error("Unregistered sandbox target");
  if (t.inFlight || t.disposing)
    throw new Error("Sandbox operation in progress");
  t.disposing = true;
  try {
    const info = await lstat(t.root);
    if (
      !info.isDirectory() ||
      info.isSymbolicLink() ||
      info.dev !== t.identity[0] ||
      info.ino !== t.identity[1]
    )
      throw new Error("Sandbox root changed; inspect manually");
    await rm(t.root, { recursive: true });
    targets.delete(target);
  } finally {
    t.disposing = false;
  }
}
function deadline(preparation, entry, host) {
  const grant = host.trustedAuthorizations.find(
    (g) => g?.authorizationRef === preparation.authorizationRef,
  );
  const approval = host.trustedApprovals.find(
    (a) => a?.approvalRef === preparation.approvalRef,
  );
  return (
    Math.min(
      Date.parse(entry.acceptance.policy.window.start),
      ...entry.sourceEvidence.map((e) => Date.parse(e.validUntil)),
      ...[grant.expiresAt, approval.expiresAt]
        .filter((x) => x !== null)
        .map(Date.parse),
    ) / 1000
  );
}
/** Fixed text replacement in a process-supervised host-created POSIX sandbox only. */
export async function executeSandboxChange({
  target,
  afterText,
  preparation,
  refreshHostContext,
  timeoutMs = 5000,
}) {
  const t = targets.get(target);
  if (
    !t ||
    typeof afterText !== "string" ||
    Buffer.byteLength(afterText) > 1024 * 1024 ||
    typeof refreshHostContext !== "function" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 30000
  )
    return deny("invalid-sandbox-execution-input");
  if (t.disposing) return deny("sandbox-disposal-in-progress");
  if (t.inFlight) return deny("sandbox-execution-in-progress");
  if (t.uncertain)
    return { ...unknown("sandbox-recovery-required"), ...t.lastAttempt };
  let original;
  try {
    original = globalThis.structuredClone(preparation);
  } catch {
    return deny("invalid-preparation");
  }
  const first = prepareChange({ ...original, now: new Date().toISOString() });
  if (first.status !== "prepared") return deny(first.reason);
  const entry = original.plan.entries.find(
    (e) => e.changeId === original.changeId,
  );
  const bytes = Buffer.from(afterText);
  if (
    entry.binding.assetId !== t.assetId ||
    entry.binding.environment !== t.environment ||
    hash(bytes) !== entry.artifactDigest
  )
    return deny("sandbox-artifact-or-target-mismatch");
  const attemptId = randomUUID();
  const journalKey = hash(
    Buffer.from(JSON.stringify([original.plan.planDigest, original.changeId])),
  );
  let launchInput;
  try {
    launchInput =
      JSON.stringify({
        root: t.root,
        rootIdentity: t.identity,
        beforeDigest: entry.preconditionDigest,
        afterBase64: bytes.toString("base64"),
        afterDigest: entry.artifactDigest,
        validUntil: deadline(original, entry, original.hostContext),
        attempt: {
          attemptId,
          planDigest: original.plan.planDigest,
          changeId: original.changeId,
          customerId: original.plan.customerId,
          assetBindingDigest: entry.bindingDigest,
        },
      }) + "\n";
  } catch {
    return deny("invalid-sandbox-launch-input");
  }
  const attemptKey = JSON.stringify([
    original.plan.planDigest,
    original.changeId,
  ]);
  if (t.attempts.has(attemptKey))
    return deny("sandbox-attempt-already-consumed");
  t.attempts.add(attemptKey);
  t.inFlight = true;
  t.lastAttempt = { attemptId, journalKey };
  const startedAt = new Date().toISOString();
  return new Promise((resolve) => {
    let done = false,
      ready = false,
      commitSent = false,
      result = null,
      buffer = "",
      outputBytes = 0,
      forced = null;
    let child;
    try {
      child = spawn(
        "python3",
        [
          "-B",
          "-I",
          fileURLToPath(new URL("./sandbox_worker.py", import.meta.url)),
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch {
      t.inFlight = false;
      t.uncertain = true;
      resolve({
        ...unknown("sandbox-runtime-launch-failed"),
        attemptId,
        journalKey,
      });
      return;
    }
    const stop = (reason) => {
      if (done) return;
      forced = unknown(reason);
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => stop("sandbox-process-deadline"), timeoutMs);
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      t.inFlight = false;
      t.uncertain = value.status === "unknown";
      resolve({ ...value, attemptId, journalKey });
    };
    child.on("error", () => {
      forced = unknown("sandbox-runtime-unavailable");
    });
    child.stdin.on("error", () => stop("sandbox-protocol-input-failed"));
    child.stderr.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 65536) stop("sandbox-protocol-output-budget");
    });
    async function message(value) {
      if (value?.type === "ready" && !ready && !result) {
        ready = true;
        const expected = {
          target: "fixture.txt",
          rootIdentity: t.identity,
          beforeDigest: entry.preconditionDigest,
          afterDigest: entry.artifactDigest,
        };
        const request = value.request;
        if (
          !request ||
          Object.keys(request).sort().join(",") !==
            Object.keys(expected).sort().join(",") ||
          Object.entries(expected).some(
            ([key, v]) => JSON.stringify(request[key]) !== JSON.stringify(v),
          )
        )
          return stop("sandbox-ready-binding-mismatch");
        try {
          const host = globalThis.structuredClone(await refreshHostContext());
          if (done || forced) return;
          const current = {
            ...original,
            hostContext: host,
            currentPreconditionDigest: request.beforeDigest,
            now: new Date().toISOString(),
          };
          const decision = prepareChange(current);
          if (decision.status !== "prepared") {
            child.stdin.end(
              JSON.stringify({ allowed: false, validUntil: 0 }) + "\n",
            );
            return;
          }
          commitSent = true;
          child.stdin.end(
            JSON.stringify({
              allowed: true,
              validUntil: deadline(current, entry, host),
            }) + "\n",
          );
        } catch {
          if (!done && !forced)
            child.stdin.end(
              JSON.stringify({ allowed: false, validUntil: 0 }) + "\n",
            );
        }
      } else if (value?.type === "result" && !result) {
        result = value.result;
      } else stop("sandbox-protocol-sequence-invalid");
    }
    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 65536) return stop("sandbox-protocol-output-budget");
      buffer += chunk.toString("utf8");
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        try {
          void message(JSON.parse(line));
        } catch {
          stop("sandbox-protocol-invalid");
        }
      }
    });
    child.on("close", (code) => {
      if (forced) return finish(forced);
      if (code !== 0 || !result || buffer.length)
        return finish(unknown("sandbox-process-incomplete"));
      if (result.status !== "applied")
        return finish(
          result.status === "denied"
            ? {
                ...deny(result.reason),
                cleanupIncomplete: result.cleanupIncomplete === true,
              }
            : unknown("sandbox-commit-outcome-unknown"),
        );
      if (
        !commitSent ||
        result.target !== "fixture.txt" ||
        JSON.stringify(result.rootIdentity) !== JSON.stringify(t.identity) ||
        result.beforeDigest !== entry.preconditionDigest ||
        result.afterDigest !== entry.artifactDigest
      )
        return finish(unknown("sandbox-result-binding-mismatch"));
      const receipt = {
        receiptId: attemptId,
        planDigest: original.plan.planDigest,
        changeId: original.changeId,
        customerId: original.plan.customerId,
        assetBindingDigest: entry.bindingDigest,
        artifactDigest: entry.artifactDigest,
        beforeDigest: result.beforeDigest,
        afterDigest: result.afterDigest,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "applied",
      };
      finish({
        status: "applied",
        reason: "sandbox-text-replacement-verified",
        receipt,
        backend: "optional-posix-sandbox",
        productionExecution: false,
      });
    });
    try {
      child.stdin.write(launchInput);
    } catch {
      stop("sandbox-protocol-input-failed");
    }
  });
}

/** Read-only point-in-time inspection. Never consumes, repairs, or unquarantines a capability. */
export async function inspectSandboxTarget({ target, timeoutMs = 5000 }) {
  const t = targets.get(target);
  if (
    !t ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 30000
  )
    return unknown("invalid-sandbox-inspection-input");
  if (t.inFlight || t.disposing)
    return unknown("sandbox-operation-in-progress");
  t.inFlight = true;
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(
        "python3",
        [
          "-B",
          "-I",
          fileURLToPath(
            new URL("./sandbox_inspect_worker.py", import.meta.url),
          ),
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch {
      t.inFlight = false;
      resolve(unknown("sandbox-inspection-runtime-unavailable"));
      return;
    }
    let done = false,
      forced = null,
      bytes = 0,
      buffer = "";
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      t.inFlight = false;
      resolve({
        ...value,
        callerOutcomeUncertain: t.uncertain,
        lastAttempt: t.lastAttempt ? { ...t.lastAttempt } : null,
        executionAllowed: false,
        findingsResolved: false,
        productionExecution: false,
      });
    };
    const stop = (reason) => {
      if (done) return;
      forced = unknown(reason);
      child.kill("SIGKILL");
    };
    const timer = setTimeout(
      () => stop("sandbox-inspection-deadline"),
      timeoutMs,
    );
    child.on("error", () => {
      forced = unknown("sandbox-inspection-runtime-unavailable");
    });
    child.stdin.on("error", () => stop("sandbox-inspection-input-failed"));
    child.stderr.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) stop("sandbox-inspection-output-budget");
    });
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) return stop("sandbox-inspection-output-budget");
      buffer += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      if (forced) return finish(forced);
      try {
        const result = JSON.parse(buffer);
        if (
          code !== 0 ||
          result.status !== "inspected" ||
          result.schemaVersion !== 1 ||
          result.target !== "fixture.txt" ||
          JSON.stringify(result.rootIdentity) !== JSON.stringify(t.identity) ||
          !/^[a-f0-9]{64}$/.test(result.currentDigest) ||
          !Number.isFinite(result.observedAt) ||
          result.executionAllowed !== false ||
          !Array.isArray(result.records) ||
          result.records.length > 100
        )
          return finish(unknown("sandbox-inspection-unavailable"));
        finish({
          status: "inspected",
          schemaVersion: 1,
          target: result.target,
          rootIdentity: result.rootIdentity,
          observedAt: result.observedAt,
          currentDigest: result.currentDigest,
          records: result.records,
          observationOnly: true,
          receipt: null,
        });
      } catch {
        finish(unknown("sandbox-inspection-protocol-invalid"));
      }
    });
    try {
      child.stdin.end(
        JSON.stringify({ root: t.root, rootIdentity: t.identity }) + "\n",
      );
    } catch {
      stop("sandbox-inspection-input-failed");
    }
  });
}
