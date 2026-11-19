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
import {
  buildStoredResearchDraft as build,
  acquireStoredResearchDraft as acquire,
} from "../scripts/enterprise-journeys/research-stored-report.mjs";
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

function acquisition(b) {
  const metadata = {
    descriptors: b.descriptors,
    policy: b.policy,
    candidates: b.candidates,
  };
  const loaders = {
    research: vi.fn(async (d) =>
      structuredClone(
        b.researchPayloads.find((p) => p.sourceId === d.sourceId),
      ),
    ),
    candidate: vi.fn(async (c) =>
      structuredClone(b.payloads.find((p) => p.candidateId === c.candidateId)),
    ),
  };
  return { metadata, loaders };
}
it("acquires only eligible support and candidate bytes after stored metadata preflight", async () =>
  setup(async (o, b, f) => {
    const { metadata, loaders } = acquisition(b);
    const result = await acquire(o, 2, metadata, loaders);
    expect(result.customerDraft.items[0].summary).toBe(f.raw.summary);
    expect(loaders.research).toHaveBeenCalledTimes(1);
    expect(loaders.candidate).toHaveBeenCalledTimes(1);
    expect(result.privateDecision.deliveryAuthorized).toBe(false);
    expect(await readdir(o.directory)).toEqual(["control.sqlite"]);
  }));
