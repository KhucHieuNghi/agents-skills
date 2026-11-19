import { expect, it as test } from "vitest";
import { spawnSync } from "node:child_process";
const capable =
  process.platform !== "win32" &&
  spawnSync("python3", [
    "-B",
    "-I",
    "-c",
    "import fcntl, os; assert hasattr(os, 'O_NOFOLLOW') and os.open in os.supports_dir_fd",
  ]).status === 0;
const it = test.skipIf(!capable);
import {
  readFile,
  writeFile,
  symlink,
  unlink,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { setup } from "./helpers/remediation-preparation.js";
import { fixture } from "./helpers/remediation-fixture.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import {
  buildEnterpriseReport,
  enterpriseReviewTargetDigest,
} from "../skills/content-search-audit/scripts/lib/enterprise-report.mjs";
// @ts-expect-error development module
import { planChanges } from "../scripts/enterprise-remediation/change-plan.mjs";
// @ts-expect-error development module
import {
  createSandboxTarget,
  disposeSandboxTarget,
  executeSandboxChange,
} from "../scripts/enterprise-remediation/sandbox-executor.mjs";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function preparation() {
  const delta = Date.now() - Date.parse("2026-11-18T14:15:00Z");
  const shift = (x: unknown): unknown =>
    typeof x === "string" && /^\d{4}-\d\d-\d\dT/.test(x)
      ? new Date(Date.parse(x) + delta).toISOString()
      : Array.isArray(x)
        ? x.map(shift)
        : x && typeof x === "object"
          ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, shift(v)]))
          : x;
  const p = shift(setup()) as ReturnType<typeof setup>,
    { bundle: originalBundle } = fixture(),
    bundle = shift(originalBundle) as typeof originalBundle;
  bundle.sourceRunDigest = enterpriseDigest(p.planningInput.sourceRun);
  let report = buildEnterpriseReport(p.planningInput.sourceRun, bundle);
  bundle.decisions = ["finding", "check"].map((type) => {
    const id = type === "finding" ? "F-1" : report.findings[0].checkId;
    return {
      targetType: type,
      targetId: id,
      targetDigest: enterpriseReviewTargetDigest(report, type, id),
      reviewerId: "independent",
      reviewerType: "independent-ai",
      reviewedAt: shift("2026-11-18T12:30:00Z") as string,
      verdict: "accept",
      reason: "Verified sandbox fixture",
    };
  });
  report = buildEnterpriseReport(p.planningInput.sourceRun, bundle);
  p.planningInput.report = report;
  const policy = p.planningInput.trustedAcceptancePolicies[0];
  policy.contextDigest =
    report.assessment.checkContextDigests[report.findings[0].checkId];
  p.hostContext.environment = "sandbox";
  p.hostContext.trustedAuthorizations[0].environment = "sandbox";
  p.hostContext.trustedApprovals[0].environment = "sandbox";
  p.planningInput.trustedAssetBindings[0].environment = "sandbox";
  p.hostContext.trustedAssetBindings = p.planningInput.trustedAssetBindings;
  policy.assetBindingDigest = enterpriseDigest(
    p.planningInput.trustedAssetBindings[0],
  );
  p.hostContext.trustedAcceptancePolicies = [policy];
  Object.assign(p.planningInput.proposals[0], {
    artifactDigest: hash("after"),
    preconditionDigest: hash("before"),
    rollbackDigest: hash("before"),
  });
  p.plan = planChanges(p.planningInput);
  p.currentPreconditionDigest = hash("before");
  Object.assign(p.hostContext.trustedApprovals[0], {
    planDigest: p.plan.planDigest,
    artifactDigest: hash("after"),
    preconditionDigest: hash("before"),
    rollbackDigest: hash("before"),
  });
  return p;
}
async function run(
  fn: (
    target: Awaited<ReturnType<typeof createSandboxTarget>>,
    p: ReturnType<typeof preparation>,
  ) => Promise<void>,
) {
  const target = await createSandboxTarget({
    assetId: "site-prod",
    environment: "sandbox",
    initialText: "before",
  });
  try {
    await fn(target, preparation());
  } finally {
    await disposeSandboxTarget(target);
  }
}
it("rechecks host approval at commit and returns a verified sandbox receipt", async () =>
  run(async (target, p) => {
    let refreshes = 0;
    const r = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => {
        refreshes++;
        return p.hostContext;
      },
    });
    expect(r.status).toBe("applied");
    expect(r.productionExecution).toBe(false);
    expect(r.receipt.afterDigest).toBe(hash("after"));
    expect(refreshes).toBe(1);
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "after",
    );
  }));
it("blocks revocation occurring after initial preparation", async () =>
  run(async (target, p) => {
    const r = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => {
        const h = structuredClone(p.hostContext);
        h.trustedAuthorizations[0].revokedAt = new Date().toISOString();
        return h;
      },
    });
    expect(r.status).toBe("denied");
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "before",
    );
  }));
it("bounds a stalled authorization callback and leaves target unchanged", async () =>
  run(async (target, p) => {
    const r = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: () => new Promise(() => {}),
      timeoutMs: 500,
    });
    expect(r.status).toBe("unknown");
    expect(r.recoveryRequired).toBe(true);
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "before",
    );
  }));
