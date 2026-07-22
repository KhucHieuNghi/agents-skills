#!/usr/bin/env node
/* global console, process */

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { URL } from "node:url";

import {
  isPrivateAddress,
  parseDesignMd,
  sanitizeBrandUrl,
  validateBrandProfile,
} from "./lib/brand-profile.mjs";

const REQUIRED_CSS_VARIABLES = [
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--on-brand-primary",
  "--surface",
  "--surface-muted",
  "--border",
  "--text",
  "--text-muted",
  "--font-heading",
  "--font-body",
];

function parseState(source) {
  const state = {};
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!match || Object.hasOwn(state, match[1])) {
      throw new Error(`invalid extraction state line: ${line}`);
    }
    state[match[1]] = match[2];
  }
  return state;
}

const arguments_ = process.argv.slice(2);
if (arguments_.length < 1 || arguments_.length > 2) {
  console.error(
    "Usage: node verify-brand-profile.mjs PROJECT_ROOT [GENERATED_CSS]",
  );
  process.exit(1);
}

const projectRoot = resolve(arguments_[0]);
const errors = [];
const designPath = join(projectRoot, ".onboarding/brand/DESIGN.md");
const statePath = join(projectRoot, ".onboarding/brand/extraction-state.yaml");

try {
  const profile = parseDesignMd(await readFile(designPath, "utf8"));
  errors.push(...validateBrandProfile(profile));
} catch (error) {
  errors.push(
    `invalid .onboarding/brand/DESIGN.md: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  const state = parseState(await readFile(statePath, "utf8"));
  if (state.version !== "1") errors.push("extraction state version must be 1");
  if (!state.brand_name) errors.push("extraction state brand_name is required");
  try {
    const sanitized = sanitizeBrandUrl(state.source_origin);
    if (state.source_origin !== sanitized.origin) {
      errors.push("source_origin must contain an origin only");
    }
    const hostname = new URL(sanitized.url).hostname.replace(/^\[|\]$/g, "");
    if (isPrivateAddress(hostname)) {
      errors.push("source_origin cannot use a private address");
    }
  } catch {
    errors.push("source_origin must be a sanitized public HTTP origin");
  }
  if (!["static", "browser", "fallback"].includes(state.extraction_method)) {
    errors.push("extraction_method is invalid");
  }
  if (!["extracted", "fallback"].includes(state.extraction_status)) {
    errors.push("extraction_status is invalid");
  }
  if (state.design_path !== ".onboarding/brand/DESIGN.md") {
    errors.push("design_path must reference the local canonical profile");
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(state.created_at ?? "")) {
    errors.push("created_at must be an ISO timestamp");
  }
} catch (error) {
  errors.push(
    `invalid .onboarding/brand/extraction-state.yaml: ${error instanceof Error ? error.message : String(error)}`,
  );
}

try {
  execFileSync("git", ["check-ignore", "-q", "--", ".onboarding/brand"], {
    cwd: projectRoot,
    stdio: "ignore",
  });
} catch {
  errors.push(".onboarding/brand must be ignored by Git");
}

try {
  const tracked = execFileSync("git", ["ls-files", "--", ".onboarding/brand"], {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  if (tracked) errors.push(".onboarding/brand files must not be tracked");
} catch {
  errors.push("unable to inspect tracked brand files");
}

if (arguments_[1]) {
  const cssPath = isAbsolute(arguments_[1])
    ? arguments_[1]
    : join(projectRoot, arguments_[1]);
  try {
    const css = await readFile(cssPath, "utf8");
    for (const variable of REQUIRED_CSS_VARIABLES) {
      if (!new RegExp(`${variable}\\s*:`).test(css)) {
        errors.push(`missing brand CSS variable: ${variable}`);
      }
    }
    const bodyFamily = /--font-body\s*:\s*([^;]+);/i.exec(css)?.[1] ?? "";
    const headingFamily = /--font-heading\s*:\s*([^;]+);/i.exec(css)?.[1] ?? "";
    if (!/system-ui/i.test(bodyFamily)) {
      errors.push("brand CSS --font-body requires a system-ui fallback");
    }
    if (!/system-ui/i.test(headingFamily)) {
      errors.push("brand CSS --font-heading requires a system-ui fallback");
    }
  } catch (error) {
    errors.push(
      `unable to read generated brand CSS: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Brand profile contract passed");
