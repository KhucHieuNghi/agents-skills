import { expect, it } from "vitest";
import { normalizeItems } from "../skills/content-search-audit/scripts/lib/inventory.mjs";
it("unions memberships but preserves locale and content query variants", () => {
  const result = normalizeItems([
    { uri: "https://example.com/en?a=1#top", source: "sitemap", locale: "en" },
    { uri: "https://example.com/en?a=1", source: "crawl", locale: "en" },
    { uri: "https://example.com/en?a=2", source: "crawl", locale: "en" },
    {
      uri: "https://example.com/vi",
      source: "cms",
      locale: "vi",
      canonical: "https://example.com/en?a=1",
    },
  ]);
  expect(result).toHaveLength(3);
  expect(result.find((item) => item.uri.endsWith("a=1"))?.sources).toEqual([
    "crawl",
    "sitemap",
  ]);
  expect(
    result.find((item) => item.locale === "vi")?.canonicalCandidates,
  ).toEqual(["https://example.com/en?a=1"]);
});
it("has stable IDs and ordering independent of discovery order", () => {
  const inputs = [
    { uri: "https://example.com/b", source: "crawl" },
    { uri: "https://example.com/a", source: "sitemap" },
  ];
  expect(normalizeItems(inputs)).toEqual(normalizeItems([...inputs].reverse()));
});
it("retains conflicting declarations as evidence instead of dropping them", () => {
  const result = normalizeItems([
    {
      uri: "https://example.com/a",
      source: "cms",
      locale: "en",
      canonical: "https://example.com/b",
    },
    {
      uri: "https://example.com/a",
      source: "crawl",
      locale: "vi",
      canonical: "https://example.com/c",
    },
  ]);
  expect(result[0].locale).toBe("unknown");
  expect(result[0].localeCandidates).toEqual(["en", "vi"]);
  expect(result[0].canonicalCandidates).toHaveLength(2);
});
it("does not silently sample a 1200 item inventory", () => {
  const items = normalizeItems(
    Array.from({ length: 1200 }, (_, i) => ({
      uri: `https://example.com/${i}`,
      source: "cms",
    })),
  );
  expect(items).toHaveLength(1200);
  expect(items.every((item) => item.state === "pending")).toBe(true);
});
it("removes only explicitly selected tracking parameters", () => {
  const result = normalizeItems(
    [{ uri: "https://example.com/a?lang=vi&utm_source=mail", source: "crawl" }],
    { trackingParameters: ["utm_source"] },
  );
  expect(result[0].uri).toBe("https://example.com/a?lang=vi");
});
it("rejects credentials, unsupported URI schemes and malformed records", () => {
  for (const uri of [
    "https://" + "user:secret@example.com/",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "relative-path",
  ])
    expect(() => normalizeItems([{ uri, source: "crawl" }])).toThrow();
  expect(() =>
    normalizeItems([{ uri: "https://example.com/", source: "" }]),
  ).toThrow();
});
it("accepts explicit absolute local paths without pretending they are public URLs", () => {
  const item = normalizeItems([
    { path: "/content/post.md", source: "repo", type: "markdown" },
  ])[0];
  expect(item.uri).toBeNull();
  expect(item.path).toBe("/content/post.md");
  expect(item.typeCandidates).toEqual(["markdown"]);
});

it("resolves only unambiguous declared types without inferring from extension", () => {
  const items = normalizeItems([
    { path: "/content/a.pdf", source: "repo" },
    { path: "/content/b.md", source: "repo", type: "guide" },
    { path: "/content/b.md", source: "cms", type: "guide" },
    { path: "/content/c.md", source: "repo", type: "guide" },
    { path: "/content/c.md", source: "cms", type: "product" },
  ]);
  expect(items.find((item) => item.path === "/content/a.pdf")?.type).toBe(
    "unknown",
  );
  expect(items.find((item) => item.path === "/content/b.md")?.type).toBe(
    "guide",
  );
  const conflict = items.find((item) => item.path === "/content/c.md");
  expect(conflict?.type).toBe("unknown");
  expect(conflict?.typeCandidates).toEqual(["guide", "product"]);
});
