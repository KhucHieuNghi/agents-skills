import { createHash } from "node:crypto";
import { expect, it } from "vitest";
// @ts-expect-error development module
import { evaluateDeclaredTargetControls } from "../scripts/enterprise-technical-seo/target-controls.mjs";
const root = "https://example.com/source",
  target = "https://example.com/preferred";
const scope = {
  customerId: "customer",
  entityId: "site",
  environment: "production",
  targetUrl: root,
  profileId: "desktop",
  stateId: "anonymous",
};
const context = {
  ...scope,
  relationship: "canonical",
  method: null,
  assessmentAt: "2026-11-19T12:00:00Z",
  maxAgeSeconds: 3600,
};
const at = "2026-11-19T11:30:00Z";
function envelope(raw: unknown) {
  const artifactText = JSON.stringify(raw);
  return {
    sourceId: "supplied",
    artifactText,
    artifactHash: createHash("sha256").update(artifactText).digest("hex"),
  };
}
function fixture() {
  return {
    declaration: {
      schemaVersion: 1,
      scope: { ...scope },
      capturedAt: at,
      layers: {
        sourceHead: { complete: true, targets: [target] },
        renderedHead: { complete: true, targets: [target] },
        httpLink: { complete: true, targets: [] },
      },
    },
    controls: {
      schemaVersion: 1,
      scope: { ...scope, targetUrl: target },
      capturedAt: at,
      response: { url: target, status: 200 },
      robots: {
        url: "https://example.com/robots.txt",
        capturedAt: at,
        status: 200,
        body: "User-agent: *\nAllow: /",
        complete: true,
      },
      sourceDocument: {
        complete: true,
        meta: [] as { name: string; content: string }[],
      },
      renderedDocument: { complete: true, meta: [] },
      httpHeaders: { complete: true, values: [] },
    },
  };
}
function run(f = fixture(), targets = [envelope(f.controls)], ctx = context) {
  return evaluateDeclaredTargetControls(
    ctx,
    envelope({
      schemaVersion: 1,
      declaration: envelope(f.declaration),
      targets,
    }),
  );
}
function statuses(r: ReturnType<typeof run>) {
  return r.checks.map((c: { status: string }) => c.status);
}
it("joins exact independently scoped controls without asserting indexing", () => {
  expect(statuses(run())).toEqual(["pass", "pass", "pass"]);
  expect(run().indexingStatus).toBe("unknown");
});
it("missing target controls produces three unknowns and actionable requests", () => {
  const r = run(fixture(), []);
  expect(statuses(r)).toEqual(["unknown", "unknown", "unknown"]);
  expect(r.dataRequests).toHaveLength(3);
  expect(r.dataRequests[0].requestedArtifact).toContain(
    "layers.sourceHead.targets[0]",
  );
  expect(JSON.stringify(r.dataRequests)).not.toContain(target);
});
it("source noindex survives removal after rendering", () => {
  const f = fixture();
  f.controls.sourceDocument.meta = [{ name: "robots", content: "noindex" }];
  expect(statuses(run(f))).toEqual(["pass", "pass", "fail"]);
});
it("incomplete noindex absence is unknown", () => {
  const f = fixture();
  f.controls.renderedDocument.complete = false;
  expect(statuses(run(f))).toEqual(["pass", "pass", "unknown"]);
});
it("robots and page evidence expire independently", () => {
  const f = fixture();
  f.controls.robots.capturedAt = "2026-11-19T11:00:00Z";
  expect(statuses(run(f))).toEqual(["pass", "unknown", "pass"]);
});
it("expired declaration cannot support fresh target conclusions", () => {
  const f = fixture();
  f.declaration.capturedAt = "2026-11-19T11:00:00Z";
  expect(statuses(run(f))).toEqual(["unknown", "unknown", "unknown"]);
});
it("redirected scope fails direct response condition but leaves directives unknown", () => {
  const f = fixture();
  f.controls.response.url = target + "/other";
  expect(statuses(run(f))).toEqual(["fail", "pass", "unknown"]);
});
it("non200 and denied robots remain independent criteria", () => {
  const f = fixture();
  f.controls.response.status = 404;
  f.controls.robots.body = "User-agent: *\nDisallow: /";
  expect(statuses(run(f))).toEqual(["fail", "fail", "pass"]);
});
it.each(["customerId", "entityId", "environment", "profileId", "stateId"])(
  "rejects foreign target %s",
  (key) => {
    const f = fixture();
    Object.assign(f.controls.scope, { [key]: "other" });
    expect(() => run(f)).toThrow();
  },
);
it("rejects undeclared targets, duplicate captures and tampered hashes", () => {
  const f = fixture();
  const s = envelope(f.controls);
  expect(() => run(f, [s, s])).toThrow("Duplicate");
  expect(() => run(f, [{ ...s, artifactHash: "0".repeat(64) }])).toThrow();
  f.controls.scope.targetUrl = target + "/";
  expect(() => run(f)).toThrow("Undeclared");
});
it("does not call absent declarations defects", () => {
  const f = fixture();
  Object.values(f.declaration.layers).forEach((layer) => (layer.targets = []));
  const r = run(f, []);
  expect(statuses(r)).toEqual(["unknown"]);
});
it("supports separately scoped hreflang targets", () => {
  const f = fixture();
  const declaration = {
    schemaVersion: 1,
    scope,
    method: "html-source",
    pages: [
      {
        url: root,
        capturedAt: at,
        complete: true,
        alternates: [{ language: "de", targetUrl: target }],
      },
    ],
  };
  const r = evaluateDeclaredTargetControls(
    { ...context, relationship: "hreflang", method: "html-source" },
    envelope({
      schemaVersion: 1,
      declaration: envelope(declaration),
      targets: [envelope(f.controls)],
    }),
  );
  expect(statuses(r)).toEqual(["pass", "pass", "pass"]);
});

it("does not leak malformed private target URLs through exception properties", () => {
  const f = fixture();
  f.controls.scope.targetUrl = "private-invalid-target";
  let error: unknown;
  try {
    run(f);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  expect(JSON.stringify(error)).not.toContain("private-invalid-target");
});