it("does not invoke content loaders for a stale revision", async () =>
  setup(async (o, b) => {
    const { metadata, loaders } = acquisition(b);
    await expect(acquire(o, 1, metadata, loaders)).rejects.toThrow(
      /revision changed/,
    );
    expect(loaders.research).not.toHaveBeenCalled();
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));
it("withholds retired candidates after regrant without fetching old payloads", async () =>
  setup(async (o, b) => {
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].customerSummaryAllowed = false;
    await advance(o, 2);
    o.context.assessmentAt = "2026-11-19T02:02:00Z";
    o.context.access[0].customerSummaryAllowed = true;
    await advance(o, 3);
    const { metadata, loaders } = acquisition(b);
    const result = await acquire(o, 4, metadata, loaders);
    expect(result.customerDraft.status).toBe("inconclusive");
    expect(result.customerDraft.items).toEqual([]);
    expect(loaders.research).not.toHaveBeenCalled();
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));
it("stops between loader calls when access revision changes", async () =>
  setup(async (o, b) => {
    const { metadata, loaders } = acquisition(b);
    loaders.research.mockImplementation(async (d) => {
      const changed = { ...o, context: structuredClone(o.context) };
      changed.context.assessmentAt = "2026-11-19T02:01:00Z";
      changed.context.access[0].customerSummaryAllowed = false;
      await advance(changed, 2);
      return structuredClone(
        b.researchPayloads.find((p) => p.sourceId === d.sourceId),
      );
    });
    await expect(acquire(o, 2, metadata, loaders)).rejects.toThrow();
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));

it("does not fetch when disclosure policy is expired", async () =>
  setup(async (o, b) => {
    const { metadata, loaders } = acquisition(b);
    metadata.policy = structuredClone(metadata.policy);
    metadata.policy.validUntil = o.context.assessmentAt;
    const result = await acquire(o, 2, metadata, loaders);
    expect(result.customerDraft.items).toEqual([]);
    expect(loaders.research).not.toHaveBeenCalled();
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));
it("rejects a loader payload bound to another source before fetching candidates", async () =>
  setup(async (o, b) => {
    const { metadata, loaders } = acquisition(b);
    loaders.research.mockResolvedValue({
      ...b.researchPayloads[0],
      sourceId: "foreign-source",
    });
    await expect(acquire(o, 2, metadata, loaders)).rejects.toThrow(
      /mismatched payload/,
    );
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));
it("does not return a draft after access changes in the final loader", async () =>
  setup(async (o, b) => {
    const { metadata, loaders } = acquisition(b);
    loaders.candidate.mockImplementation(async (c) => {
      const changed = { ...o, context: structuredClone(o.context) };
      changed.context.assessmentAt = "2026-11-19T02:01:00Z";
      changed.context.access[0].customerSummaryAllowed = false;
      await advance(changed, 2);
      return structuredClone(
        b.payloads.find((p) => p.candidateId === c.candidateId),
      );
    });
    await expect(acquire(o, 2, metadata, loaders)).rejects.toThrow();
    expect(await readdir(o.directory)).toEqual(["control.sqlite"]);
  }));
it("isolates caller and callback metadata mutations from the preflight snapshot", async () =>
  setup(async (o, b, f) => {
    const { metadata, loaders } = acquisition(b);
    loaders.research.mockImplementation(async (d) => {
      metadata.candidates = [];
      d.artifactHash = "a".repeat(64);
      return structuredClone(
        b.researchPayloads.find((p) => p.sourceId === d.sourceId),
      );
    });
    const result = await acquire(o, 2, metadata, loaders);
    expect(result.customerDraft.items[0].summary).toBe(f.raw.summary);
    expect(loaders.candidate).toHaveBeenCalledTimes(1);
  }));

it("binds each emitted research item to its authoritative registration and exact edition privately", async () =>
  setup(async (o, b, f) => {
    const r = await build(o, 2, b);
    const stored = await read(o);
    const p = r.privateProvenance;
    expect(p).toMatchObject({
      schemaFamily: "private-governed-report-provenance",
      schemaVersion: 1,
      audience: "private",
      editionId: r.customerDraft.editionId,
      reportDigest: enterpriseDigest(r.customerDraft),
      manifestDigest: enterpriseDigest(r.customerArtifacts.manifest),
      persistenceAuthorized: false,
      deliveryAuthorized: false,
    });
    expect(p.controller).toEqual({
      scopeDigest: enterpriseDigest(stored.control.state.scope),
      storageRevision: 2,
      stateDigest: enterpriseDigest(stored.control.state),
      generation: stored.control.state.generation,
    });
    expect(p.items).toHaveLength(r.customerDraft.items.length);
    const item = r.customerDraft.items[0],
      decision = r.privateDecision.decisions.find(
        (d) => d.reference === item.reference,
      );
    expect(p.items[0]).toEqual({
      collection: "items",
      itemId: item.reference,
      itemDigest: enterpriseDigest(item),
      origin: {
        kind: "governed",
        candidateId: decision.candidateId,
        candidateDigest: decision.candidateDigest,
        registrationDigest: enterpriseDigest(stored.control.registrations[0]),
        artifactHash: b.candidates[0].artifactHash,
        receiptHash: b.candidates[0].receiptHash,
        supportBindings: decision.supportBindings,
      },
    });
    expect(JSON.stringify(p)).not.toContain(f.raw.summary);
    for (const content of [
      r.customerArtifacts.json,
      r.customerArtifacts.markdown,
      r.customerArtifacts.html,
    ]) {
      expect(content).not.toContain(p.items[0].origin.registrationDigest);
      expect(content).not.toContain("private-governed-report-provenance");
    }
  }));
it("creates no item origin for an empty research selection", async () =>
  setup(async (o, b) => {
    const r = await acquire(
      o,
      2,
      { descriptors: b.descriptors, policy: b.policy, candidates: [] },
      { research: vi.fn(), candidate: vi.fn() },
    );
    expect(r.customerDraft.items).toEqual([]);
    expect(r.privateProvenance.items).toEqual([]);
  }));

it("withholds item provenance after withdrawal without acquiring historical text", async () =>
  setup(async (o, b) => {
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    o.context.access[0].customerSummaryAllowed = false;
    await advance(o, 2);
    const { metadata, loaders } = acquisition(b);
    const r = await acquire(o, 3, metadata, loaders);
    expect(r.customerDraft.items).toEqual([]);
    expect(r.privateProvenance.items).toEqual([]);
    expect(loaders.research).not.toHaveBeenCalled();
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));

it("snapshots authority and candidate metadata before awaiting the stored controller", async () =>
  setup(async (o, b) => {
    const authority = structuredClone(o.authority),
      context = structuredClone(o.context);
    const pending = build(o, 2, b);
    o.authority.allowed = false;
    o.context.assessmentAt = "2026-11-19T02:01:00Z";
    b.candidates[0].artifactHash = "0".repeat(64);
    const result = await pending;
    expect(result.customerDraft.items).toHaveLength(1);
    expect(result.privateProvenance.items[0].origin.artifactHash).not.toBe(
      "0".repeat(64),
    );
    o.authority = authority;
    o.context = context;
  }));
