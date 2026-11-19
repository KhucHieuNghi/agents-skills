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
  inspectSandboxTarget,
  disposeSandboxTarget,
  executeSandboxChange,
  executeSandboxRollback,
  reconcileSandboxObservation,
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

it("inspects historical completion and current drift without changing artifacts", async () =>
  run(async (target, p) => {
    await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    });
    await writeFile(path.join(target.root, "fixture.txt"), "drift");
    const snapshot = async () =>
      Object.fromEntries(
        await Promise.all(
          (await readdir(target.root))
            .sort()
            .map(async (name) => [
              name,
              await readFile(path.join(target.root, name), "utf8"),
            ]),
        ),
      );
    const before = await snapshot();
    const report = await inspectSandboxTarget({ target });
    expect(report.status).toBe("inspected");
    expect(report.records[0].historicalStatus).toBe("applied");
    expect(report.records[0].currentRelation).toBe("matches-neither");
    expect(report.currentDigest).toBe(hash("drift"));
    expect(report.receipt).toBeNull();
    expect(report.executionAllowed).toBe(false);
    expect(report.findingsResolved).toBe(false);
    expect(await snapshot()).toEqual(before);
  }));
it("does not create an inspection lock or adopt an imported target", async () =>
  run(async (target) => {
    const before = await readdir(target.root);
    expect((await inspectSandboxTarget({ target })).status).toBe("unknown");
    expect(await readdir(target.root)).toEqual(before);
    expect((await inspectSandboxTarget({ target: { ...target } })).reason).toBe(
      "invalid-sandbox-inspection-input",
    );
  }));
it("inspection of pending intent never clears execution quarantine", async () =>
  run(async (target, p) => {
    const args = {
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: () => new Promise(() => {}),
      timeoutMs: 1000,
    };
    const execution = await executeSandboxChange(args);
    expect(execution.status).toBe("unknown");
    const report = await inspectSandboxTarget({ target });
    expect(report.status).toBe("inspected");
    expect(report.records[0].historicalStatus).toBe("pending");
    expect(report.records[0].commitAttempted).toBeNull();
    expect(report.callerOutcomeUncertain).toBe(true);
    expect(report.lastAttempt.attemptId).toBe(execution.attemptId);
    const noGrant = await reconcileSandboxObservation({
      target,
      intentDigest: report.records[0].intentDigest,
      currentDigest: report.currentDigest,
      authorizeObservation: async () => ({
        allowed: false,
        validUntil: Date.now() / 1000 + 60,
      }),
    });
    expect(noGrant.status).toBe("denied");
    const recorded = await reconcileSandboxObservation({
      target,
      intentDigest: report.records[0].intentDigest,
      currentDigest: report.currentDigest,
      authorizeObservation: async (request) => {
        expect(request.attemptId).toBe(execution.attemptId);
        expect(request.assetId).toBe(target.assetId);
        return { allowed: true, validUntil: Date.now() / 1000 + 60 };
      },
    });
    expect(recorded.status).toBe("observed");
    expect(recorded.outcomeResolved).toBe(false);
    expect(recorded.callerOutcomeUncertain).toBe(true);
    const after = await inspectSandboxTarget({ target });
    expect(after.records[0].reconciliation.historicalStatus).toBe("pending");
    const retry = await executeSandboxChange({
      ...args,
      refreshHostContext: async () => p.hostContext,
    });
    expect(retry.reason).toBe("sandbox-recovery-required");
  }));
