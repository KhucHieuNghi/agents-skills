import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import YAML from "yaml";

const file = readFileSync(new URL("../../DESIGN.md", import.meta.url), "utf8");
const yaml = file.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
if (!yaml) throw new Error("Root DESIGN.md has no YAML frontmatter");
const design = YAML.parse(yaml) as { colors: Record<string, string> };
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(", ")})`;

test("bilingual page types use the approved fonts and primary action", async ({
  page,
}) => {
  for (const route of [
    "/en/",
    "/vi/",
    "/en/catalog/",
    "/vi/catalog/",
    "/en/solutions/codebase-onboarding/",
    "/vi/solutions/codebase-onboarding/",
    "/en/guides/codex/",
    "/vi/guides/claude-code/",
  ]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const styles = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      const sectionHeading = document.querySelector("h2");
      const primary = document.querySelector("a.button:not(.button-secondary)");
      return {
        bodyFont: getComputedStyle(document.body).fontFamily,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        headingFont: heading ? getComputedStyle(heading).fontFamily : "",
        sectionFont: sectionHeading
          ? getComputedStyle(sectionHeading).fontFamily
          : null,
        actionBackground: primary
          ? getComputedStyle(primary).backgroundColor
          : null,
        actionText: primary ? getComputedStyle(primary).color : null,
      };
    });

    expect(styles.bodyFont, route).toContain("Source Sans 3 Variable");
    expect(styles.bodyBackground, route).toBe(rgb(design.colors.neutral));
    expect(styles.headingFont, route).toContain("Fraunces Variable");
    if (styles.sectionFont) {
      expect(styles.sectionFont, route).toContain("Fraunces Variable");
    }
    if (styles.actionBackground) {
      expect(styles.actionBackground, route).toBe(rgb(design.colors.tertiary));
      expect(styles.actionText, route).toBe(rgb(design.colors["on-tertiary"]));
    }
  }
});

test("a slow first font download does not swap visible hero text later", async ({
  browser,
}) => {
  for (const locale of ["en", "vi"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.route("**/*.woff2", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    const fontResponse = page.waitForResponse((response) =>
      response.url().includes("fraunces-latin-full-normal"),
    );
    await page.goto(`/${locale}/`, { waitUntil: "domcontentloaded" });
    const before = await page.locator("h1").evaluate((heading) => {
      const range = document.createRange();
      range.selectNodeContents(heading);
      return [...range.getClientRects()].map((rect) => rect.width);
    });
    await fontResponse;
    await page.waitForTimeout(150);
    const after = await page.locator("h1").evaluate((heading) => {
      const range = document.createRange();
      range.selectNodeContents(heading);
      return [...range.getClientRects()].map((rect) => rect.width);
    });
    expect(after, locale).toEqual(before);
    const widths = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content, locale).toBeLessThanOrEqual(widths.viewport);
    await context.close();
  }
});
