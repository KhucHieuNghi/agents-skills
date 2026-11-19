import { mkdtemp, realpath, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import {
  fixture,
  bundle as encodeBundle,
} from "./helpers/research-projection.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { advanceResearchAccessState } from "../scripts/enterprise-journeys/research-access-state.mjs";
vi.mock(
  "../scripts/enterprise-journeys/research-control-store.mjs",
  async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      readResearchControlStore: vi.fn(actual.readResearchControlStore),
    };
  },
);
import {
  createResearchControlStore as create,
  readResearchControlStore as read,
  registerStoredResearchReviews as register,
  advanceStoredResearchAccess as advance,
} from "../scripts/enterprise-journeys/research-control-store.mjs";
import { buildStoredResearchDraft as build } from "../scripts/enterprise-journeys/research-stored-report.mjs";
import { validateResearchDraftArtifacts } from "../scripts/enterprise-journeys/research-report.mjs";
async function setup(fn) {
  const parent = await realpath(
      await mkdtemp(join(tmpdir(), "research-report-")),
    ),
    f = await fixture(),
    directory = join(parent, "vault");
  const options = {
    directory,
    key: randomBytes(32),
    context: f.context,
    authority: {
      scopeDigest: enterpriseDigest(
        advanceResearchAccessState(null, null, f.context).scope,
      ),
      directory,
      stagingDirectory: parent,
      artifactClass: "research-control-metadata",
      allowed: true,
      observedAt: f.context.assessmentAt,
      validUntil: "2026-11-20T00:00:00Z",
      maxAgeSeconds: 3600,
    },
  };
  f.receipt.reviewedAt = f.context.assessmentAt;
  const b = encodeBundle(f),
    bundle = {
      descriptors: f.descriptors,
      researchPayloads: f.payloads,
      policy: f.policy,
      candidates: b.candidates,
      payloads: b.payloads,
    };
  try {
    await create(options);
    await register(options, 1, bundle);
    await fn(options, bundle, f);
  } finally {
    vi.mocked(read).mockReset();
    const actual = await vi.importActual(
      "../scripts/enterprise-journeys/research-control-store.mjs",
    );
    vi.mocked(read).mockImplementation(actual.readResearchControlStore);
    await rm(parent, { recursive: true, force: true });
  }
}
it("builds one canonical JSON/MD/HTML draft from persisted review registrations", async () =>
  setup(async (o, b, f) => {
    const r = await build(o, 2, b);
    expect(r.customerDraft.items[0].summary).toBe(f.raw.summary);
    expect(validateResearchDraftArtifacts(r.customerArtifacts)).toEqual(
      r.customerDraft,
    );
    expect(r.privateDecision.storageRevision).toBe(2);
    expect(r.privateDecision.storageRechecked).toBe(true);
    expect(r.privateDecision.deliveryAuthorized).toBe(false);
    expect(await readdir(o.directory)).toEqual(["control.sqlite"]);
    for (const content of [
      r.customerArtifacts.json,
      r.customerArtifacts.markdown,
      r.customerArtifacts.html,
      JSON.stringify(r.customerArtifacts.manifest),
    ]) {
      expect(content).not.toContain("private-summary");
      expect(content).not.toContain("record1");
      expect(content).not.toContain(f.descriptors[0].artifactHash);
    }
  }));
it("rejects stale expected revision before reading payload bytes", async () =>
  setup(async (o, b) => {
    let touched = false;
    Object.defineProperty(b.payloads[0], "artifactText", {
      enumerable: true,
      get() {
        touched = true;
        throw Error("PRIVATE");
      },
    });
    await expect(build(o, 1, b)).rejects.toThrow(/revision changed/);
    expect(touched).toBe(false);
  }));
it("uses stored retirement rather than caller supplied historical review metadata", async () =>
  setup(async (o, b) => {
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].customerSummaryAllowed = false;
    await advance(o, 2);
    o.context.assessmentAt = "2026-11-19T02:02:00Z";
    o.context.access[0].customerSummaryAllowed = true;
    await advance(o, 3);
    let touched = false;
    Object.defineProperty(b.payloads[0], "artifactText", {
      enumerable: true,
      get() {
        touched = true;
        throw Error("PRIVATE");
      },
    });
    await expect(build(o, 4, b)).rejects.toThrow(/Retired artifact/);
    expect(touched).toBe(false);
    b.payloads = [];
    const result = await build(o, 4, b);
    expect(result.customerDraft.status).toBe("inconclusive");
    expect(result.customerDraft.items).toHaveLength(0);
  }));
it("does not return artifacts when another transaction advances the store during generation", async () =>
  setup(async (o, b) => {
    const actual = await vi.importActual(
      "../scripts/enterprise-journeys/research-control-store.mjs",
    );
    let first = true;
    vi.mocked(read).mockImplementation(async (options) => {
      const result = await actual.readResearchControlStore(options);
      if (first) {
        first = false;
        const changed = { ...o, context: structuredClone(o.context) };
        changed.context.assessmentAt = "2026-11-19T02:01:00Z";
        await advance(changed, 2);
      }
      return result;
    });
    await expect(build(o, 2, b)).rejects.toThrow();
    expect(await readdir(o.directory)).toEqual(["control.sqlite"]);
  }));
it("changed actual receipt bytes cannot be substituted under a stored registration", async () =>
  setup(async (o, b, f) => {
    f.receipt.reviewer.id = "replacement";
    const changed = encodeBundle(f);
    await expect(build(o, 2, { ...b, ...changed })).rejects.toThrow(
      /Ineligible revision/,
    );
  }));
it("requires storage authority even when all supplied research and review bytes are valid", async () =>
  setup(async (o, b) => {
    o.authority.allowed = false;
    await expect(build(o, 2, b)).rejects.toThrow(/authority/);
  }));
it("rejects a known retired artifact relabeled as a research source before reading it", async () =>
  setup(async (o, b, f) => {
    const oldHash = b.candidates[0].artifactHash;
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].customerSummaryAllowed = false;
    await advance(o, 2);
    o.context.assessmentAt = "2026-11-19T02:02:00Z";
    o.context.access[0].customerSummaryAllowed = true;
    await advance(o, 3);
    f.raw.candidateId = "fresh-summary";
    f.receipt.candidateDigest = enterpriseDigest(f.raw);
    f.receipt.reviewedAt = o.context.assessmentAt;
    const fresh = { ...b, ...encodeBundle(f) };
    await register(o, 4, fresh);
    fresh.descriptors = structuredClone(fresh.descriptors);
    fresh.descriptors[0].artifactHash = oldHash;
    let touched = false;
    fresh.researchPayloads = [
      {
        sourceId: fresh.descriptors[0].sourceId,
        get artifactText() {
          touched = true;
          throw Error("PRIVATE");
        },
      },
    ];
    await expect(build(o, 5, fresh)).rejects.toThrow(/Retired artifact/);
    expect(touched).toBe(false);
  }));