it("holds sandbox busy until reconciliation timeout and ignores late approval", async () =>
  run(async (target, p) => {
    const args = {
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: () => new Promise(() => {}),
      timeoutMs: 1000,
    };
    expect((await executeSandboxChange(args)).status).toBe("unknown");
    const inspected = await inspectSandboxTarget({ target });
    let release:
      ((value: { allowed: boolean; validUntil: number }) => void) | undefined;
    let entered: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const pending = reconcileSandboxObservation({
      target,
      intentDigest: inspected.records[0].intentDigest,
      currentDigest: inspected.currentDigest,
      timeoutMs: 1000,
      authorizeObservation: () => {
        entered?.();
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    });
    await ready;
    await expect(disposeSandboxTarget(target)).rejects.toThrow("in progress");
    expect((await inspectSandboxTarget({ target })).reason).toBe(
      "sandbox-operation-in-progress",
    );
    expect((await pending).status).toBe("unknown");
    release?.({ allowed: true, validUntil: Date.now() / 1000 + 60 });
    const after = await inspectSandboxTarget({ target });
    expect(after.records[0].reconciliation).toBeNull();
    expect(after.callerOutcomeUncertain).toBe(true);
  }));
it("holds capability busy through timed-out inspection worker close", async () =>
  run(async (target, p) => {
    await executeSandboxChange({
      target,
      afterText: "after",
      preparation: p,
      refreshHostContext: async () => p.hostContext,
    });
    const pending = inspectSandboxTarget({ target, timeoutMs: 1 });
    await expect(disposeSandboxTarget(target)).rejects.toThrow("in progress");
    expect((await pending).status).toBe("unknown");
    const later = await inspectSandboxTarget({ target });
    expect(later.status).toBe("inspected");
    expect(later.callerOutcomeUncertain).toBe(false);
  }));

function rollbackInput(
  p: ReturnType<typeof preparation>,
  receipt: { receiptId: string; afterDigest: string; completedAt: string },
  rollbackId = "restore-1",
) {
  const now = new Date().toISOString(),
    until = new Date(Date.now() + 60000).toISOString(),
    entry = p.plan.entries[0],
    receiptDigest = enterpriseDigest(receipt);
  const inventory = {
    inventoryId: "rollback-inventory",
    customerId: p.plan.customerId,
    assetBindingDigest: entry.bindingDigest,
    executionReceiptDigest: receiptDigest,
    observedAt: now,
    validUntil: until,
    complete: true,
    dependentChangeIds: [],
    coordinationId: "exclusive-fixture",
    coordinationOwner: p.hostContext.identityId,
    coordinationValidUntil: until,
  };
  const approval = {
    approvalRef: "rollback-approval",
    approvedBy: "owner",
    sessionId: p.hostContext.sessionId,
    rollbackId,
    planDigest: p.plan.planDigest,
    changeId: p.changeId,
    executionReceiptId: receipt.receiptId,
    executionReceiptDigest: receiptDigest,
    action: "apply-patch",
    purpose: "rollback",
    dependencyInventoryDigest: enterpriseDigest(inventory),
    adapterId: "sandbox-full-text-v1",
    target: "fixture.txt",
    customerId: p.plan.customerId,
    assetId: p.hostContext.assetId,
    environment: p.hostContext.environment,
    identityId: p.hostContext.identityId,
    artifactDigest: entry.rollbackDigest,
    preconditionDigest: receipt.afterDigest,
    restorationDigest: entry.preconditionDigest,
    grantedAt: now,
    expiresAt: until,
    revokedAt: null,
  };
  return {
    plan: p.plan,
    planningInput: p.planningInput,
    changeId: p.changeId,
    rollbackId,
    executionReceipt: receipt,
    dependencyInventoryRef: inventory.inventoryId,
    currentPreconditionDigest: receipt.afterDigest,
    authorizationRef: p.authorizationRef,
    approvalRef: approval.approvalRef,
    now,
    hostContext: {
      ...p.hostContext,
      trustedExecutionReceipts: [receipt],
      trustedExecutionAdapters: [
        {
          receiptId: receipt.receiptId,
          receiptDigest,
          adapterId: "sandbox-full-text-v1",
          target: "fixture.txt",
        },
      ],
      trustedRollbackApprovals: [approval],
      trustedRollbackInventories: [inventory],
    },
  };
}
async function applied(
  target: Awaited<ReturnType<typeof createSandboxTarget>>,
  p: ReturnType<typeof preparation>,
) {
  const result = await executeSandboxChange({
    target,
    afterText: "after",
    preparation: p,
    refreshHostContext: async () => p.hostContext,
  });
  expect(result.status).toBe("applied");
  return result.receipt;
}
it("restores the exact prior image with a distinct rollback receipt and journal operation", async () =>
  run(async (target, p) => {
    const receipt = await applied(target, p),
      original = JSON.stringify(receipt),
      rollback = rollbackInput(p, receipt);
    const result = await executeSandboxRollback({
      target,
      restoreText: "before",
      preparation: rollback,
      refreshHostContext: async () => rollback.hostContext,
    });
    expect(result.status).toBe("restored");
    expect(result.receipt.schemaFamily).toBe(
      "enterprise-sandbox-rollback-receipt",
    );
    expect(result.receipt.status).toBe("restored");
    expect(result.receipt.originalExecutionReceiptId).toBe(receipt.receiptId);
    expect(result.findingResolution).toBe("unverified");
    expect(JSON.stringify(receipt)).toBe(original);
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "before",
    );
    const report = await inspectSandboxTarget({ target });
    expect(
      report.records.some(
        (r: { purpose?: string; rollbackOf?: string }) =>
          r.purpose === "rollback" && r.rollbackOf === receipt.receiptId,
      ),
    ).toBe(true);
  }));
