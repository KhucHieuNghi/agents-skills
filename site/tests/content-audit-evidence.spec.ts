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

test("Both landing locales link to Vietnamese and English pilot prompts on both hosts", async ({
  page,
}) => {
  for (const locale of ["en", "vi"]) {
    await page.goto(`/${locale}/`);
    for (const [host, token] of [
      ["codex", "$content-search-audit"],
      ["claude-code", "/content-search-audit"],
    ]) {
      const href = `/${locale}/guides/${host}/#content-search-audit-pilot`;
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(1);
      const selected = await page
        .locator(`a[href="${href}"]`)
        .getAttribute("href");
      await page.goto(selected!);
      const codes = page.locator("#content-search-audit-pilot code");
      await expect(codes.nth(0)).toContainText(token + " Audit");
      await expect(codes.nth(0)).toContainText("Viết báo cáo bằng tiếng Việt.");
      await expect(codes.nth(1)).toContainText("Write the report in English.");
      await page.goto(`/${locale}/`);
    }
  }
});

test("Landing provides a complete pilot install path in EN and VI", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const locale of ["en", "vi"]) {
    await page.goto(`/${locale}/`);
    await page.locator('a[href="#content-audit-setup"]').click();
    await expect(page).toHaveURL(/#content-audit-setup$/);
    const section = page.locator("#content-audit-setup");
    const commands = section.locator("pre").first();
    await expect(commands).toContainText("git clone");
    await expect(commands).toContainText(
      "catalog.content-search-audit-candidate.yaml",
    );
    await expect(commands).toContainText("install-solution");
    await expect(commands).toContainText('--digest "$digest"');
    await expect(commands).toContainText('--target "$host"');
    await expect(
      section.locator('pre[aria-label="Codex prompt"]'),
    ).toContainText("$content-search-audit");
    await expect(
      section.locator('pre[aria-label="Claude Code prompt"]'),
    ).toContainText("/content-search-audit");
    await section.locator("summary").click();
    await expect(
      section.getByRole("link", { name: "Claude Code", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
