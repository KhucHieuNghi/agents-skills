#!/usr/bin/env node
/* global console, process */

import { execFileSync } from "node:child_process";
import { readFile, rename, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { URL } from "node:url";

import {
  atomicWrite,
  isPrivateAddress,
  normalizeBrandCandidate,
  parseDesignMd,
  sanitizeBrandUrl,
  serializeDesignMd,
  validateBrandProfile,
} from "./lib/brand-profile.mjs";

function parseArguments(arguments_) {
  const options = {};
  const allowed = new Map([
    ["--project-root", "projectRoot"],
    ["--candidate", "candidate"],
  ]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    const key = allowed.get(flag);
    if (!key || value === undefined || value.startsWith("--")) {
      throw new Error(`unknown or incomplete option: ${flag ?? ""}`);
    }
    if (Object.hasOwn(options, key))
      throw new Error(`duplicate option: ${flag}`);
    options[key] = value;
  }
  return options;
}

async function ensureLocalExclude(projectRoot) {
  const exclude = execFileSync(
    "git",
    ["rev-parse", "--git-path", "info/exclude"],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  ).trim();
  const excludePath = resolve(projectRoot, exclude);
  const entry = "/.onboarding/brand/";
  const current = await readFile(excludePath, "utf8").catch(() => "");
  if (!current.split(/\r?\n/).includes(entry)) {
    const separator = current === "" || current.endsWith("\n") ? "" : "\n";
    await atomicWrite(excludePath, `${current}${separator}${entry}\n`);
  }
  execFileSync(
    "git",
    ["check-ignore", "-q", "--", ".onboarding/brand/DESIGN.md"],
    {
      cwd: projectRoot,
      stdio: "ignore",
    },
  );
}

async function backUpInvalidProfile(designPath) {
  let source;
  try {
    source = await readFile(designPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw error;
  }
  let valid;
  try {
    valid = validateBrandProfile(parseDesignMd(source)).length === 0;
  } catch {
    valid = false;
  }
  if (!valid) {
    await rename(
      designPath,
      join(resolve(designPath, ".."), `DESIGN.invalid-${Date.now()}.md`),
    );
  }
}

function serializeExtractionState({
  brandName,
  sourceOrigin,
  extractionMethod,
  extractionStatus,
}) {
  return `version: 1\nbrand_name: ${JSON.stringify(brandName)}\nsource_origin: ${sourceOrigin}\nextraction_method: ${extractionMethod}\nextraction_status: ${extractionStatus}\ncreated_at: ${new Date().toISOString()}\ndesign_path: .onboarding/brand/DESIGN.md\n`;
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (!options.projectRoot || !options.candidate) {
    throw new Error(
      "Usage: node write-brand-profile.mjs --project-root ROOT --candidate FILE",
    );
  }
  const projectRoot = resolve(options.projectRoot);
  const candidatePath = resolve(options.candidate);
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  if (!candidate.brandName || typeof candidate.brandName !== "string") {
    throw new Error("candidate brandName is required");
  }
  if (!["static", "browser"].includes(candidate.method)) {
    throw new Error("candidate method must be static or browser");
  }
  if (!["extracted", "insufficient"].includes(candidate.status)) {
    throw new Error("candidate status must be extracted or insufficient");
  }
  const sanitizedSource = sanitizeBrandUrl(candidate.sourceOrigin);
  const sourceHostname = new URL(sanitizedSource.url).hostname.replace(
    /^\[|\]$/g,
    "",
  );
  if (isPrivateAddress(sourceHostname)) {
    throw new Error("candidate source origin cannot use a private address");
  }
  const sourceOrigin = sanitizedSource.origin;
  const extracted = candidate.status === "extracted";
  const profile = normalizeBrandCandidate({
    brandName: candidate.brandName,
    colors: extracted ? candidate.candidate?.colors : {},
    typography: extracted ? candidate.candidate?.typography : {},
  });
  const brandDirectory = join(projectRoot, ".onboarding/brand");
  const designPath = join(brandDirectory, "DESIGN.md");
  const statePath = join(brandDirectory, "extraction-state.yaml");

  await ensureLocalExclude(projectRoot);
  await backUpInvalidProfile(designPath);
  await atomicWrite(designPath, serializeDesignMd(profile));
  await atomicWrite(
    statePath,
    serializeExtractionState({
      brandName: profile.name,
      sourceOrigin,
      extractionMethod: extracted ? candidate.method : "fallback",
      extractionStatus: extracted ? "extracted" : "fallback",
    }),
  );
  await rm(candidatePath, { force: true });
  console.log(
    JSON.stringify({
      status: extracted ? "extracted" : "fallback",
      design: designPath,
    }),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
