import { spawn } from "node:child_process";
import path from "node:path";
import { expect, it } from "vitest";
import {
  inspectAuditCommand,
  auditCommandHook,
} from "../scripts/eval-content-audit-command-guard.mjs";

it("accepts one literal helper invocation and preserves quoted arguments", () => {
  const result = inspectAuditCommand(
    `rtk proxy node '/installed skill/audit.mjs' validate "/audit run" > '/receipts/output file.json' 2> stderr.txt`,
  );
  expect(result.allowed).toBe(true);
  expect(result.argv).toEqual([
    "rtk",
    "proxy",
    "node",
    "/installed skill/audit.mjs",
    "validate",
    "/audit run",
  ]);
  expect(result.redirects).toEqual([
    { fd: 1, path: "/receipts/output file.json" },
    { fd: 2, path: "stderr.txt" },
  ]);
});

it("treats shell metacharacters inside single quotes as inert arguments", () => {
  expect(
    inspectAuditCommand(
      `rtk proxy node audit.mjs '$(touch sentinel); | & \`literal\`'`,
    ).allowed,
  ).toBe(true);
});

it.each([
  "rtk proxy find . -not -path './.git/*' -type f | head -300",
  'cd targets && for f in *.md; do echo "=== $f"; rtk proxy cat -n "$f"; done',
  "R=$PWD; mkdir -p audits; rtk proxy node audit.mjs",
  "rtk proxy node audit.mjs; ls audits | head -30",
  "cat > build.mjs <<'EOF'\ncontent\nEOF",
  "rtk proxy node audit.mjs && rtk proxy node next.mjs",
  "rtk proxy node audit.mjs\nrtk proxy node next.mjs",
  "rtk proxy node audit.mjs $(touch sentinel)",
  'rtk proxy node audit.mjs "$(touch sentinel)"',
  "rtk proxy node audit.mjs `touch sentinel`",
  "rtk proxy node audit.mjs <(cat input)",
  "rtk proxy node audit.mjs *.json",
  "rtk proxy node audit.mjs > $OUTPUT",
  "rtk proxy node audit.mjs > out 2>&1",
  "rtk proxy node audit.mjs >> out",
  "rtk proxy node audit.mjs > /dev/tcp/host/443",
  "rtk proxy node audit.mjs 3> out",
  "rtk proxy node audit.mjs < input",
  "rtk proxy node audit.mjs > out > other",
  "rtk proxy node audit.mjs > out extra-argument",
  "rtk proxy node audit.mjs 'unterminated",
  'rtk proxy node audit.mjs "unterminated',
  "rtk proxy node audit.mjs trailing\\",
  "rtk proxy node audit.mjs foo\\ bar",
  'rtk proxy node audit.mjs "escaped\\$value"',
  "rtk proxy node audit.mjs ''suffix",
  "rtk proxy bash -c 'echo unwrapped'",
  "rtk proxy env node audit.mjs",
  "rtk proxy node -e 'process.exit(0)'",
  "rtk proxy node --eval 'process.exit(0)'",
  "rtk proxy node --require preload.cjs audit.mjs",
  "rtk proxy python3 -c 'print(1)'",
  "rtk proxy node audit.mjs # comment",
  "rtk proxy node audit.mjs\u0000",
])("rejects unsupported shell input without executing it: %s", (command) => {
  expect(inspectAuditCommand(command).allowed).toBe(false);
});

it("does not claim to inspect code loaded by a script", () => {
  const result = inspectAuditCommand("rtk proxy node generated-review.mjs");
  expect(result.allowed).toBe(true);
  expect(result.scope).toBe("bash-input-only");
  expect(result.childProcessesReviewed).toBe(false);
});

it("returns no permission grant for valid inputs and denies malformed inputs", () => {
  expect(
    auditCommandHook({
      tool_name: "Bash",
      tool_input: { command: "rtk proxy node audit.mjs" },
    }),
  ).toEqual({});
  for (const input of [
    null,
    {},
    { tool_name: "Bash" },
    { tool_name: "Bash", tool_input: { command: 2 } },
    { tool_name: "Other", tool_input: { command: "rtk proxy node audit.mjs" } },
  ]) {
    expect(auditCommandHook(input).hookSpecificOutput.permissionDecision).toBe(
      "deny",
    );
  }
});

function invoke(input: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [path.resolve("scripts/eval-content-audit-command-guard.mjs")],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout, stderr }));
      child.stdin.end(input);
    },
  );
}

it("CLI emits a denial on malformed JSON and never echoes command contents", async () => {
  const result = await invoke('{"tool_name":"Bash",secret-marker');
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision).toBe(
    "deny",
  );
  expect(result.stdout + result.stderr).not.toContain("secret-marker");
});

it("CLI leaves ordinary host permissions intact for accepted syntax", async () => {
  const result = await invoke(
    JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "rtk proxy node audit.mjs validate run" },
    }),
  );
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({});
});

it("bounds CLI input size and denies empty stdin", async () => {
  for (const input of ["", " ".repeat(70000)]) {
    const result = await invoke(input);
    expect(result.code).toBe(0);
    expect(
      JSON.parse(result.stdout).hookSpecificOutput.permissionDecision,
    ).toBe("deny");
  }
});
