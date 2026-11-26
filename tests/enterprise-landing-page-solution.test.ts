import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv";
import { expect, it } from "vitest";
import { verifyComposition } from "../src/composition.js";
import { digestTree } from "../src/integrity.js";
import { loadIndexedSolution } from "../src/solutions.js";
import { loadUpstreams } from "../src/upstreams.js";

const id = "enterprise-landing-page";
const directory = join("skills", id);

it("locks one installable skill and maps all five sources to catalog pins", async () => {
  const manifest = await loadIndexedSolution("catalog.yaml", id);
  expect(manifest.entrypoint).toBe(id);
  expect(manifest.hosts).toEqual(["codex", "claude-code"]);
  expect(manifest.components).toEqual([
    { id, source: "bundled", digest: await digestTree(directory) },
  ]);
  const composition = await verifyComposition(directory);
  expect(composition?.sourceIds).toEqual([
    "copywriting",
    "design-taste-frontend",
    "frontend-design",
    "hallmark",
    "impeccable",
  ]);
  const upstreams = await loadUpstreams("catalog.yaml");
  const { sources } = JSON.parse(
    await readFile(join(directory, "provenance.lock.json"), "utf8"),
  ) as { sources: Array<{ id: string }> };
  for (const source of sources) {
    const upstream = upstreams.get(source.id)!;
    expect(source).toMatchObject({
      repository: upstream.repository,
      revision: upstream.revision,
      skillPath: upstream.skillPath,
      digest: upstream.digest,
      license: upstream.license,
    });
  }
});

it("allows a provisional preview and requires evidence before owner review", async () => {
  const schema = JSON.parse(
    await readFile(join(directory, "references/handoff.schema.json"), "utf8"),
  );
  const validate = new Ajv({ strictTypes: false }).compile(schema);
  const pass = {
    result: "pass",
    evidence: ["evidence.md#browser-run"],
    scope: "/demo",
  };
  const handoff = {
    schemaVersion: 1,
    mode: "build",
    status: "preview",
    scope: {
      audience: "Operations managers",
      offer: "Private demo",
      primaryAction: "See available dates",
      pageLocale: "en",
      target: "/demo",
    },
    preview: "npm run dev",
    changes: [],
    claims: [{ wording: "Available in Vietnam", disposition: "omitted" }],
    assetExceptions: [],
    actions: [{ owner: "Customer", action: "Provide approved booking URL" }],
    checks: {
      "brand-copy": pass,
      build: pass,
      responsive: pass,
      accessibility: pass,
      conversion: {
        result: "pending",
        scope: "/demo",
        evidence: [],
        reason: "Booking URL is provisional",
        nextAction: "Verify the approved URL",
      },
      discoverability: pass,
      performance: pass,
      "privacy-release": pass,
    },
  };
  expect(validate(handoff), JSON.stringify(validate.errors)).toBe(true);
  expect(validate({ ...handoff, status: "ready-for-owner-review" })).toBe(
    false,
  );
  const complete = {
    ...handoff,
    status: "ready-for-owner-review",
    checks: { ...handoff.checks, conversion: pass },
  };
  expect(validate(complete), JSON.stringify(validate.errors)).toBe(true);
  expect(
    validate({
      ...complete,
      checks: { ...complete.checks, responsive: { ...pass, evidence: [] } },
    }),
  ).toBe(false);
  expect(
    validate({
      ...handoff,
      claims: [{ wording: "Guaranteed return", disposition: "approved" }],
    }),
  ).toBe(false);
  expect(validate({ ...complete, mode: "review" })).toBe(false);
});
