import { describe, expect, it, vi } from "vitest";
import worker from "../src/worker.js";

const env = {
  PRODUCTION_ORIGIN: "https://nkskills.getgroove.me",
  ASSETS: {
    fetch: vi.fn(
      async () =>
        new Response("<html>OK</html>", {
          headers: { "Content-Type": "text/html" },
        }),
    ),
  },
};

describe("site Worker", () => {
  it("redirects the root path to English", async () => {
    const response = await worker.fetch(
      new Request("https://nkskills.getgroove.me/"),
      env,
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(
      "https://nkskills.getgroove.me/en/",
    );
  });

  it("keeps the production origin indexable and sets security headers", async () => {
    const response = await worker.fetch(
      new Request("https://nkskills.getgroove.me/en/"),
      env,
    );
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
  });

  it("adds noindex on a preview hostname even for an existing HTML asset", async () => {
    const response = await worker.fetch(
      new Request("https://preview.example.workers.dev/en/"),
      env,
    );
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
