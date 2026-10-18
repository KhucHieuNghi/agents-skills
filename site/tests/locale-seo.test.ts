import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { routePair, seoLinks } from "../src/lib/routes.js";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const productionOrigin = "https://nkskills.getgroove.me";

function build(mode: "preview" | "production") {
  execFileSync("npm", ["run", "build"], {
    cwd: siteRoot,
    stdio: "pipe",
    env: {
      ...process.env,
      SITE_MODE: mode,
      SITE_ORIGIN: mode === "production" ? productionOrigin : "",
    },
  });
}

function page(path: string): string {
  return readFileSync(
    new URL(`../dist${path}index.html`, import.meta.url),
    "utf8",
  );
}

describe("paired locale routes", () => {
  it("maps every planned page to its equivalent locale path", () => {
    expect(routePair("home")).toEqual({ en: "/en/", vi: "/vi/" });
    expect(routePair("catalog")).toEqual({
      en: "/en/catalog/",
      vi: "/vi/catalog/",
    });
    expect(routePair("solution")).toEqual({
      en: "/en/solutions/codebase-onboarding/",
      vi: "/vi/solutions/codebase-onboarding/",
    });
    expect(routePair("codex-guide").vi).toBe("/vi/guides/codex/");
    expect(routePair("claude-guide").en).toBe("/en/guides/claude-code/");
  });

  it("requires a real HTTPS origin for production search links", () => {
    expect(() => seoLinks("home", "en", "production", "")).toThrow(
      /SITE_ORIGIN/,
    );
    expect(() =>
      seoLinks("home", "en", "production", "http://example.com"),
    ).toThrow(/HTTPS/);
    expect(seoLinks("home", "en", "preview", "")).toBeNull();
  });

  it("emits canonical and reciprocal alternates for a production page", () => {
    expect(seoLinks("solution", "vi", "production", productionOrigin)).toEqual({
      canonical: `${productionOrigin}/vi/solutions/codebase-onboarding/`,
      alternates: {
        en: `${productionOrigin}/en/solutions/codebase-onboarding/`,
        vi: `${productionOrigin}/vi/solutions/codebase-onboarding/`,
        "x-default": `${productionOrigin}/en/solutions/codebase-onboarding/`,
      },
    });
  });
});

describe("built bilingual search surface", () => {
  it("keeps preview HTML unindexed and without a sitemap or canonical", () => {
    build("preview");
    const english = page("/en/");
    const vietnamese = page("/vi/");

    expect(english).toContain('name="robots" content="noindex, nofollow"');
    expect(vietnamese).toContain('name="robots" content="noindex, nofollow"');
    expect(english).not.toContain('rel="canonical"');
    expect(vietnamese).not.toContain('rel="canonical"');
    expect(() =>
      readFileSync(new URL("../dist/sitemap.xml", import.meta.url)),
    ).toThrow();
    expect(vietnamese).toContain("Nhiều skills.");
  });

  it("emits indexable production URLs for each locale and page", () => {
    build("production");
    for (const kind of [
      "home",
      "catalog",
      "solution",
      "codex-guide",
      "claude-guide",
    ] as const) {
      const paths = routePair(kind);
      for (const locale of ["en", "vi"] as const) {
        const html = page(paths[locale]);
        expect(html).toContain(`href="${productionOrigin}${paths[locale]}"`);
        expect(html).toContain(`hreflang="${locale}"`);
        expect(html).not.toContain('name="robots" content="noindex');
      }
    }
    const sitemap = readFileSync(
      new URL("../dist/sitemap.xml", import.meta.url),
      "utf8",
    );
    expect(sitemap).toContain(`${productionOrigin}/vi/guides/claude-code/`);
    expect(sitemap).not.toContain("127.0.0.1");
    expect(page("/vi/guides/codex/")).toContain(
      "Chạy codebase onboarding trong Codex.",
    );
  });
});
