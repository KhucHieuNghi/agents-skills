import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const files = {
  quality: "content-quality.md",
  seo: "technical-seo.md",
  aio: "ai-search-readiness.md",
  aeo: "answer-quality.md",
  geo: "generative-visibility.md",
  portfolio: "content-portfolio.md",
};

/** Exposes packaged instructions; it does not attest that a host read or applied them. */
export async function loadMethods(dimension) {
  if (dimension !== undefined && !Object.hasOwn(files, dimension))
    throw new Error(
      "Unknown method dimension; use quality, seo, aio, aeo, geo or portfolio",
    );
  const methods = [];
  for (const [key, file] of Object.entries(files)) {
    if (dimension !== undefined && key !== dimension) continue;
    const relative = `references/methods/${file}`;
    const text = await readFile(
      new URL(`../../${relative}`, import.meta.url),
      "utf8",
    );
    methods.push({
      dimension: key,
      path: relative,
      sha256: createHash("sha256").update(text).digest("hex"),
      text,
    });
  }
  return {
    methods,
    limitation:
      "Read the returned bodies in context. A hash or discarded output does not demonstrate method loading or semantic correctness.",
  };
}
