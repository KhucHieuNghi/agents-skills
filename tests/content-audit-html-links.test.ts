import { expect, it } from "vitest";
import { extractHtmlLinks } from "../skills/content-search-audit/scripts/lib/html-links.mjs";
it("resolves source a/area links against the first base, preserving queries and rel metadata", () => {
  const result = extractHtmlLinks(
    '<a href="early">early</a><base href="/docs/"><base href="https://other.example/"><a HREF="guide?x=1&amp;y=&#50;#part" rel="nofollow noopener">guide</a><area href=../map><link rel=canonical href=/canonical>',
    "https://example.com/start",
  );
  expect(result.links.map((link) => link.uri)).toEqual([
    "https://example.com/docs/early",
    "https://example.com/docs/guide?x=1&y=2",
    "https://example.com/map",
  ]);
  expect(result.links[1].rel).toEqual(["nofollow", "noopener"]);
  expect(result.completeForSupportedSource).toBe(true);
});
it("ignores comment raw-text and inert template links without executing target code", () => {
  const result = extractHtmlLinks(
    '<!-- <a href=/comment> --><script>throw new Error("never execute"); const x="<a href=/script>";</script><style>x{content:"<a href=/style>"}</style><textarea><a href=/textarea></textarea><title><a href=/title></title><template><a href=/template><template><a href=/nested></template></template><a href=/visible>',
    "https://example.com/",
  );
  expect(result.links.map((link) => link.uri)).toEqual([
    "https://example.com/visible",
  ]);
  expect(result.requiresRendering).toBe(true);
});
it("records unsupported entities, duplicate attributes, base ambiguity and malformed HTML as pending", () => {
  for (const body of [
    '<a href="/a?x=&copy;">',
    '<a href="/a?x=&amp">',
    '<a href="/a?x=&#128;">',
    "<a href=/a href=/b>",
    '<base href="javascript:alert(1)"><a href=/a>',
    "< a href=/invalid>",
    '<a href="unterminated',
    "<!-- unterminated",
  ]) {
    const result = extractHtmlLinks(body, "https://example.com/");
    expect(result.completeForSupportedSource).toBe(false);
    expect(result.pending.length).toBeGreaterThan(0);
    expect(result.links).toEqual([]);
  }
});
it("keeps non-HTTP schemes inert and never returns credential-bearing URLs", () => {
  const result = extractHtmlLinks(
    '<a href="javascript:alert(1)"><a href="mailto:a@example.com"><a href="https://' +
      'user:password@example.com/"><a href="/ok?a=1&b=2">',
    "https://example.com/",
  );
  expect(result.nonHttp.map((entry) => entry.protocol)).toEqual([
    "javascript:",
    "mailto:",
  ]);
  expect(result.links.map((entry) => entry.uri)).toEqual([
    "https://example.com/ok?a=1&b=2",
  ]);
  expect(result.pending[0].reason).toMatch(/Credential/);
});
it("keeps refresh, foreign content and scripting-dependent navigation unresolved", () => {
  const result = extractHtmlLinks(
    '<meta http-equiv="refresh" content="0;url=/redirect"><svg><a href=/svg></a></svg><noscript><a href=/fallback></noscript><a href=/normal>',
    "https://example.com/",
  );
  expect(result.pending.map((entry) => entry.kind)).toEqual(
    expect.arrayContaining([
      "html-refresh",
      "foreign-content",
      "html-noscript",
    ]),
  );
  expect(result.links.map((entry) => entry.uri)).toEqual([
    "https://example.com/fallback",
    "https://example.com/normal",
  ]);
  expect(result.completeForSupportedSource).toBe(false);
});
it("handles fragment navigation and quoted angle characters without inventing embedded links", () => {
  const result = extractHtmlLinks(
    '<a href="#section" title="<a href=/fake>">one</a><a href="">empty</a>',
    "https://example.com/page?version=2",
  );
  expect(result.links.map((entry) => entry.uri)).toEqual([
    "https://example.com/page?version=2",
    "https://example.com/page?version=2",
  ]);
  expect(result.completeForSupportedSource).toBe(true);
});

it("does not reinterpret Unicode whitespace as HTML attribute separators or strip encoded URL characters", () => {
  expect(
    extractHtmlLinks("<a\u00a0href=/wrong>", "https://example.com/")
      .completeForSupportedSource,
  ).toBe(false);
  const parsed = extractHtmlLinks(
    '<a href="&#160;/kept">',
    "https://example.com/",
  );
  expect(parsed.links[0].uri).toBe("https://example.com/%C2%A0/kept");
  expect(() =>
    extractHtmlLinks('<a href="/a\0b">', "https://example.com/"),
  ).toThrow();
});
