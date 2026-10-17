#!/usr/bin/env node
/* global console, process */
import { resolve } from "node:path";
import { createPresentationBrand } from "./lib/brand.mjs";

function optionsFrom(args) {
  const allowed = new Map([
    ["--title", "title"],
    ["--brand-name", "brandName"],
    ["--website", "website"],
    ["--logo", "logoPath"],
    ["--output-dir", "outputDirectory"],
  ]);
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--refresh") {
      if (options.refresh) throw new Error("duplicate option: --refresh");
      options.refresh = true;
      continue;
    }
    const key = allowed.get(flag);
    const value = args[++index];
    if (
      !key ||
      !value ||
      value.startsWith("--") ||
      Object.hasOwn(options, key)
    ) {
      throw new Error(`unknown, duplicate, or incomplete option: ${flag}`);
    }
    options[key] = value;
  }
  if (!options.title || !options.outputDirectory) {
    throw new Error(
      "Usage: node brand.mjs --title TITLE --output-dir DIR [--brand-name NAME] [--website URL] [--logo FILE] [--refresh]",
    );
  }
  options.outputDirectory = resolve(options.outputDirectory);
  return options;
}

try {
  const options = optionsFrom(process.argv.slice(2));
  const profile = await createPresentationBrand(options);
  console.log(
    JSON.stringify({
      status: profile.status,
      profile: resolve(options.outputDirectory, "brand.json"),
    }),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
