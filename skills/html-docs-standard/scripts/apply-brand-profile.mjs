#!/usr/bin/env node
/* global console, process */

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseArguments(arguments_) {
  const options = {};
  const allowed = new Map([
    ["--project-root", "projectRoot"],
    ["--candidate", "candidate"],
    ["--css-output", "cssOutput"],
  ]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    const key = allowed.get(flag);
    if (!key || value === undefined || value.startsWith("--")) {
      throw new Error(`unknown or incomplete option: ${flag ?? ""}`);
    }
    if (Object.hasOwn(options, key)) {
      throw new Error(`duplicate option: ${flag}`);
    }
    options[key] = value;
  }
  return options;
}

function runScript(scriptDirectory, script, arguments_) {
  return execFileSync(
    process.execPath,
    [join(scriptDirectory, script), ...arguments_],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (!options.projectRoot || !options.candidate || !options.cssOutput) {
    throw new Error(
      "Usage: node apply-brand-profile.mjs --project-root ROOT --candidate FILE --css-output CSS",
    );
  }

  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(options.projectRoot);
  const candidatePath = resolve(options.candidate);
  const cssOutput = resolve(options.cssOutput);
  const designPath = join(projectRoot, ".onboarding/brand/DESIGN.md");

  runScript(scriptDirectory, "write-brand-profile.mjs", [
    "--project-root",
    projectRoot,
    "--candidate",
    candidatePath,
  ]);
  runScript(scriptDirectory, "generate-brand-css.mjs", [
    "--design",
    designPath,
    "--output",
    cssOutput,
  ]);
  runScript(scriptDirectory, "verify-brand-profile.mjs", [
    projectRoot,
    cssOutput,
  ]);

  const profile = await readFile(designPath, "utf8");
  const brandName = /^name:\s*"([^"]+)"/m.exec(profile)?.[1] ?? "";
  console.log(
    JSON.stringify({
      status: "applied",
      brandName,
      design: designPath,
      css: cssOutput,
    }),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