it("rejects changed approved bytes and unregistered targets before spawning", async () =>
  run(async (target, p) => {
    const args = {
      target,
      afterText: "wrong",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    };
    expect((await executeSandboxChange(args)).status).toBe("denied");
    expect(
      (
        await executeSandboxChange({
          ...args,
          target: { ...target },
          afterText: "after",
        })
      ).status,
    ).toBe("denied");
  }));
it("preserves a target changed during fresh authorization", async () =>
  run(async (target, p) => {
    const r = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => {
        await writeFile(path.join(target.root, "fixture.txt"), "concurrent");
        return p.hostContext;
      },
    });
    expect(r.status).toBe("denied");
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "concurrent",
    );
  }));
it("does not follow a replaced target symlink", async () =>
  run(async (target, p) => {
    const outside = path.join(target.root, "outside.txt");
    await writeFile(outside, "outside");
    await unlink(path.join(target.root, "fixture.txt"));
    await symlink(outside, path.join(target.root, "fixture.txt"));
    expect(
      (
        await executeSandboxChange({
          target,
          afterText: "after",
          preparation: p,
          refreshHostContext: async () => p.hostContext,
        })
      ).status,
    ).toBe("denied");
    expect(await readFile(outside, "utf8")).toBe("outside");
  }));

it("cannot label a sandbox target as production", async () => {
  await expect(
    createSandboxTarget({
      assetId: "site",
      environment: "production",
      initialText: "before",
    }).then(async (target: unknown) => {
      await disposeSandboxTarget(target);
      return target;
    }),
  ).rejects.toThrow();
});

it("handles unrelated null grants without leaking a worker", async () =>
  run(async (target, p) => {
    Object.assign(p.hostContext.trustedAuthorizations, {
      1: p.hostContext.trustedAuthorizations[0],
      0: null,
    });
    Object.assign(p.hostContext.trustedApprovals, {
      1: p.hostContext.trustedApprovals[0],
      0: null,
    });
    const result = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    });
    expect(result.status).toBe("applied");
  }));

it("quarantines an unknown attempt against blind retry", async () =>
  run(async (target, p) => {
    const args = {
      target,
      afterText: "after",
      preparation: p,
      timeoutMs: 100,
      refreshHostContext: () => new Promise(() => {}),
    };
    expect((await executeSandboxChange(args)).status).toBe("unknown");
    let refreshed = false;
    const retry = await executeSandboxChange({
      ...args,
      timeoutMs: 5000,
      refreshHostContext: async () => {
        refreshed = true;
        return p.hostContext;
      },
    });
    expect(retry.status).toBe("unknown");
    expect(retry.reason).toBe("sandbox-recovery-required");
    expect(refreshed).toBe(false);
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "before",
    );
  }));
it("blocks concurrent execution and disposal while authorization is pending", async () =>
  run(async (target, p) => {
    let enter!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    let release!: (value: typeof p.hostContext) => void;
    const args = {
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: () => {
        enter();
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    };
    const first = executeSandboxChange(args);
    await entered;
    try {
      expect((await executeSandboxChange(args)).reason).toBe(
        "sandbox-execution-in-progress",
      );
      await expect(disposeSandboxTarget(target)).rejects.toThrow("in progress");
    } finally {
      release(p.hostContext);
    }
    expect((await first).status).toBe("applied");
  }));
it("does not replay a consumed execution approval even if bytes are reset", async () =>
  run(async (target, p) => {
    const args = {
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    };
    expect((await executeSandboxChange(args)).status).toBe("applied");
    await writeFile(path.join(target.root, "fixture.txt"), "before");
    expect((await executeSandboxChange(args)).reason).toBe(
      "sandbox-attempt-already-consumed",
    );
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "before",
    );
  }));

it("binds a verified receipt to its durable intent and terminal record", async () =>
  run(async (target, p) => {
    const result = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    });
    const intentText = await readFile(
      path.join(target.root, ".intent-" + result.journalKey + ".json"),
      "utf8",
    );
    const intent = JSON.parse(intentText);
    const terminal = JSON.parse(
      await readFile(
        path.join(target.root, ".result-" + result.journalKey + ".json"),
        "utf8",
      ),
    );
    expect(result.receipt.receiptId).toBe(intent.attempt.attemptId);
    expect(result.attemptId).toBe(intent.attempt.attemptId);
    expect(intent.attempt.planDigest).toBe(p.plan.planDigest);
    expect(terminal.intentDigest).toBe(hash(intentText));
    expect(terminal.verifiedAfterDigest).toBe(result.receipt.afterDigest);
    expect(terminal.status).toBe("applied");
  }));
it("persists intent before fresh authorization and correlates timeout recovery", async () =>
  run(async (target, p) => {
    let admittedId: string | null = null;
    const result = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      timeoutMs: 1000,
      refreshHostContext: async () => {
        const names = await readdir(target.root);
        const name = names.find((name: string) => name.startsWith(".intent-"));
        const intent = JSON.parse(
          await readFile(path.join(target.root, name!), "utf8"),
        );
        admittedId = intent.attempt.attemptId;
        return new Promise(() => {});
      },
    });
    expect(admittedId).not.toBeNull();
    expect(result.status).toBe("unknown");
    expect(result.attemptId).toBe(admittedId);
    expect(result.receipt).toBeNull();
    expect(
      (await readdir(target.root)).some((name: string) =>
        name.startsWith(".result-"),
      ),
    ).toBe(false);
    const retry = await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    });
    expect(retry.attemptId).toBe(result.attemptId);
    expect(retry.journalKey).toBe(result.journalKey);
  }));
