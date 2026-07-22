#!/usr/bin/env node
/* global console, process */

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { parseDesignMd, validateBrandProfile } from "./lib/brand-profile.mjs";

const arguments_ = process.argv.slice(2);
if (
  arguments_.length < 1 ||
  arguments_.length > 2 ||
  (arguments_[1] !== undefined && arguments_[1] !== "--refresh")
) {
  console.error(
    "Usage: node ensure-brand-profile.mjs PROJECT_ROOT [--refresh]",
  );
  process.exit(1);
}

if (arguments_[1] === "--refresh") {
  console.log(JSON.stringify({ action: "refresh" }));
  process.exit(0);
}

const projectRoot = resolve(arguments_[0]);
try {
  const source = await readFile(
    join(projectRoot, ".onboarding/brand/DESIGN.md"),
    "utf8",
  );
  const errors = validateBrandProfile(parseDesignMd(source));
  console.log(
    JSON.stringify(
      errors.length === 0 ? { action: "reuse" } : { action: "invalid", errors },
    ),
  );
} catch (error) {
  if (error && typeof error === "object" && error.code === "ENOENT") {
    console.log(JSON.stringify({ action: "first-use" }));
  } else {
    console.log(
      JSON.stringify({
        action: "invalid",
        errors: [error instanceof Error ? error.message : String(error)],
      }),
    );
  }
}
