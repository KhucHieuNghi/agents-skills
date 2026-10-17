import { expect, test } from "@playwright/test";

test("workflow diagram has a visible text equivalent and only supported hosts", async ({
  page,
}) => {
  await page.goto("/en/");
  const diagram = page.getByRole("img", {
    name: "NKSkills codebase onboarding workflow",
  });
  await expect(diagram).toBeVisible();
  await expect(
    page.getByText("Hallmark + original skills", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Codex or Claude Code", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Cited journey and C1/C2 views", { exact: true }),
  ).toBeVisible();
});

test("reduced motion keeps diagram and all explanatory text available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vi/");
  await expect(
    page.getByRole("img", { name: "Quy trình codebase onboarding NKSkills" }),
  ).toBeVisible();
  await expect(
    page.getByText("Hallmark và skill gốc", { exact: true }),
  ).toBeVisible();
});