it("rejects rollback authority revoked at the final gate", async () =>
  run(async (target, p) => {
    const rollback = rollbackInput(p, await applied(target, p));
    const result = await executeSandboxRollback({
      target,
      restoreText: "before",
      preparation: rollback,
      refreshHostContext: async () => {
        const host = structuredClone(rollback.hostContext);
        Object.assign(host.trustedRollbackApprovals[0], {
          revokedAt: new Date().toISOString(),
        });
        return host;
      },
    });
    expect(result.status).toBe("denied");
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "after",
    );
  }));
it("cannot restore a different registered root with matching bytes and logical asset", async () =>
  run(async (target, p) => {
    const rollback = rollbackInput(p, await applied(target, p));
    const other = await createSandboxTarget({
      assetId: target.assetId,
      environment: "sandbox",
      initialText: "after",
    });
    try {
      const result = await executeSandboxRollback({
        target: other,
        restoreText: "before",
        preparation: rollback,
        refreshHostContext: async () => rollback.hostContext,
      });
      expect(result.status).toBe("denied");
      expect(await readFile(path.join(other.root, "fixture.txt"), "utf8")).toBe(
        "after",
      );
    } finally {
      await disposeSandboxTarget(other);
    }
  }));
it("blocks replay under another rollback ID after restoration even if bytes are reset", async () =>
  run(async (target, p) => {
    const receipt = await applied(target, p),
      first = rollbackInput(p, receipt);
    expect(
      (
        await executeSandboxRollback({
          target,
          restoreText: "before",
          preparation: first,
          refreshHostContext: async () => first.hostContext,
        })
      ).status,
    ).toBe("restored");
    await writeFile(path.join(target.root, "fixture.txt"), "after");
    const second = rollbackInput(p, receipt, "restore-2");
    expect(
      (
        await executeSandboxRollback({
          target,
          restoreText: "before",
          preparation: second,
          refreshHostContext: async () => second.hostContext,
        })
      ).status,
    ).toBe("denied");
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "after",
    );
  }));
it("does not silently switch approved inventory while committing rollback", async () =>
  run(async (target, p) => {
    const rollback = rollbackInput(p, await applied(target, p));
    const result = await executeSandboxRollback({
      target,
      restoreText: "before",
      preparation: rollback,
      refreshHostContext: async () => {
        const host = structuredClone(rollback.hostContext);
        host.trustedRollbackInventories[0].coordinationId =
          "different-coordination";
        host.trustedRollbackApprovals[0].dependencyInventoryDigest =
          enterpriseDigest(host.trustedRollbackInventories[0]);
        return host;
      },
    });
    expect(result.status).toBe("denied");
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "after",
    );
  }));
it("keeps interrupted rollback unknown and correlated without an automatic retry", async () =>
  run(async (target, p) => {
    const receipt = await applied(target, p),
      rollback = rollbackInput(p, receipt);
    const result = await executeSandboxRollback({
      target,
      restoreText: "before",
      preparation: rollback,
      timeoutMs: 1000,
      refreshHostContext: () => new Promise(() => {}),
    });
    expect(result.status).toBe("unknown");
    expect(result.rollbackId).toBe(rollback.rollbackId);
    expect(result.originalExecutionReceiptId).toBe(receipt.receiptId);
    const report = await inspectSandboxTarget({ target });
    expect(report.callerOutcomeUncertain).toBe(true);
    expect(
      report.records.some(
        (r: { purpose?: string; historicalStatus: string }) =>
          r.purpose === "rollback" && r.historicalStatus === "pending",
      ),
    ).toBe(true);
    expect(await readFile(path.join(target.root, "fixture.txt"), "utf8")).toBe(
      "after",
    );
  }));
