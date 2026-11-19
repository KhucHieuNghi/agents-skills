import { expect, it } from "vitest";
// @ts-expect-error development ESM collector helper
import { projectRenderedCanonical } from "../skills/content-search-audit/scripts/lib/technical-seo/document-collector.mjs";
function host(changed: boolean, failure?: string) {
  let frames = 0,
    detached = false;
  const page = {
    context: () => ({
      newCDPSession: async () => ({
        send: async (method: string) => {
          if (failure) throw new Error(failure);
          if (method === "Page.getFrameTree")
            return {
              frameTree: {
                frame: {
                  id: "frame",
                  loaderId: changed && frames++ ? "new" : "original",
                  url: "https://example.com/",
                },
              },
            };
          if (method === "Page.createIsolatedWorld")
            return { executionContextId: 3 };
          return {
            result: {
              value: {
                complete: true,
                targets: ["https://example.com/"],
                pending: [],
              },
            },
          };
        },
        detach: async () => {
          detached = true;
        },
      }),
    }),
  };
  return { page, detached: () => detached };
}
it("rejects same-URL navigation to a different loader during capture", async () => {
  const h = host(true);
  expect(
    await projectRenderedCanonical(h.page, "https://example.com/"),
  ).toMatchObject({
    complete: false,
    targets: [],
    pending: ["navigation-changed-during-capture"],
    navigationBinding: null,
  });
  expect(h.detached()).toBe(true);
});
it("retains the isolated realm and stable frame identity", async () => {
  const h = host(false);
  expect(
    await projectRenderedCanonical(h.page, "https://example.com/"),
  ).toMatchObject({
    complete: true,
    navigationBinding: {
      frameId: "frame",
      loaderId: "original",
      realm: "chromium-isolated-world",
    },
  });
  expect(h.detached()).toBe(true);
});
it("does not leak protocol exception content", async () => {
  const h = host(false, "private-fixture-marker");
  const result = await projectRenderedCanonical(h.page, "https://example.com/");
  expect(result.complete).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private-fixture-marker");
  expect(h.detached()).toBe(true);
});
it("does not create a session for invalid argument shape", async () => {
  const result = await projectRenderedCanonical(null, {});
  expect(result.pending).toEqual(["invalid-response-url"]);
});
