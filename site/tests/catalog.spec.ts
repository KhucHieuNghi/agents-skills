import { expect, test } from "@playwright/test";

test("catalog shows version and release status without promoting the candidate", async ({
  page,
}) => {
  await page.goto("/en/catalog/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The skills behind the workflow.",
  );
  await expect(page.locator(".upstream-row")).toHaveCount(7);
  await expect(page.getByText(/TECHNICAL RELEASE/)).toBeVisible();
  await expect(page.getByText(/EVALUATION CANDIDATE/)).toBeVisible();
  await expect(page.getByText("365b412152", { exact: true })).toBeVisible();
  await page.goto("/vi/catalog/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Những skill đứng sau workflow.",
  );
  await expect(page.locator(".upstream-row")).toHaveCount(7);
});

test("catalog is reachable from mobile navigation without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/vi/");
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Danh mục" })
    .click();
  await expect(page).toHaveURL(/\/vi\/catalog\/$/);
  const sizes = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
});
