import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { setTimeout, clearTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
/** Ciphertext-only transport. Callers own authority, namespace and record validation. */
export function runPrivateControlOperation(
  operation,
  options,
  scope,
  expected,
  envelope,
) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      "python3",
      [
        "-I",
        fileURLToPath(
          new URL(
            "./enterprise-journeys/research_control_store.py",
            import.meta.url,
          ),
        ),
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
          "Private storage timeout; commit outcome unknown, read before retry",
        ),
      );
    }, 30000);
    child.on("error", () =>
      finish(Error("Private storage worker unavailable")),
    );
    child.stdin.on("error", () => {});
    child.stderr.resume();
    child.stdout.on("data", (data) => {
      output += data.toString();
      if (Buffer.byteLength(output) > 8 * 1024 * 1024) {
        child.kill("SIGKILL");
        finish(Error("Private storage output limit; commit outcome unknown"));
      }
    });
    child.on("close", () => {
      try {
        const result = JSON.parse(output);
        if (result.error)
          finish(
            Error(
              result.error === "conflict"
                ? "Private storage revision conflict"
                : "Private storage operation failed; commit outcome unknown, read before retry",
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
          Error("Private storage response unavailable; commit outcome unknown"),
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
