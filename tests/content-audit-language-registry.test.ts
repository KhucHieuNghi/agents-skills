import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { buildLanguageRegistry } from "../scripts/enterprise-technical-seo/language-registry-build.mjs";

const snapshot = readFileSync(
  new URL(
    "../scripts/enterprise-technical-seo/sources/iana-language-subtag-registry-2026-11-18.txt",
    import.meta.url,
  ),
);
const registry = JSON.parse(
  readFileSync(
    new URL(
      "../scripts/enterprise-technical-seo/language-registry.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

it("reproduces the pinned hreflang subset from retained original IANA bytes", () => {
  expect(buildLanguageRegistry(snapshot)).toEqual(registry);
});

it("rejects modified source bytes rather than relabeling a different snapshot", () => {
  const changed = Buffer.from(snapshot);
  changed[changed.length - 1] ^= 1;
  expect(() => buildLanguageRegistry(changed)).toThrow("source hash mismatch");
  expect(() =>
    buildLanguageRegistry(Buffer.alloc(2 * 1024 * 1024 + 1)),
  ).toThrow("source hash mismatch");
});

it("keeps deprecated subtags and limits membership to the supported hreflang grammar", () => {
  const result = buildLanguageRegistry(snapshot);
  expect(result.sets.language).toHaveLength(190);
  expect(result.sets.script).toHaveLength(224);
  expect(result.sets.region).toHaveLength(272);
  expect(result.deprecated.language).toContain("iw");
  expect(result.deprecated.region).toContain("bu");
  expect(result.sets.language).not.toContain("eng");
  expect(result.sets.region).not.toContain("419");
});
