import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

type SkillSource = {
  kind?: "git-skill";
  repository: string;
  revision: string;
  skillPath: string;
};
const lock = JSON.parse(
  readFileSync(
    new URL(
      "../../skills/content-search-audit/provenance.lock.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as { sources: (SkillSource | { kind: "data" })[] };
const skillSources = lock.sources.filter(
  (source): source is SkillSource => source.kind !== "data",
);

for (const locale of ["en", "vi"]) {
  test(`${locale}: audit evidence preserves attribution and commercial limits on both pages`, async ({
    page,
  }) => {
    for (const path of [`/${locale}/`, `/${locale}/catalog/`]) {
      await page.goto(path);
      const section = page.locator("#content-audit-evidence");
      await expect(section).toBeVisible();
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(section.locator(".evidence-columns")).toHaveCSS(
        "display",
        "grid",
      );
      await expect(section).toHaveCSS("background-color", "rgb(255, 255, 255)");
      expect(
        await section.evaluate((el) =>
          parseFloat(getComputedStyle(el).paddingLeft),
        ),
      ).toBeGreaterThan(16);
      if (path === `/${locale}/`) {
        const card = await page
          .locator("#solutions .work-card")
          .last()
          .boundingBox();
        const evidence = await section.boundingBox();
        expect(Math.abs(evidence!.x - card!.x)).toBeLessThan(2);
        expect(Math.abs(evidence!.width - card!.width)).toBeLessThan(2);
      }
      await expect(section.locator(".source-list a")).toHaveCount(5);
      for (const source of skillSources) {
        await expect(
          section.locator(
            `a[href="${source.repository}/tree/${source.revision}/${source.skillPath}"]`,
          ),
        ).toHaveCount(1);
      }
      await expect(section).toContainText("0.1.40");
      await expect(section).toContainText("0.2.0");
      await expect(section).toContainText(
        locale === "en" ? "items remained pending" : "items vẫn pending",
      );
      await expect(section).toContainText(
        locale === "en"
          ? "Claude had native reporting errors"
          : "Claude có lỗi reporting ở bản gốc",
      );
      await expect(section).toContainText(
        locale === "en"
          ? "Independent review is mandatory"
          : "Review độc lập bắt buộc",
      );
      await expect(section).toContainText(
        locale === "en"
          ? "do not establish general accuracy"
          : "chưa chứng minh độ chính xác tổng quát",
      );
      await expect(section).not.toContainText("525");
      await expect(section).toContainText("GA4");
      await expect(section).toContainText("Google Search Console");
      await expect(section).toContainText("Bing");
      await expect(section).toContainText(
        locale === "en"
          ? "no executable audit suite"
          : "chưa có bộ audit thực thi",
      );
      await page.setViewportSize({ width: 320, height: 780 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(section.getByRole("heading", { level: 3 })).toBeVisible();
      expect(
        await section
          .locator(".evidence-columns")
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
          ),
      ).toBe(1);
    }
  });
}
