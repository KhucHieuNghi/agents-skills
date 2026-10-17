import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { claimMismatches, productFacts } from "../src/content/product.ts";

const manifestPath = fileURLToPath(
  new URL("../../solutions/codebase-onboarding.yaml", import.meta.url),
);
const manifest = parse(readFileSync(manifestPath, "utf8"));
const mismatches = claimMismatches(productFacts, manifest);

if (mismatches.length > 0) {
  console.error(
    `NKSkills landing claims differ from the solution manifest: ${mismatches.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  console.log(`Product claims match ${manifest.id}@${manifest.version}.`);
}
