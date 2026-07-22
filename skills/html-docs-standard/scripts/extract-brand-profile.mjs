#!/usr/bin/env node
/* global console, process */

import { resolve } from "node:path";

import { atomicWrite } from "./lib/brand-profile.mjs";
import { fetchBrandCandidate } from "./lib/brand-extraction.mjs";

function parseArguments(arguments_) {
  const options = {};
  const allowed = new Map([
    ["--brand-name", "brandName"],
    ["--website", "website"],
    ["--output", "output"],
  ]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const key = allowed.get(flag);
    const value = arguments_[index + 1];
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
  if (!options.brandName || !options.website || !options.output) {
    throw new Error(
      "Usage: node extract-brand-profile.mjs --brand-name NAME --website URL --output CANDIDATE_JSON",
    );
  }
  const result = await fetchBrandCandidate({
    brandName: options.brandName,
    website: options.website,
  });
  const output = resolve(options.output);
  await atomicWrite(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: result.status, output }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
