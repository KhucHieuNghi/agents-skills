import process from "node:process";
import console from "node:console";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import { constants } from "node:fs";
import { open, mkdir, readdir, lstat } from "node:fs/promises";
import { parseCaptureJson } from "../enterprise-technical-seo/strict-json.mjs";
import { planChanges } from "./change-plan.mjs";
import {
  renderChangePlan,
  verifyChangePlanArtifacts,
} from "./change-plan-view.mjs";

const LIMIT = 8 * 1024 * 1024;
const names = ["manifest.json", "plan.html", "plan.json", "plan.md"];
function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...keys].sort().join(",")
  )
    throw new Error("Invalid input shape");
}
async function read(filename) {
  if (!constants.O_NOFOLLOW || !constants.O_NONBLOCK)
    throw new Error("Required safe file operations unavailable");
  const handle = await open(
    filename,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > LIMIT)
      throw new Error("Invalid input file");
    const buffer = Buffer.alloc(LIMIT + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > LIMIT) throw new Error("Input budget exceeded");
    const text = buffer.subarray(0, offset).toString("utf8");
    if (!Buffer.from(text).equals(buffer.subarray(0, offset)))
      throw new Error("Invalid UTF-8");
    return text;
  } finally {
    await handle.close();
  }
}
async function write(filename, text) {
  const handle = await open(filename, "wx", 0o600);
  try {
    await handle.writeFile(text, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Operator-supplied host file is a binding input, never a grant or proof of authenticity. */
export async function runChangePlanCli(argv) {
  if (argv.length === 1 && argv[0] === "--help") {
    console.log(
      "Development-only private dossier CLI. render|verify --input proposal.json --host-context operator-bindings.json --out dossier-directory\nNo execution, publication or grant ingestion. Host bindings must be independently confirmed by the operator. Inputs: regular UTF-8 files, at most 8 MiB, JSON depth 32 / 10000 nodes; duplicate keys rejected. Requires no-follow/nonblocking file support. Proposal count multiplied by combined input bytes must not exceed 2 MiB; split changes into smaller plans while preserving complete source inputs. Output parent must be trusted and exclusively controlled.",
    );
    return 0;
  }
  let stage = "arguments";
  try {
    const [command, ...args] = argv;
    if (!["render", "verify"].includes(command) || args.length !== 6)
      throw new Error("Invalid command");
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (
        !["--input", "--host-context", "--out"].includes(args[i]) ||
        Object.hasOwn(options, args[i]) ||
        !args[i + 1] ||
        args[i + 1].startsWith("--")
      )
        throw new Error("Invalid option");
      options[args[i]] = args[i + 1];
    }
    stage = "proposal-input";
    const proposalText = await read(options["--input"]);
    const proposal = parseCaptureJson(proposalText);
    exact(proposal, [
      "planId",
      "assessmentAt",
      "report",
      "sourceRun",
      "proposals",
    ]);
    stage = "host-bindings";
    const hostText = await read(options["--host-context"]);
    const hostContext = parseCaptureJson(hostText);
    exact(hostContext, ["trustedAssetBindings", "trustedAcceptancePolicies"]);
    stage = "expansion-budget";
    if (
      !Array.isArray(proposal.proposals) ||
      proposal.proposals.length < 1 ||
      proposal.proposals.length > 100 ||
      (Buffer.byteLength(proposalText) + Buffer.byteLength(hostText)) *
        proposal.proposals.length >
        LIMIT / 4
    )
      throw new Error("Planning expansion budget exceeded");
    const planningInput = { ...proposal, ...hostContext };
    const out = path.resolve(options["--out"]);
    if (command === "render") {
      stage = "source-replay";
      const plan = planChanges(planningInput);
      const artifacts = renderChangePlan({ plan, planningInput, hostContext });
      const files = {
        "plan.json": artifacts.json,
        "plan.md": artifacts.markdown,
        "plan.html": artifacts.html,
        "manifest.json": JSON.stringify(artifacts.manifest, null, 2) + "\n",
      };
      for (const text of Object.values(files))
        if (Buffer.byteLength(text) > LIMIT)
          throw new Error("Output budget exceeded");
      // Ensure a created dossier can pass the same JSON parser on subsequent verification.
      parseCaptureJson(artifacts.json);
      stage = "new-output-directory";
      await mkdir(out, { mode: 0o700 }); // Existing paths are never overwritten.
      // Manifest is written last. Partial output is retained on error and must not be treated as verified.
      stage = "artifact-write";
      for (const [name, text] of Object.entries(files))
        await write(path.join(out, name), text);
      console.log(
        JSON.stringify({
          status: "created",
          planDigest: plan.planDigest,
          edition: "private",
          executionAllowed: false,
        }),
      );
    } else {
      stage = "artifact-verification";
      const info = await lstat(out);
      if (
        !info.isDirectory() ||
        info.isSymbolicLink() ||
        (await readdir(out)).sort().join(",") !== names.join(",")
      )
        throw new Error("Invalid dossier directory");
      const json = await read(path.join(out, "plan.json"));
      const manifestText = await read(path.join(out, "manifest.json"));
      const artifacts = {
        json,
        markdown: await read(path.join(out, "plan.md")),
        html: await read(path.join(out, "plan.html")),
        manifest: parseCaptureJson(manifestText),
      };
      const plan = parseCaptureJson(json);
      verifyChangePlanArtifacts({
        plan,
        planningInput,
        hostContext,
        artifacts,
      });
      const expectedManifest = renderChangePlan({
        plan,
        planningInput,
        hostContext,
      }).manifest;
      if (manifestText !== JSON.stringify(expectedManifest, null, 2) + "\n")
        throw new Error("Manifest bytes differ");
      console.log(
        JSON.stringify({
          status: "verified",
          planDigest: plan.planDigest,
          edition: "private",
          executionAllowed: false,
        }),
      );
    }
    return 0;
  } catch {
    console.error("Change-plan failure stage: " + stage);
    console.error(
      "Change-plan command failed. Check command shape, private regular-file inputs and source/host bindings; render requires a new output directory. Verification requires an intact four-file dossier. No execution was attempted. For expansion-budget failures, split changes into smaller plans while preserving complete source inputs. Partial output, if any, is unverified and retained.",
    );
    return 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = await runChangePlanCli(process.argv.slice(2));
