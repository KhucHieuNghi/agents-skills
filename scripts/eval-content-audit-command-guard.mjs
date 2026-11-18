/**
 * Author-evaluation prototype, not an installed skill or customer configuration.
 * Inspects ONE Bash tool input; never executes or rewrites the command.
 * Supported grammar: rtk proxy node <literal script.{mjs,cjs,js}> [literal args]
 * followed by optional > path and/or 2> path, once each. Words are either wholly
 * unquoted conservative ASCII tokens, wholly single quoted, or wholly double
 * quoted without expansion/escaping. No shell compounds or inline interpreters.
 *
 * This is NOT a sandbox: PATH resolution, loaded scripts, runtime dependencies,
 * redirection destinations and child processes retain ordinary host permissions
 * and require separate review. An accepted script can itself spawn processes.
 * A valid input returns NO permission grant, preserving the host permission flow.
 * Scope the hook to a single evaluation session, never global/project settings.
 * Caller MUST verify actual host hook activation and fail-on-hook-error behavior;
 * this standalone script cannot guarantee that a host invokes it or blocks a
 * missing/crashed/timed-out hook. No release gate is satisfied by this prototype.
 */
import process from "node:process";
import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";

const MAX_INPUT_BYTES = 65536;
const denied = (reason) => ({
  allowed: false,
  reason,
  scope: "bash-input-only",
  childProcessesReviewed: false,
});

function literalTokens(command) {
  const tokens = [];
  let i = 0;
  while (i < command.length) {
    if (command[i] === " " || command[i] === "\t") {
      i++;
      continue;
    }
    if (command.startsWith("2>", i) || command[i] === ">") {
      const fd = command[i] === "2" ? 2 : 1;
      i += fd === 2 ? 2 : 1;
      tokens.push({ type: "redirect", fd });
      continue;
    }
    let value = "";
    const quote = command[i];
    if (quote === "'" || quote === '"') {
      i++;
      while (i < command.length && command[i] !== quote) {
        if (quote === '"' && /[$`\\]/.test(command[i]))
          throw new Error("Expansion or escaping is unsupported");
        value += command[i++];
      }
      if (command[i] !== quote) throw new Error("Unterminated quote");
      i++;
      if (i < command.length && !/[ \t>]/.test(command[i]))
        throw new Error("Concatenated words are unsupported");
    } else {
      while (i < command.length && !/[ \t>]/.test(command[i])) {
        if (!/[A-Za-z0-9_./:@%+=,-]/.test(command[i]))
          throw new Error("Unsupported unquoted character");
        value += command[i++];
      }
      if (/^\d+$/.test(value) && command[i] === ">")
        throw new Error("Unsupported file descriptor redirect");
    }
    tokens.push({ type: "word", value });
  }
  return tokens;
}

export function inspectAuditCommand(command) {
  if (
    typeof command !== "string" ||
    command.length === 0 ||
    command.length > MAX_INPUT_BYTES
  )
    return denied("Missing or oversized Bash command");
  if (
    [...command].some(
      (char) =>
        (char.charCodeAt(0) < 32 && char !== "\t") ||
        char.charCodeAt(0) === 127,
    )
  )
    return denied("Control characters and multiline commands are unsupported");
  let tokens;
  try {
    tokens = literalTokens(command);
  } catch {
    return denied(
      "Use one direct literal command without shell composition or expansion",
    );
  }
  const argv = [],
    redirects = [];
  let redirecting = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "redirect") {
      redirecting = true;
      const destination = tokens[++i];
      if (
        !destination ||
        destination.type !== "word" ||
        !destination.value ||
        redirects.some((r) => r.fd === token.fd)
      )
        return denied(
          "Redirects require one literal destination per output descriptor",
        );
      if (/^\/dev\/(tcp|udp)(\/|$)/.test(destination.value))
        return denied("Network redirection is unsupported");
      redirects.push({ fd: token.fd, path: destination.value });
    } else {
      if (redirecting)
        return denied("Arguments after redirects are unsupported");
      argv.push(token.value);
    }
  }
  if (
    argv[0] !== "rtk" ||
    argv[1] !== "proxy" ||
    argv[2] !== "node" ||
    argv.length < 4
  )
    return denied(
      "This profile supports only direct rtk proxy node script invocations; use host file tools for other work",
    );
  if (argv[3].startsWith("-") || !/\.(?:mjs|cjs|js)$/.test(argv[3]))
    return denied(
      "Supply a literal JavaScript script path; inline code and Node launch options are unsupported",
    );
  return {
    allowed: true,
    argv,
    redirects,
    scope: "bash-input-only",
    childProcessesReviewed: false,
  };
}

function denial(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

export function auditCommandHook(input) {
  if (
    !input ||
    input.tool_name !== "Bash" ||
    !input.tool_input ||
    typeof input.tool_input.command !== "string"
  )
    return denial("Malformed Bash hook input; command was not approved");
  const result = inspectAuditCommand(input.tool_input.command);
  return result.allowed ? {} : denial(result.reason);
}

async function main() {
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > MAX_INPUT_BYTES) {
        process.stdout.write(
          JSON.stringify(denial("Oversized hook input")) + "\n",
        );
        process.exit(0);
      }
      chunks.push(chunk);
    }
    process.stdout.write(
      JSON.stringify(
        auditCommandHook(JSON.parse(Buffer.concat(chunks).toString("utf8"))),
      ) + "\n",
    );
  } catch {
    process.stdout.write(
      JSON.stringify(denial("Invalid hook input; command was not approved")) +
        "\n",
    );
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
