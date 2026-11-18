import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { expandJsonLdOffline } from "../scripts/enterprise-technical-seo/jsonld-expansion.mjs";
const context = {
  "@vocab": "https://schema.org/",
  id: "@id",
  type: "@type",
  label: "name",
};
const input = (doc: unknown) => ({
  documentText: JSON.stringify(doc),
  baseUrl: "https://example.com/page",
  contexts: [],
  timeoutMs: 3000,
});
it("expands aliases and merges same-id nodes into a flattened graph", async () => {
  const r = await expandJsonLdOffline(
    input({
      "@context": context,
      "@graph": [
        { id: "#item", type: "Product", label: "A" },
        { id: "#item", description: "B" },
      ],
    }),
  );
  expect(r.status).toBe("expanded");
  expect(r.graph).toHaveLength(1);
  expect(r.graph[0]["@id"]).toBe("https://example.com/page#item");
  expect(r.graph[0]["https://schema.org/name"]).toEqual([{ "@value": "A" }]);
  expect(r.graph[0]["https://schema.org/description"]).toEqual([
    { "@value": "B" },
  ]);
});
it("uses supplied hashed contexts without live retrieval", async () => {
  const c = JSON.stringify({ "@context": context });
  const x = input({
    "@context": "https://contexts.example/schema",
    type: "Product",
    label: "A",
  });
  const r = await expandJsonLdOffline({
    ...x,
    contexts: [
      {
        url: "https://contexts.example/schema",
        documentText: c,
        sha256: createHash("sha256").update(c).digest("hex"),
      },
    ],
  });
  expect(r.status).toBe("expanded");
  expect(r.contextDigests).toHaveLength(1);
  expect(r.executionAuthenticated).toBe(false);
});
it("never fetches a missing remote context", async () => {
  let requests = 0;
  const server = createServer((_req, res) => {
    requests++;
    res.end("{}");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    const address = server.address() as { port: number };
    const r = await expandJsonLdOffline(
      input({
        "@context": `http://127.0.0.1:${address.port}/private-token`,
        name: "secret",
      }),
    );
    expect(r.status).toBe("unknown");
    expect(r.reason).toBe("offline-context-unavailable");
    expect(requests).toBe(0);
    expect(JSON.stringify(r)).not.toContain("private-token");
    expect(r.graph).toBeNull();
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
it("does not silently discard undefined properties", async () => {
  const r = await expandJsonLdOffline(input({ unmapped: "PRIVATE" }));
  expect(r.status).toBe("unknown");
  expect(JSON.stringify(r)).not.toContain("PRIVATE");
});
it.each(['{"@id":"a","@id":"b"}', '{"x":1e999}', "{bad"])(
  "rejects ambiguous or invalid source without echoing %s",
  async (documentText) => {
    const r = await expandJsonLdOffline({ ...input({}), documentText });
    expect(r.status).toBe("unknown");
    expect(r.graph).toBeNull();
  },
);
it("keeps named graphs and list order distinct", async () => {
  const r = await expandJsonLdOffline(
    input({
      "@context": context,
      "@id": "#graph",
      "@graph": [
        {
          id: "#list",
          type: "ItemList",
          itemListElement: { "@list": ["b", "a"] },
        },
      ],
    }),
  );
  expect(r.status).toBe("expanded");
  expect(
    r.graph[0]["@graph"][0]["https://schema.org/itemListElement"][0]["@list"],
  ).toEqual([{ "@value": "b" }, { "@value": "a" }]);
});
it("bounds worker lifetime and input size", async () => {
  const r = await expandJsonLdOffline({
    ...input({ "@context": context, type: "Thing" }),
    timeoutMs: 1,
  });
  expect(r.status).toBe("unknown");
  expect(r.reason).toBe("expansion-deadline");
  await expect(
    expandJsonLdOffline({
      ...input({}),
      documentText: " ".repeat(256 * 1024 + 1),
    }),
  ).rejects.toThrow();
});
it("rejects duplicate context URLs, tampering and unsafe base URLs", async () => {
  const doc = JSON.stringify({ "@context": context }),
    c = {
      url: "https://contexts.example/",
      documentText: doc,
      sha256: createHash("sha256").update(doc).digest("hex"),
    };
  await expect(
    expandJsonLdOffline({ ...input({}), contexts: [c, c] }),
  ).rejects.toThrow();
  await expect(
    expandJsonLdOffline({
      ...input({}),
      contexts: [{ ...c, sha256: "0".repeat(64) }],
    }),
  ).rejects.toThrow();
  await expect(
    expandJsonLdOffline({
      ...input({}),
      baseUrl: ["https://", "user", ":", "secret", "@example.com/"].join(""),
    }),
  ).rejects.toThrow();
});

it("binds the base URL and produced graph in private provenance", async () => {
  const doc = input({ "@context": context, id: "#x", type: "Thing" });
  const a = await expandJsonLdOffline(doc),
    b = await expandJsonLdOffline({
      ...doc,
      baseUrl: "https://other.example/page",
    });
  expect(a.baseUrlHash).not.toBe(b.baseUrlHash);
  expect(a.inputDigest).not.toBe(b.inputDigest);
  expect(a.graphHash).toBe(
    createHash("sha256").update(JSON.stringify(a.graph)).digest("hex"),
  );
});
it("bounds serialized graph output after expansion", async () => {
  const r = await expandJsonLdOffline(
    input({
      "@context": { p: "https://example.com/" + "a".repeat(10000) },
      "@graph": Array.from({ length: 300 }, (_, i) => ({
        "@id": "#" + i,
        p: "value",
      })),
    }),
  );
  expect(r.status).toBe("unknown");
  expect(r.reason).toBe("expansion-output-budget");
  expect(r.graph).toBeNull();
});

it("applies property-scoped context and preserves literal datatypes", async () => {
  const r = await expandJsonLdOffline(
    input({
      "@context": {
        child: {
          "@id": "https://schema.org/child",
          "@context": {
            label: "https://schema.org/name",
            number: "https://schema.org/value",
          },
        },
      },
      child: {
        label: "A",
        number: {
          "@value": "2",
          "@type": "http://www.w3.org/2001/XMLSchema#integer",
        },
      },
    }),
  );
  expect(r.status).toBe("expanded");
  const child = r.graph.find(
    (n: Record<string, unknown>) => n["https://schema.org/name"],
  );
  expect(child["https://schema.org/value"]).toEqual([
    { "@value": "2", "@type": "http://www.w3.org/2001/XMLSchema#integer" },
  ]);
});
it("refuses unsupplied imported context without exposing its URL", async () => {
  const r = await expandJsonLdOffline(
    input({
      "@context": {
        "@import": "https://contexts.example/PRIVATE_CONTEXT",
        label: "https://schema.org/name",
      },
      label: "A",
    }),
  );
  expect(r.status).toBe("unknown");
  expect(r.reason).toBe("offline-context-unavailable");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_CONTEXT");
});
it("does not treat a supplied top-level JSON string as a document URL", async () => {
  const r = await expandJsonLdOffline(
    input("https://example.com/PRIVATE_DOCUMENT"),
  );
  expect(r.status).toBe("unknown");
  expect(JSON.stringify(r)).not.toContain("PRIVATE_DOCUMENT");
});
