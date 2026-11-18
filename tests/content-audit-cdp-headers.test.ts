import { expect, it } from "vitest";
// @ts-expect-error development ESM adapter
import { parseCanonicalCdpHeaders } from "../scripts/enterprise-technical-seo/cdp-headers.mjs";
// @ts-expect-error development ESM parser
import { parseCanonicalLinkHeaders } from "../scripts/enterprise-technical-seo/link-header.mjs";
const url = "https://example.com/";
it("separates CDP newline-joined fields before strict Link parsing", () => {
  expect(
    parseCanonicalCdpHeaders(
      { Link: "</a>; rel=canonical\n</b>; rel=canonical" },
      url,
    ),
  ).toMatchObject({
    complete: true,
    targets: ["https://example.com/a", "https://example.com/b"],
  });
});
it("does not relax raw HTTP field newline rejection", () => {
  expect(
    parseCanonicalLinkHeaders(["</a>; rel=canonical\n</b>; rel=canonical"], url)
      .complete,
  ).toBe(false);
});
it("keeps malformed fields incomplete while retaining a separate valid field", () => {
  expect(
    parseCanonicalCdpHeaders({ link: '</a>; rel=canonical\n</b>; rel="' }, url),
  ).toMatchObject({ complete: false, targets: ["https://example.com/a"] });
});
it("does not silently repair CR or malformed unquoted media types", () => {
  for (const link of [
    "</a>; rel=canonical\r\n</b>; rel=canonical",
    "</font>; rel=preload; type=font/woff2",
  ])
    expect(parseCanonicalCdpHeaders({ link }, url).complete).toBe(false);
});
it("supports no Link header without exposing other headers", () => {
  const result = parseCanonicalCdpHeaders(
    { "Set-Cookie": "private-fixture" },
    url,
  );
  expect(result).toEqual({ complete: true, targets: [], pending: [] });
});
it("rejects invalid native maps and bounded field sets", () => {
  for (const headers of [null, [], { Link: 3 }, { Link: "x".repeat(65537) }])
    expect(() => parseCanonicalCdpHeaders(headers, url)).toThrow();
});
