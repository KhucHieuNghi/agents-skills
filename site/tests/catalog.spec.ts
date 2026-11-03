import { expect, test } from "@playwright/test";

test("landing lists the presentation candidate with its release status", async ({
  page,
}) => {
  for (const locale of ["en", "vi"]) {
    await page.goto(`/${locale}/#solutions`);
    const candidate = page.locator(".work-card-candidate");
    await expect(candidate.getByRole("heading", { level: 3 })).toHaveText(
      "Problem presentation",
    );
    await expect(candidate.getByText("v0.1.0")).toBeVisible();
    await expect(
      candidate.getByText(
        locale === "vi" ? "ỨNG VIÊN ĐÁNH GIÁ" : "EVALUATION CANDIDATE",
      ),
    ).toBeVisible();
    await expect(
      candidate.getByRole("link", {
        name: locale === "vi" ? "Xem manifest" : "View manifest",
      }),
    ).toHaveAttribute(
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
  await expect(page.locator(".upstream-row")).toHaveCount(13);
  await expect(page.getByText("impeccable", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Recommended with Taste", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/TECHNICAL RELEASE/)).toBeVisible();
  await expect(page.getByText(/EVALUATION CANDIDATE/)).toBeVisible();
  await expect(page.getByText("365b412152", { exact: true })).toBeVisible();
  await page.goto("/vi/catalog/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Những skill đứng sau workflow.",
  );
  await expect(page.locator(".upstream-row")).toHaveCount(13);
  await expect(
    page.getByText("Đề xuất cùng Taste", { exact: true }),
  ).toBeVisible();
});

test("security sources are visible in both languages without a release claim", async ({
  page,
}) => {
  const ids = [
    "security-audit",
    "security-review",
    "security-and-hardening",
    "security-best-practices",
  ];
  for (const locale of ["en", "vi"]) {
    await page.goto(`/${locale}/#security`);
    const cards = page.locator(".security-card");
    await expect(cards).toHaveCount(4);
    for (const [index, id] of ids.entries()) {
      await expect(
        cards.nth(index).getByRole("heading", { level: 3 }),
      ).toHaveText(id);
      await expect(cards.nth(index).getByRole("link")).toHaveAttribute(
        "href",
        new RegExp(`/tree/[a-f0-9]{40}/.*${id}$`),
      );
    }
    await expect(page.locator(".security-footnote")).toContainText(
      locale === "vi"
        ? "Chưa có security Solution Skill"
        : "no installable security Solution Skill",
    );

    await page.goto(`/${locale}/catalog/#security-upstreams`);
    const rows = page.locator(
      "#security-upstreams + .upstream-table .upstream-row",
    );
    await expect(rows).toHaveCount(4);
    await expect(
      page.getByRole("link", {
        name: locale === "vi" ? "Đọc hồ sơ nguồn" : "Read the source review",
      }),
    ).toHaveAttribute(
      "href",
      "https://github.com/KhucHieuNghi/agents-skills/blob/main/docs/research/security-upstreams.md",
    );
    await expect(rows.nth(1)).toContainText("CC-BY-SA-4.0");
    await expect(rows.nth(1)).toContainText(
      locale === "vi"
        ? "Nguồn bảo mật đang theo dõi"
        : "Tracked security source",
    );
  }

  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ["/en/#security", "/vi/catalog/#security-upstreams"]) {
    await page.goto(route);
    const sizes = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(sizes.content, route).toBeLessThanOrEqual(sizes.viewport);
  }
});

test("landing presents Taste and Impeccable as a recommended practice", async ({
  page,
}) => {
  for (const locale of ["en", "vi"]) {
    await page.goto(`/${locale}/`);
    const row = page.locator(".catalog-list > div").filter({
      hasText: "Taste Skill + Impeccable",
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(
      locale === "vi" ? "QUY TRÌNH ĐỀ XUẤT" : "RECOMMENDED PRACTICE",
    );
    await expect(row).toContainText(
      locale === "vi" ? "chưa là Solution Skill" : "not a Solution Skill",
    );
  }
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
