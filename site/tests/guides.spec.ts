import { expect, test } from "@playwright/test";

test("both host guides expose the correct invocation and source-build path", async ({
  page,
}) => {
  await page.goto("/en/guides/codex/");
  await expect(
    page.getByText("$codebase-onboarding-c4", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "git clone https://github.com/KhucHieuNghi/agents-skills.git",
      { exact: false },
    ),
  ).toBeVisible();
  await page.goto("/vi/guides/claude-code/");
  await expect(
    page.getByText("/codebase-onboarding-c4", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Claude Code",
  );
});

test("landing has no horizontal page overflow at 320 and 390 pixels", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/vi/");
    const sizes = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
    await expect(
      page.getByRole("link", { name: "Lấy prompt dùng thử" }),
    ).toBeVisible();
  }
});
