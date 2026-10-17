import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const binary = (name) =>
  fileURLToPath(new URL(`../node_modules/.bin/${name}`, import.meta.url));

function run(name, args) {
  execFileSync(binary(name), args, {
    cwd: siteRoot,
    stdio: "inherit",
    env: process.env,
  });
}

run("tsx", ["scripts/check-product-claims.mjs"]);
run("astro", ["build"]);
run("tsx", ["scripts/generate-search-files.mjs"]);
run("tsx", ["scripts/check-built-pages.mjs"]);
