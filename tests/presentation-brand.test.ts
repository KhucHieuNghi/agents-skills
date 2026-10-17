import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import { createPresentationBrand } from "../skills/presentation-brand/scripts/lib/brand.mjs";

const directories: string[] = [];
async function outputDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "presentation-brand-"));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const publicLookup = async () => [{ address: "203.0.113.10", family: 4 }];
const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
  "base64",
);

it("extracts first-party colors and a raster logo into local files", async () => {
  const directory = await outputDirectory();
  const logo = validPng;
  const fetchImpl = async (input: string | URL) => {
    const url = String(input);
    if (url === "https://example.com/") {
      return new Response(
        '<link rel="stylesheet" href="/brand.css"><header><img alt="Example logo" src="/logo.png"></header>',
        { headers: { "content-type": "text/html" } },
      );
    }
    if (url === "https://example.com/brand.css") {
      return new Response(":root{--brand-primary:#174f7b;--surface:#ffffff}", {
        headers: { "content-type": "text/css" },
      });
    }
    if (url === "https://example.com/logo.png") {
      return new Response(logo, { headers: { "content-type": "image/png" } });
    }
    throw new Error(`unexpected request ${url}`);
  };
  const profile = await createPresentationBrand({
    title: "A specific problem",
    brandName: "Example",
    website: "https://example.com/deep/path?secret=1",
    outputDirectory: directory,
    fetchImpl,
    lookupImpl: publicLookup,
  });

  expect(profile).toMatchObject({
    name: "Example",
    status: "official-source",
    source: {
      origin: "https://example.com",
      logoUrl: "https://example.com/logo.png",
    },
    logo: { path: "logo.png", kind: "official" },
    colors: { primary: "#174f7b" },
  });
  expect(await readFile(join(directory, "logo.png"))).toEqual(
    Buffer.from(logo),
  );
  expect(
    JSON.parse(await readFile(join(directory, "brand.json"), "utf8")),
  ).toEqual(profile);
  expect(JSON.stringify(profile)).not.toContain("secret=1");
});

it("refuses private destinations before fetching and private redirects", async () => {
  const directory = await outputDirectory();
  await expect(
    createPresentationBrand({
      title: "Problem",
      website: "http://127.0.0.1/",
      outputDirectory: directory,
    }),
  ).rejects.toThrow(/private|prohibited/i);

  await expect(
    createPresentationBrand({
      title: "Problem",
      website: "https://example.com/",
      outputDirectory: directory,
      lookupImpl: publicLookup,
      fetchImpl: async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/internal" },
        }),
    }),
  ).rejects.toThrow(/private|prohibited/i);
});

it("rejects active SVG and writes a generated logo while keeping sourced colors", async () => {
  const directory = await outputDirectory();
  const profile = await createPresentationBrand({
    title: "Problem",
    brandName: "Example",
    website: "https://example.com",
    outputDirectory: directory,
    lookupImpl: publicLookup,
    fetchImpl: async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("logo.svg")) {
        return new Response("<svg><script>alert(1)</script></svg>", {
          headers: { "content-type": "image/svg+xml" },
        });
      }
      return new Response(
        '<style>:root{--brand-primary:#174f7b}</style><header><img alt="Example logo" src="/logo.svg"></header>',
        { headers: { "content-type": "text/html" } },
      );
    },
  });
  expect(profile.status).toBe("official-source");
  expect(profile.logo).toMatchObject({ path: "logo.svg", kind: "provisional" });
  expect(await readFile(join(directory, "logo.svg"), "utf8")).not.toContain(
    "<script",
  );
});

it("does not accept a truncated raster asset as the official logo", async () => {
  const directory = await outputDirectory();
  const profile = await createPresentationBrand({
    title: "Problem",
    brandName: "Example",
    website: "https://example.com",
    outputDirectory: directory,
    lookupImpl: publicLookup,
    fetchImpl: async (input: string | URL) =>
      String(input).endsWith("logo.png")
        ? new Response(
            Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]),
            { headers: { "content-type": "image/png" } },
          )
        : new Response(
            '<header><img alt="Example logo" src="/logo.png"></header>',
            { headers: { "content-type": "text/html" } },
          ),
  });
  expect(profile.logo.kind).toBe("provisional");
  expect(profile.logo.path).toBe("logo.svg");
});

it("uses readable wordmark text on a dark sourced surface", async () => {
  const directory = await outputDirectory();
  const profile = await createPresentationBrand({
    title: "Problem",
    brandName: "Example",
    website: "https://example.com",
    outputDirectory: directory,
    lookupImpl: publicLookup,
    fetchImpl: async () =>
      new Response(
        "<style>:root{--brand-primary:#eeeeee;--surface:#111111;--text:#222222}</style>",
        { headers: { "content-type": "text/html" } },
      ),
  });
  const svg = await readFile(join(directory, "logo.svg"), "utf8");
  expect(profile.colors.text).toBe("#ffffff");
  expect(svg).toContain('fill="#ffffff">Example</text>');
});

it("generates stable provisional identity and a contrasting palette without a brand", async () => {
  const first = await createPresentationBrand({
    title: "Missing handoff",
    outputDirectory: await outputDirectory(),
  });
  const second = await createPresentationBrand({
    title: "Missing handoff",
    outputDirectory: await outputDirectory(),
  });
  expect(first.status).toBe("provisional");
  expect(first.name).toBeTruthy();
  expect(first).toEqual(second);
  expect(first.logo.kind).toBe("provisional");
  expect(first.note).toMatch(/provisional/i);
  expect(first.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
  expect(first.colors.onPrimary).toMatch(/^#[0-9a-f]{6}$/);
});

it("reuses a local brand profile without network access until refresh", async () => {
  const directory = await outputDirectory();
  const original = await createPresentationBrand({
    title: "Problem",
    outputDirectory: directory,
  });
  const reused = await createPresentationBrand({
    title: "Changed title",
    website: "https://example.com",
    outputDirectory: directory,
    fetchImpl: async () => {
      throw new Error("network should not be used");
    },
  });
  expect(reused).toEqual(original);
  await writeFile(join(directory, "brand.json"), "not json");
  await expect(
    createPresentationBrand({ title: "Problem", outputDirectory: directory }),
  ).rejects.toThrow(/brand profile/i);
});

it("creates an offline provisional brand from the CLI", async () => {
  const directory = await outputDirectory();
  execFileSync(
    "node",
    [
      "skills/presentation-brand/scripts/brand.mjs",
      "--title",
      "A concrete problem",
      "--output-dir",
      directory,
    ],
    { stdio: "pipe" },
  );
  const profile = JSON.parse(
    await readFile(join(directory, "brand.json"), "utf8"),
  );
  expect(profile.status).toBe("provisional");
  expect(await readFile(join(directory, profile.logo.path), "utf8")).toContain(
    "<svg",
  );
});
