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
  await expect(page.locator("#install pre")).toContainText("install-solution");
  await expect(page.locator("#install pre")).toContainText("--target codex");
  await expect(page.locator("#presentation")).toContainText(
    "$problem-presentation",
  );
  await page.goto("/vi/guides/claude-code/");
  await expect(
    page.getByText("/codebase-onboarding-c4", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Claude Code",
  );
  await expect(page.locator("#install pre")).toContainText(
    "--target claude-code",
  );
  await expect(page.locator("#presentation")).toContainText(
    "/problem-presentation",
  );
});

test("landing links each host to a complete installation guide", async ({
  page,
}) => {
  await page.goto("/vi/#install");
  const section = page.locator(".integration-section");
  await expect(section.getByRole("heading", { level: 2 })).toContainText(
    "Đưa skill vào",
  );
  await expect(
    section.getByRole("link", { name: "Cài cho Codex" }),
  ).toHaveAttribute("href", "/vi/guides/codex/");
  await expect(
    section.getByRole("link", { name: "Cài cho Claude Code" }),
  ).toHaveAttribute("href", "/vi/guides/claude-code/");
  await expect(section).toContainText("Problem-presentation 0.1.0");
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
    await expect(page.locator(".hero-primary")).toBeVisible();
  }
});

test("installation commands scroll inside both mobile host guides", async ({
  page,
}) => {
  for (const host of ["codex", "claude-code"]) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/vi/guides/${host}/`);
    const sizes = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
    await expect(page.locator("#install pre")).toBeVisible();
    await expect(page.locator("#presentation pre")).toBeVisible();
  }
});
