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
function validateControl(control, context, scope) {
  shape(control, ["schemaVersion", "state", "registrations"]);
  assert(
    control.schemaVersion === 1 &&
      Array.isArray(control.registrations) &&
      control.registrations.length === 0,
    "Unsupported control-store content",
  );
  // Validates stored state without silently replacing its access history.
  advanceResearchAccessState(
    control.state,
    enterpriseDigest(control.state),
    context,
  );
  assert(
    enterpriseDigest(control.state.scope) === scope,
    "Stored research scope mismatch",
  );
}
export async function createResearchControlStore(options) {
  const { initial, scope } = authorize(options),
    control = { schemaVersion: 1, state: initial, registrations: [] };
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
  const control = decrypt(options.key, scope, record.revision, record.envelope);
  validateControl(control, options.context, scope);
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
  const control = { schemaVersion: 1, state, registrations: [] };
  await worker(
    "replace",
    options,
    scope,
    expectedRevision,
    encrypt(options.key, scope, expectedRevision + 1, control),
  );
  return { revision: expectedRevision + 1, control };
}
