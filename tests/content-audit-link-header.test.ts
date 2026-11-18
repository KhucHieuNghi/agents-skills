import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
// @ts-expect-error development ESM parser
import { parseCanonicalLinkHeaders as parse } from "../scripts/enterprise-technical-seo/link-header.mjs";
const base = "https://example.com/docs/page";
it("supports absent headers and complete canonical extraction", () => {
  expect(parse([], base)).toEqual({ complete: true, targets: [], pending: [] });
  expect(parse(['</canonical>; rel="canonical"'], base)).toEqual({
    complete: true,
    targets: ["https://example.com/canonical"],
    pending: [],
  });
});
it("resolves targets against the final response URL", () => {
  expect(parse(["<other>; rel=canonical"], base).targets).toEqual([
    "https://example.com/docs/other",
  ]);
});
it("handles commas inside targets and quoted escaped titles", () => {
  expect(
    parse(
      [
        '<https://example.com/a,b>; rel="canonical"; title="One, \\"two\\"", </next>; rel=next',
      ],
      base,
    ),
  ).toMatchObject({ complete: true, targets: ["https://example.com/a,b"] });
});
it("supports multiple fields, case and relation token lists", () => {
  expect(
    parse(['</a>; REL="alternate Canonical"', "</a>; rel=canonical"], base),
  ).toEqual({
    complete: true,
    targets: ["https://example.com/a"],
    pending: [],
  });
});
it("preserves distinct targets for downstream conflict evaluation", () => {
  expect(
    parse(["</a>; rel=canonical, </b>; rel=canonical"], base).targets,
  ).toHaveLength(2);
});
it.each([
  'anchor="/different"',
  "media=print",
  'type="text/html"',
  "hreflang=en",
  "unknown=thing",
  "title*=UTF-8%27en%27name",
])("keeps unsupported attribute %s incomplete", (attribute) => {
  expect(parse(["</a>; rel=canonical; " + attribute], base)).toMatchObject({
    complete: false,
    targets: [],
  });
});
it.each([
  "rel=alternate; rel=canonical",
  "rel=canonical; rel=alternate",
  "rel=canonical; REL=canonical",
])("does not derive canonical from duplicate relation %s", (parameters) => {
  expect(parse(["</a>; " + parameters], base)).toMatchObject({
    complete: false,
    targets: [],
  });
});
it.each([
  '</a>; rel="canonical',
  "</a>; rel=canonical, invalid",
  "</a>; rel=",
  "</a> unexpected",
  '</a>; rel=" canonical"',
  '</a>; rel="canonical\tother"',
])("keeps malformed field incomplete: %s", (value) => {
  expect(parse([value], base)).toMatchObject({ complete: false, targets: [] });
});
it("retains independently parsed fields when one field is malformed", () => {
  expect(
    parse(['</bad>; rel="', "</valid>; rel=canonical"], base),
  ).toMatchObject({ complete: false, targets: ["https://example.com/valid"] });
});
it("keeps fragments for the target-format evaluator", () => {
  expect(parse(["</a#fragment>; rel=canonical"], base).targets).toEqual([
    "https://example.com/a#fragment",
  ]);
});
it.each([
  "javascript:alert(1)",
  "https:example.com",
  "/a b",
  "/bad%zz",
  "/a\\b",
  "https://[invalid",
  "/é",
])("does not silently repair unsupported URI %s", (uri) => {
  expect(parse(["<" + uri + ">; rel=canonical"], base)).toMatchObject({
    complete: false,
    targets: [],
  });
});
it("excludes credential targets without diagnostic disclosure", () => {
  const url = new URL(base);
  url.username = "fixture-user";
  url.password = "private-fixture-value";
  const result = parse(["<" + url.href + ">; rel=canonical"], base);
  expect(result.complete).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private-fixture-value");
});
it("rejects invalid caller inputs with fixed errors", () => {
  for (const [values, url] of [
    [null, base],
    [[], "https://[private-fixture-value"],
    [Array(101).fill(""), base],
    [["x".repeat(65537)], base],
  ]) {
    expect(() => parse(values, url)).toThrow();
    try {
      parse(values, url);
    } catch (e) {
      expect(String(e)).not.toContain("private-fixture-value");
    }
  }
});
it("caps total links across fields", () => {
  expect(
    parse([Array(101).fill("</a>; rel=canonical").join(",")], base),
  ).toMatchObject({ complete: false, targets: [] });
});

it("accepts multiple spaces separating registered relations", () => {
  expect(parse(['</a>; rel="canonical  alternate"'], base)).toMatchObject({
    complete: true,
    targets: ["https://example.com/a"],
  });
});

it.each(["1:abc", ":abc"])(
  "rejects illegal colon in first relative segment %s",
  (uri) => {
    expect(parse(["<" + uri + ">; rel=canonical"], base)).toMatchObject({
      complete: false,
      targets: [],
    });
  },
);
it("accepts a colon in an explicitly relative subsequent segment", () => {
  expect(parse(["<./1:abc>; rel=canonical"], base)).toMatchObject({
    complete: true,
    targets: ["https://example.com/docs/1:abc"],
  });
});
it.each([
  "x:%ZZ",
  "https://[invalid",
  "urn:{bad}",
  "https://example.com/relation",
])("keeps unsupported extension relations incomplete %s", (relation) => {
  expect(parse(['</a>; rel="canonical ' + relation + '"'], base)).toMatchObject(
    { complete: false, targets: [] },
  );
});

it("parses repeated Link fields from a native loopback HTTP response", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, {
      Link: ['</a,b>; rel="canonical"; title="A, B"', "</next>; rel=next"],
    });
    res.end("fixture");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing loopback port");
    const url = `http://127.0.0.1:${address.port}/page`;
    const response = await fetch(url);
    await response.text();
    const value = response.headers.get("link");
    expect(value).not.toBeNull();
    expect(parse([value], response.url)).toEqual({
      complete: true,
      targets: [`http://127.0.0.1:${address.port}/a,b`],
      pending: [],
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
