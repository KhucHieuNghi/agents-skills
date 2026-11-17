import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile, readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { parseSitemap } from "../skills/content-search-audit/scripts/lib/sitemap.mjs";
import { discoverInventory } from "../skills/content-search-audit/scripts/lib/discovery.mjs";
import {
  startCampaign,
  resumeCampaign,
  validateCampaign,
} from "../skills/content-search-audit/scripts/lib/campaign.mjs";
import { reviewCampaignParts } from "../skills/content-search-audit/scripts/lib/campaign-part-review.mjs";
import { loadAuditData } from "../skills/content-search-audit/scripts/lib/validate.mjs";
import { startAudit } from "../skills/content-search-audit/scripts/lib/run.mjs";
const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
const xml = (body: string) => `<urlset xmlns="${ns}">${body}</urlset>`;
const source = (id: string, kind: string, data: Record<string, unknown>) => ({
  id,
  kind,
  locator: `https://example.com/${id}`,
  collectedAt: "2026-11-16T00:00:00Z",
  complete: true,
  ...data,
});
it("parses namespaced sitemap locations without confusing extension locations", () => {
  const parsed = parseSitemap(
    `<?xml version="1.0" encoding="UTF-8"?><s:urlset xmlns:s="${ns}" xmlns:image="https://example.com/image"><s:url><s:loc>https://example.com/a?a=1&amp;b=&#50;</s:loc><image:image><image:loc>https://example.com/image.png</image:loc></image:image></s:url></s:urlset>`,
  );
  expect(parsed.locations).toEqual(["https://example.com/a?a=1&b=2"]);
  expect(
    parseSitemap(
      xml("<url><loc><![CDATA[https://example.com/a?x=1&y=2]]></loc></url>"),
    ).locations,
  ).toHaveLength(1);
  expect(
    parseSitemap(
      `<sitemapindex xmlns="${ns}"><sitemap><loc>https://example.com/child.xml</loc></sitemap></sitemapindex>`,
    ).kind,
  ).toBe("sitemapindex");
});
it("rejects malformed, externally expanded and ambiguous XML rather than silently truncating inventory", () => {
  for (const invalid of [
    '<!DOCTYPE urlset [<!ENTITY x SYSTEM "file:///etc/passwd">]>' +
      xml("<url><loc>&x;</loc></url>"),
    xml(
      "<url><loc>https://example.com/a</loc><loc>https://example.com/b</loc></url>",
    ),
    xml("<url><loc>https://example.com/a</loc></wrong>"),
    xml("<url><loc>https://example.com/a?x=1&bad=2</loc></url>"),
    xml("<url><loc><nested>https://example.com/</nested></loc></url>"),
    xml("<url><loc>https://" + "user:password@example.com/a</loc></url>"),
    "<urlset><url><loc>https://example.com/a</loc></url></urlset>",
    xml("<url><loc>https://example.com/a</loc></url>") + xml(""),
    xml("<url><loc>https://example.com/a</loc></url>").slice(0, -3),
    xml("<url><loc>https://example.com/&#0;</loc></url>"),
  ])
    expect(() => parseSitemap(invalid)).toThrow();
});
it("unions sitemap CMS repository and analytics snapshots while preserving aliases and variants", () => {
  const result = discoverInventory({
    scopeComplete: true,
    expectedSourceIds: ["site", "cms", "repo", "analytics"],
    trackingParameters: ["utm_source"],
    sources: [
      source("site", "sitemap-xml", {
        content: xml("<url><loc>https://example.com/a</loc></url>"),
      }),
      source("cms", "records", {
        records: [
          {
            uri: "https://example.com/a?utm_source=cms",
            locale: "en",
            canonical: "https://example.com/a",
          },
          {
            uri: "https://example.com/vi/a",
            locale: "vi",
            canonical: "https://example.com/a",
          },
        ],
      }),
      source("repo", "records", {
        records: [{ path: "/project/docs/a.md", type: "documentation" }],
      }),
      source("analytics", "url-list", {
        content: "https://example.com/a\nhttps://example.com/a?version=2\n",
      }),
    ],
  });
  expect(result.inventoryComplete).toBe(true);
  expect(result.inventory).toHaveLength(4);
  expect(
    result.inventory.find((item) => item.uri === "https://example.com/a")
      .sources,
  ).toEqual(["analytics", "cms", "site"]);
  expect(
    result.inventory.find((item) => item.uri === "https://example.com/a")
      .aliases,
  ).toHaveLength(2);
  expect(
    result.sources.every((entry) => /^[a-f0-9]{64}$/.test(entry.snapshotHash)),
  ).toBe(true);
});
it("resolves supplied child sitemaps but leaves missing snapshots and cycles explicit", () => {
  const parent = source("parent", "sitemap-xml", {
    content: `<sitemapindex xmlns="${ns}"><sitemap><loc>https://example.com/child</loc></sitemap></sitemapindex>`,
  });
  const child = source("child", "sitemap-xml", {
    content: xml("<url><loc>https://example.com/a</loc></url>"),
  });
  const config = {
    scopeComplete: true,
    expectedSourceIds: ["parent", "child"],
    sources: [parent, child],
  };
  expect(discoverInventory(config).inventoryComplete).toBe(true);
  const missing = discoverInventory({ ...config, sources: [parent] });
  expect(missing.inventoryComplete).toBe(false);
  expect(missing.pendingQueue.map((entry) => entry.kind)).toEqual(
    expect.arrayContaining(["missing-source", "pending-sitemap"]),
  );
  const cycle = discoverInventory({
    ...config,
    sources: [
      parent,
      {
        ...child,
        content: `<sitemapindex xmlns="${ns}"><sitemap><loc>https://example.com/parent</loc></sitemap></sitemapindex>`,
      },
    ],
  });
  expect(
    cycle.pendingQueue.some((entry) => entry.kind === "sitemap-cycle-or-depth"),
  ).toBe(true);
});
it("accounts for invalid rows partial exports and unconfirmed scope", () => {
  const result = discoverInventory({
    scopeComplete: false,
    expectedSourceIds: ["cms", "bad"],
    sources: [
      source("cms", "records", {
        complete: false,
        records: [
          { uri: "https://example.com/a" },
          { uri: "file:///secret" },
          { path: "relative.md" },
        ],
      }),
      source("bad", "sitemap-xml", { content: "<broken>" }),
    ],
  });
  expect(result.inventory).toHaveLength(1);
  expect(result.sources[0].rejectedRows).toBe(2);
  expect(result.inventoryComplete).toBe(false);
  expect(result.pendingQueue.map((entry) => entry.kind)).toEqual(
    expect.arrayContaining([
      "source-incomplete",
      "invalid-source-row",
      "source-parse-failure",
      "scope-unconfirmed",
    ]),
  );
});
it("runs discovery through the standalone CLI without fetching listed URLs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "discovery-cli-"));
  try {
    const config = path.join(root, "config.json");
    await writeFile(
      config,
      JSON.stringify({
        scopeComplete: true,
        expectedSourceIds: ["export"],
        sources: [
          source("export", "url-list", {
            content: "https://example.invalid/a\n",
          }),
        ],
      }),
    );
    const { stdout } = await promisify(execFile)(process.execPath, [
      path.resolve("skills/content-search-audit/scripts/audit.mjs"),
      "discover",
      config,
    ]);
    expect(JSON.parse(stdout).inventory[0].uri).toBe(
      "https://example.invalid/a",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function discoveryCampaign(root: string) {
  const file = path.join(root, "content.md");
  await writeFile(file, "# Local fixture");
  const discovery = {
    scopeComplete: true,
    expectedSourceIds: ["repo", "cms"],
    sources: [source("repo", "records", { records: [{ path: file }] })],
  };
  const result = discoverInventory(discovery);
  // Authorize only the source file; output siblings are outside that root.
  return {
    inputs: result.inputs,
    inventoryComplete: result.inventoryComplete,
    localRoots: [file],
    discovery,
  };
}
it("persists discovery once at campaign scope through continuation and local review", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "discovery-campaign-"));
  try {
    const config = await discoveryCampaign(root);
    const initial = await startCampaign(config, path.join(root, "initial"));
    expect(initial.coverage.pendingQueue).toContainEqual(
      expect.objectContaining({
        kind: "discovery",
        discoveryKind: "missing-source",
        sourceId: "cms",
      }),
    );
    const manifest = JSON.parse(
      await readFile(path.join(initial.directory, "campaign.json"), "utf8"),
    );
    const part = manifest.parts[0];
    expect(
      JSON.parse(
        await readFile(
          path.join(initial.directory, part.path, "config.json"),
          "utf8",
        ),
      ).discovery,
    ).toBeUndefined();
    const resumed = await resumeCampaign(
      initial.directory,
      path.join(root, "resumed"),
    );
    expect(resumed.coverage.pendingQueue).toEqual(
      initial.coverage.pendingQueue,
    );
    const audit = await loadAuditData(path.join(initial.directory, part.path));
    const revised = await reviewCampaignParts(
      initial.directory,
      {
        schemaVersion: 1,
        campaignId: initial.campaignId,
        sourceManifestHash: createHash("sha256")
          .update(await readFile(path.join(initial.directory, "campaign.json")))
          .digest("hex"),
        parts: [
          {
            path: part.path,
            sourceSnapshotHash: createHash("sha256")
              .update(JSON.stringify(audit))
              .digest("hex"),
            bundle: { reviews: [] },
          },
        ],
      },
      path.join(root, "reviewed"),
    );
    expect(revised.coverage.pendingQueue).toEqual(
      initial.coverage.pendingQueue,
    );
    expect((await validateCampaign(revised.directory)).valid).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("rejects completeness overrides, dropped discovery inputs and standalone queue loss before output", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "discovery-guard-"));
  try {
    const config = await discoveryCampaign(root);
    for (const changed of [
      { ...config, inventoryComplete: true },
      { ...config, inputs: [] },
    ]) {
      await expect(
        startCampaign(changed, path.join(root, "invalid")),
      ).rejects.toThrow(/discovery/i);
      await expect(access(path.join(root, "invalid"))).rejects.toThrow();
    }
    await expect(
      startAudit(config, path.join(root, "standalone")),
    ).rejects.toThrow(/campaign/);
    await expect(access(path.join(root, "standalone"))).rejects.toThrow();
    const campaign = await startCampaign(config, path.join(root, "valid"));
    const file = path.join(campaign.directory, "campaign.json");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    manifest.discovery.pendingQueue = [];
    await writeFile(file, JSON.stringify(manifest));
    const checked = await validateCampaign(campaign.directory);
    expect(checked.valid).toBe(false);
    expect(checked.errors.join(" ")).toMatch(/discovery receipt/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("recomputes a fresh campaign from completed source snapshots without mutating prior discovery", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "discovery-refresh-"));
  try {
    const config = await discoveryCampaign(root);
    const original = await startCampaign(config, path.join(root, "original"));
    const complete = {
      ...config.discovery,
      sources: [
        ...config.discovery.sources,
        source("cms", "records", { records: [] }),
      ],
    };
    const result = discoverInventory(complete);
    const fresh = await startCampaign(
      {
        ...config,
        discovery: complete,
        inputs: result.inputs,
        inventoryComplete: result.inventoryComplete,
      },
      path.join(root, "fresh"),
    );
    expect(fresh.coverage.inventoryComplete).toBe(true);
    expect(fresh.coverage.pendingQueue).toEqual([]);
    expect(
      (await validateCampaign(original.directory)).coverage.inventoryComplete,
    ).toBe(false);
    expect(
      (await validateCampaign(original.directory)).coverage.pendingQueue,
    ).toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("ingests captured HTML links with provenance and keeps rendering gaps in durable discovery", () => {
  const request = {
    scopeComplete: true,
    expectedSourceIds: ["page"],
    sources: [
      source("page", "html-links", {
        locator: "https://example.com/start",
        content:
          '<base href="/docs/"><a href="guide">Guide</a><script>const x="<a href=/fake>";</script>',
      }),
    ],
  };
  const result = discoverInventory(request);
  expect(result.inventory.map((item) => item.uri).sort()).toEqual([
    "https://example.com/docs/guide",
    "https://example.com/start",
  ]);
  expect(result.inventoryComplete).toBe(false);
  expect(result.pendingQueue).toContainEqual(
    expect.objectContaining({ kind: "rendering-unreviewed", sourceId: "page" }),
  );
  expect(result.sources[0].linkExtraction.links).toHaveLength(1);
  const staticResult = discoverInventory({
    ...request,
    sources: [{ ...request.sources[0], content: '<a href="/plain">Plain</a>' }],
  });
  expect(staticResult.inventoryComplete).toBe(true);
});
