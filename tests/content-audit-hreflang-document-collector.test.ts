import { expect, it } from "vitest";
// @ts-expect-error development ESM helper
import { projectRenderedHreflangDocument } from "../scripts/enterprise-technical-seo/hreflang-document-collector.mjs";
it.each(["id", "loaderId", "url", "urlFragment"])(
  "discards projection if navigation %s changes",
  async (key) => {
    let frames = 0,
      detached = false;
    const frame = {
      id: "frame",
      loaderId: "loader",
      url: "https://example.com/",
      urlFragment: "",
    };
    const session = {
      send: async (method: string) => {
        if (method === "Page.getFrameTree")
          return {
            frameTree: {
              frame: frames++ ? { ...frame, [key]: "changed" } : frame,
            },
          };
        if (method === "Page.createIsolatedWorld")
          return { executionContextId: 1 };
        return {
          result: {
            value: {
              complete: true,
              alternates: [
                { language: "en", targetUrl: "https://example.com/" },
              ],
            },
          },
        };
      },
      detach: async () => {
        detached = true;
      },
    };
    const page = { context: () => ({ newCDPSession: async () => session }) };
    const result = await projectRenderedHreflangDocument(
      page,
      "https://example.com/",
    );
    expect(result).toMatchObject({
      complete: false,
      alternates: [],
      pending: ["navigation-changed-during-capture"],
      navigationBinding: null,
    });
    expect(detached).toBe(true);
  },
);
it("does not expose CDP failure payloads", async () => {
  const page = {
    context: () => ({
      newCDPSession: async () => {
        throw new Error("private-protocol-payload");
      },
    }),
  };
  const result = await projectRenderedHreflangDocument(
    page,
    "https://example.com/",
  );
  expect(result.complete).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private-protocol-payload");
});
