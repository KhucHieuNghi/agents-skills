import { expect, test } from "@playwright/test";

test("landing lists the presentation candidate with its release status", async ({
  page,
}) => {
  for (const locale of ["en", "vi"]) {
    await page.goto(`/${locale}/#solutions`);
    const candidate = page.locator(".featured-candidate");
    await expect(candidate.getByRole("heading", { level: 3 })).toHaveText(
      "Problem presentation",
    );
    await expect(candidate.getByText("v0.1.0")).toBeVisible();
    await expect(
      candidate.getByText(
        locale === "vi" ? "ỨNG VIÊN ĐÁNH GIÁ" : "EVALUATION CANDIDATE",
      ),
    ).toBeVisible();
    await expect(candidate.getByRole("link")).toHaveAttribute(
      "href",
      "https://github.com/KhucHieuNghi/agents-skills/blob/main/solutions/problem-presentation.yaml",
    );
  }
});

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
