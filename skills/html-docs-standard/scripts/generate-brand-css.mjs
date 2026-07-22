#!/usr/bin/env node
/* global console, process */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  atomicWrite,
  parseDesignMd,
  renderBrandCss,
  validateBrandProfile,
} from "./lib/brand-profile.mjs";

function parseArguments(arguments_) {
  const options = {};
  const allowed = new Map([
    ["--design", "design"],
    ["--output", "output"],
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

try {
  const options = parseArguments(process.argv.slice(2));
  if (!options.design || !options.output) {
    throw new Error(
      "Usage: node generate-brand-css.mjs --design DESIGN_MD --output CSS",
    );
  }
  const design = resolve(options.design);
  const output = resolve(options.output);
  const profile = parseDesignMd(await readFile(design, "utf8"));
  const errors = validateBrandProfile(profile);
  if (errors.length > 0)
    throw new Error(`invalid brand profile: ${errors.join("; ")}`);
  await atomicWrite(output, renderBrandCss(profile));
  console.log(JSON.stringify({ status: "generated", output }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
