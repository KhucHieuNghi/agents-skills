import { expect, test } from "@playwright/test";

test("selected locale and host always match the visible copied prompt", async ({
  page,
}) => {
  await page.goto("/en/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Claude Code", exact: true }).click();
  await page.getByRole("button", { name: "Tiếng Việt", exact: true }).click();
  const prompt = page.getByLabel("Selected prompt");
  await expect(prompt).toHaveValue(/\/codebase-onboarding-c4/);
  await expect(prompt).toHaveValue(/Tôi muốn hiểu repository/);
  await page.getByRole("button", { name: "Codex", exact: true }).click();
  await expect(prompt).toHaveValue(/\$codebase-onboarding-c4/);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(prompt).toHaveValue(/I want to understand this repository/);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (value: string) => {
          (window as Window & { copied?: string }).copied = value;
          return Promise.resolve();
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByRole("status")).toContainText("copied");
  const copied = await page.evaluate(
    () => (window as Window & { copied?: string }).copied,
  );
  expect(copied).toBe(await prompt.inputValue());
});

test("clipboard denial leaves prompt visible for manual copying", async ({
  page,
}) => {
  await page.goto("/vi/");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
  });
  await page.getByRole("button", { name: "Sao chép prompt" }).click();
  await expect(page.getByRole("status")).toContainText("thủ công");
  await expect(page.getByLabel("Prompt đã chọn")).toHaveValue(
    /\$codebase-onboarding-c4/,
  );
});

test("host choices support arrow-key navigation", async ({ page }) => {
  await page.goto("/en/");
  const codex = page.getByRole("button", { name: "Codex", exact: true });
  await codex.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Claude Code", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Selected prompt")).toHaveValue(
    /\/codebase-onboarding-c4/,
  );
});
