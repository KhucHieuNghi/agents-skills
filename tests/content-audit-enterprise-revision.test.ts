import { expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveAuditContext } from "../skills/content-search-audit/scripts/lib/enterprise-context.mjs";
import {
  saveEnterpriseRun,
  loadEnterpriseRun,
} from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
const exec = promisify(execFile);
const cli = path.resolve("skills/content-search-audit/scripts/audit.mjs");
it("persists answers and refusals through installed-style revisions without fabricating assessments", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "enterprise-revision-"));
  try {
    const run = resolveAuditContext(
      {
        customerId: "a",
        runId: "original",
        assessmentAt: "2026-11-18T12:00:00Z",
        profileIds: ["publishing"],
        entities: [{ entityId: "site", type: "site" }],
      },
      [],
    );
    const source = path.join(root, "original"),
      next = path.join(root, "next"),
      third = path.join(root, "third");
    const saved = await saveEnterpriseRun(source, run);
    const context = run.dataRequests.find(
      (r: { requestedArtifact: string }) =>
        r.requestedArtifact === "business-context",
    );
    const tracking = run.dataRequests.find(
      (r: { requestedArtifact: string }) =>
        r.requestedArtifact === "gtm-container",
    );
    const bundle = path.join(root, "responses.json");
    await writeFile(
      bundle,
      JSON.stringify({
        sourceDigest: saved.digest,
        newRunId: "next",
        assessmentAt: "2026-11-18T13:00:00Z",
        responses: [
          {
            requestId: context.id,
            outcome: "answer",
            actor: "Customer",
            at: "2026-11-18T12:30:00Z",
            text: "Goal: confirmed email subscriptions; click alone is not success.",
            validUntil: "2026-12-18T12:30:00Z",
          },
          {
            requestId: tracking.id,
            outcome: "declined",
            actor: "Customer",
            at: "2026-11-18T12:30:00Z",
            reason: "No container access",
          },
        ],
      }),
    );
    await exec(process.execPath, [
      cli,
      "enterprise-revise",
      source,
      bundle,
      next,
    ]);
    const revised = await loadEnterpriseRun(next);
    expect(revised.parentRunIds).toContain("original");
    expect(
      revised.dataRequests.find(
        (r: { requestedArtifact: string }) =>
          r.requestedArtifact === "business-context",
      ).status,
    ).toBe("provided");
    expect(
      revised.dataRequests.find(
        (r: { requestedArtifact: string }) =>
          r.requestedArtifact === "gtm-container",
      ).status,
    ).toBe("declined");
    expect(
      revised.checks.every((c: { status: string }) => c.status === "unknown"),
    ).toBe(true);
    const receipt = JSON.parse(
      await readFile(path.join(next, "enterprise-run.manifest.json"), "utf8"),
    );
    await writeFile(
      bundle,
      JSON.stringify({
        sourceDigest: receipt.digest,
        newRunId: "third",
        assessmentAt: "2026-11-18T14:00:00Z",
        responses: [],
      }),
    );
    await exec(process.execPath, [
      cli,
      "enterprise-revise",
      next,
      bundle,
      third,
    ]);
    expect(
      (await loadEnterpriseRun(third)).dataRequests.find(
        (r: { requestedArtifact: string }) =>
          r.requestedArtifact === "gtm-container",
      ).status,
    ).toBe("declined");
    expect(
      (await loadEnterpriseRun(source)).dataRequests.every(
        (r: { status: string }) => r.status === "requested",
      ),
    ).toBe(true);
    await expect(
      exec(process.execPath, [
        cli,
        "enterprise-revise",
        source,
        bundle,
        path.join(root, "stale"),
      ]),
    ).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
