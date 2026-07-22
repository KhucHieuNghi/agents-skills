import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  atomicWrite,
  isPrivateAddress,
  normalizeBrandCandidate,
  parseDesignMd,
  renderBrandCss,
  sanitizeBrandUrl,
  serializeDesignMd,
  validateBrandProfile,
} from "../skills/html-docs-standard/scripts/lib/brand-profile.mjs";

describe("HTML documentation brand profile core", () => {
  it("sanitizes brand provenance to a public HTTP origin", () => {
    expect(
      sanitizeBrandUrl("https://brand.example/path?campaign=one#hero"),
    ).toEqual({
      url: "https://brand.example/",
      origin: "https://brand.example",
    });
    expect(() =>
      sanitizeBrandUrl(["https://user", ":pass@brand.example"].join("")),
    ).toThrow(/credentials/i);
    expect(() => sanitizeBrandUrl("file:///tmp/site.html")).toThrow(/HTTP/i);
  });

  it("rejects loopback, link-local, and private address ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.1.2",
      "192.168.1.2",
      "169.254.1.2",
      "::1",
      "fc00::1",
      "fe80::1",
    ]) {
      expect(isPrivateAddress(address)).toBe(true);
    }
    expect(isPrivateAddress("203.0.113.10")).toBe(false);
  });

  it("normalizes a partial candidate into a valid accessible profile", () => {
    const profile = normalizeBrandCandidate({
      brandName: "Example Brand",
      colors: { primary: "#225588", surface: "#ffffff" },
      typography: { bodyFamily: "Example Sans" },
    });

    expect(profile.colors.primary).toBe("#225588");
    expect(profile.colors["on-primary"]).toMatch(/^#/);
    expect(profile.typography["body-md"].fontFamily).toContain("system-ui");
    expect(validateBrandProfile(profile)).toEqual([]);

    const roundTrip = parseDesignMd(serializeDesignMd(profile));
    expect(roundTrip).toEqual(profile);
    expect(renderBrandCss(profile)).toContain("--brand-primary: #225588;");
  });

  it("uses a readable on-primary token for a light primary color", () => {
    const profile = normalizeBrandCandidate({
      brandName: "Example Brand",
      colors: { primary: "#f4e85d", surface: "#ffffff" },
      typography: {},
    });
    expect(profile.colors["on-primary"]).toBe("#17212b");
  });

  it("does not duplicate an existing generic font family fallback", () => {
    const profile = normalizeBrandCandidate({
      brandName: "Generic Documentation",
      colors: {},
      typography: {},
    });
    expect(profile.typography["body-md"].fontFamily).toBe(
      "ui-sans-serif, system-ui, sans-serif",
    );
  });

  it("keeps the saved brand name on one state-safe line", () => {
    const profile = normalizeBrandCandidate({
      brandName: " Example\n  Brand ",
      colors: {},
      typography: {},
    });
    expect(profile.name).toBe("Example Brand");
    expect(serializeDesignMd(profile)).not.toContain("Example\n");
  });

  it("reports malformed required groups and tokens", () => {
    const profile = normalizeBrandCandidate({
      brandName: "Example Brand",
      colors: {},
      typography: {},
    });
    profile.colors.primary = "not-a-color";
    delete profile.typography["body-md"];

    expect(validateBrandProfile(profile)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/primary/i),
        expect.stringMatching(/body-md/i),
      ]),
    );
  });

  it("atomically replaces a sibling file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "brand-profile-"));
    const file = join(directory, "DESIGN.md");
    await atomicWrite(file, "first");
    await atomicWrite(file, "second");
    expect(await readFile(file, "utf8")).toBe("second");
    expect(
      (await readdir(directory)).filter((name) => name.includes(".tmp")),
    ).toEqual([]);
  });
});
