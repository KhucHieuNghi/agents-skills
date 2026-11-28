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

it("locks one installable skill and maps adapted guidance to pinned sources", async () => {
  const manifest = await loadIndexedSolution("catalog.yaml", id);
  expect(manifest.entrypoint).toBe(id);
  expect(manifest.version).toBe("0.2.0");
  expect(manifest.hosts).toEqual(["codex", "claude-code"]);
  expect(manifest.components).toEqual([
    { id, source: "bundled", digest: await digestTree(directory) },
  ]);
  const composition = await verifyComposition(directory);
  expect(composition?.sourceIds).toEqual([
    "copywriting",
    "cro",
    "design-taste-frontend",
    "frontend-design",
    "hallmark",
    "impeccable",
    "product-marketing",
    "web-interface-guidelines",
  ]);
  const upstreams = await loadUpstreams("catalog.yaml");
  const { sources } = JSON.parse(
    await readFile(join(directory, "provenance.lock.json"), "utf8"),
  ) as { sources: Array<{ id: string; kind?: string }> };
  for (const source of sources) {
    if (source.kind === "data") {
      expect(source).toMatchObject({
        id: "web-interface-guidelines",
        version: "434b7f91364665f2f733b310ec54809bf8f37937",
        digest:
          "d246b026f4f29b5823a9cc857f9edf3d2507002e055e32040cadeaf3b38e0234",
        license: "MIT",
      });
      continue;
    }
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
    schemaVersion: 2,
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
    direction: {
      concept: "Demonstrate the dispatch board using a real route change",
      signature: "Approved dispatch board screenshot",
      rationale: "Shows the operations manager how to reroute a driver",
    },
    browserEvidence: {
      target: "/demo",
      environment: "Chromium on local preview",
      viewports: {
        "320": "evidence/320.png",
        "390": "evidence/390.png",
        "768": "evidence/768.png",
        "1440": "evidence/1440.png",
      },
      motion: {
        default: "evidence/motion-default.png",
        reduced: "evidence/motion-reduced.png",
      },
    },
  };
  expect(validate(complete), JSON.stringify(validate.errors)).toBe(true);
  expect(validate({ ...complete, browserEvidence: undefined })).toBe(false);
  expect(validate({ ...complete, direction: undefined })).toBe(false);
  expect(
    validate({
      ...complete,
      browserEvidence: {
        ...complete.browserEvidence,
        motion: { default: "evidence/motion-default.png" },
      },
    }),
  ).toBe(false);
  expect(
    validate({
      ...complete,
      browserEvidence: {
        ...complete.browserEvidence,
        viewports: { "1440": "evidence/1440.png" },
      },
    }),
  ).toBe(false);
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
