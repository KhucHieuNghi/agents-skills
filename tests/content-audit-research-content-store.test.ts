import { mkdtemp, realpath, readFile, rm, cp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, it, vi } from "vitest";
const cryptoTrace = vi.hoisted(() => ({ aad: [] }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createDecipheriv: (...args) => {
      const cipher = actual.createDecipheriv(...args);
      const setAAD = cipher.setAAD.bind(cipher);
      cipher.setAAD = (value, ...rest) => {
        cryptoTrace.aad.push(value.toString());
        return setAAD(value, ...rest);
      };
      return cipher;
    },
  };
});
vi.mock("../scripts/private-control-transport.mjs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runPrivateControlOperation: vi.fn(actual.runPrivateControlOperation),
  };
});
import { runPrivateControlOperation } from "../scripts/private-control-transport.mjs";
import {
  fixture,
  bundle as encodeBundle,
} from "./helpers/research-projection.js";
import { enterpriseDigest } from "../skills/content-search-audit/scripts/lib/enterprise-state.mjs";
import { advanceResearchAccessState } from "../scripts/enterprise-journeys/research-access-state.mjs";
import {
  createResearchControlStore,
  registerStoredResearchReviews,
  advanceStoredResearchAccess,
} from "../scripts/enterprise-journeys/research-control-store.mjs";
import {
  createResearchContentStore,
  storeResearchContentEdition,
  readResearchContentEdition,
  inspectResearchContentEdition,
  readResearchContentForAssembly,
  removeResearchContentEdition,
} from "../scripts/enterprise-journeys/research-content-store.mjs";

async function setup(fn, configuration = {}) {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "research-content-store-")),
  );
  try {
    const f = await fixture();
    f.receipt.reviewedAt = f.context.assessmentAt;
    if (configuration.reviewMaxAgeSeconds) {
      f.policy.reviewMaxAgeSeconds = configuration.reviewMaxAgeSeconds;
      f.receipt.policyDigest = enterpriseDigest(f.policy);
    }
    if (configuration.receiptValidUntil)
      f.receipt.validUntil = configuration.receiptValidUntil;
    const b = encodeBundle(f);
    const controlDirectory = join(root, "control");
    const control = {
      directory: controlDirectory,
      key: randomBytes(32),
      context: f.context,
      authority: {
        scopeDigest: enterpriseDigest(
          advanceResearchAccessState(null, null, f.context).scope,
        ),
        directory: controlDirectory,
        stagingDirectory: root,
        artifactClass: "research-control-metadata",
        allowed: true,
        observedAt: f.context.assessmentAt,
        validUntil: "2026-11-20T00:00:00Z",
        maxAgeSeconds: 3600,
      },
    };
    await createResearchControlStore(control);
    await registerStoredResearchReviews(control, 1, {
      descriptors: f.descriptors,
      researchPayloads: f.payloads,
      policy: f.policy,
      candidates: b.candidates,
      payloads: b.payloads,
    });
    const sourceScope = f.policy.scope;
    const directory = join(root, "content");
    const context = {
      customerId: sourceScope.customerId,
      recipientId: sourceScope.recipientId,
      purposeDigest: sourceScope.purposeDigest,
      storeId: "store",
      assessmentAt: f.context.assessmentAt,
    };
    const identity = {
      namespace: "research-report-content-v1",
      customerId: context.customerId,
      recipientId: context.recipientId,
      purposeDigest: context.purposeDigest,
      storeId: context.storeId,
      directory,
    };
    const options = {
      directory,
      key: randomBytes(32),
      context,
      authority: {
        scopeDigest: enterpriseDigest(identity),
        directory,
        stagingDirectory: dirname(directory),
        artifactClass: "governed-report-content",
        operation: "create",
        allowed: true,
        observedAt: context.assessmentAt,
        validUntil: "2026-11-20T00:00:00Z",
        maxAgeSeconds: 3600,
        retainUntil: "2026-11-19T02:45:00Z",
      },
    };
    const metadata = {
      descriptors: f.descriptors,
      policy: f.policy,
      candidates: b.candidates,
    };
    const loaders = {
      research: vi.fn(async (d) =>
        structuredClone(f.payloads.find((p) => p.sourceId === d.sourceId)),
      ),
      candidate: vi.fn(async (c) =>
        structuredClone(
          b.payloads.find((p) => p.candidateId === c.candidateId),
        ),
      ),
    };
    await fn({ root, f, control, options, metadata, loaders });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
function operation(options, name) {
  return { ...options, authority: { ...options.authority, operation: name } };
}

it("checks availability without decrypting content and keeps old editions withheld after withdrawal and regrant", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    cryptoTrace.aad.length = 0;
    expect(
      await inspectResearchContentEdition(
        operation(options, "inspect"),
        2,
        control,
        2,
      ),
    ).toEqual({
      status: "available",
      disclosureAuthorized: false,
      deliveryAuthorized: false,
    });
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
    control.context.assessmentAt = "2026-11-19T02:01:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    control.context.access[0].customerSummaryAllowed = false;
    await advanceStoredResearchAccess(control, 2);
    cryptoTrace.aad.length = 0;
    expect(
      await inspectResearchContentEdition(
        operation(options, "inspect"),
        2,
        control,
        3,
      ),
    ).toEqual({
      status: "withheld",
      disclosureAuthorized: false,
      deliveryAuthorized: false,
    });
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
    control.context.assessmentAt = "2026-11-19T02:02:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    control.context.access[0].customerSummaryAllowed = true;
    await advanceStoredResearchAccess(control, 3);
    expect(
      (
        await inspectResearchContentEdition(
          operation(options, "inspect"),
          2,
          control,
          4,
        )
      ).status,
    ).toBe("withheld");
  }));
it("returns owner-bound private provenance only through the assembly read", async () =>
  setup(async ({ f, control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const result = await readResearchContentForAssembly(
      operation(options, "assemble-read"),
      2,
      control,
      2,
    );
    const draft = JSON.parse(result.artifacts.json);
    expect(draft.items[0].summary).toBe(f.raw.summary);
    expect(result.privateProvenance.reportDigest).toBe(enterpriseDigest(draft));
    expect(result.privateProvenance.manifestDigest).toBe(
      enterpriseDigest(result.artifacts.manifest),
    );
    expect(result).toMatchObject({
      persistenceAuthorized: false,
      disclosureAuthorized: false,
      deliveryAuthorized: false,
    });
    const normal = await readResearchContentEdition(
      operation(options, "read"),
      2,
      control,
      2,
    );
    expect(normal).not.toHaveProperty("privateProvenance");
  }));
it("withholds expired review at metadata preflight without decrypting content", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    control.context.assessmentAt = "2026-11-19T02:31:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    cryptoTrace.aad.length = 0;
    expect(
      (
        await inspectResearchContentEdition(
          operation(options, "inspect"),
          2,
          control,
          2,
        )
      ).status,
    ).toBe("withheld");
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
  }));
it("does not classify corrupted metadata or wrong assembly authority as withholding", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    await expect(
      readResearchContentForAssembly(operation(options, "read"), 2, control, 2),
    ).rejects.toThrow(/authority/i);
    execFileSync("python3", [
      "-c",
      "import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); row=c.execute('select envelope from control').fetchone(); e=json.loads(row[0]); e['metadata']['tag']='AAAAAAAAAAAAAAAAAAAAAA=='; c.execute('update control set envelope=?',(json.dumps(e),)); c.commit()",
      join(options.directory, "control.sqlite"),
    ]);
    cryptoTrace.aad.length = 0;
    await expect(
      inspectResearchContentEdition(
        operation(options, "inspect"),
        2,
        control,
        2,
      ),
    ).rejects.toThrow(/authentication/i);
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
  }));
it("does not confuse metadata eligibility with content authentication", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    execFileSync("python3", [
      "-c",
      "import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); row=c.execute('select envelope from control').fetchone(); e=json.loads(row[0]); e['content']['tag']='AAAAAAAAAAAAAAAAAAAAAA=='; c.execute('update control set envelope=?',(json.dumps(e),)); c.commit()",
      join(options.directory, "control.sqlite"),
    ]);
    cryptoTrace.aad.length = 0;
    expect(
      (
        await inspectResearchContentEdition(
          operation(options, "inspect"),
          2,
          control,
          2,
        )
      ).status,
    ).toBe("available");
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
    await expect(
      readResearchContentForAssembly(
        operation(options, "assemble-read"),
        2,
        control,
        2,
      ),
    ).rejects.toThrow(/authentication/i);
  }));
it("rejects a content-store race during metadata-only availability inspection", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const actual = await vi.importActual(
      "../scripts/private-control-transport.mjs",
    );
    let removed = false;
    vi.mocked(runPrivateControlOperation).mockImplementation(
      async (...args) => {
        const result = await actual.runPrivateControlOperation(...args);
        if (
          !removed &&
          args[0] === "read" &&
          args[1].directory === options.directory
        ) {
          removed = true;
          await removeResearchContentEdition(operation(options, "remove"), 2);
        }
        return result;
      },
    );
    try {
      cryptoTrace.aad.length = 0;
      await expect(
        inspectResearchContentEdition(
          operation(options, "inspect"),
          2,
          control,
          2,
        ),
      ).rejects.toThrow(/revision/i);
      expect(
        cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
      ).toBe(false);
    } finally {
      vi.mocked(runPrivateControlOperation).mockImplementation(
        actual.runPrivateControlOperation,
      );
    }
  }));
it("rejects a research controller change during metadata-only inspection", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const actual = await vi.importActual(
      "../scripts/private-control-transport.mjs",
    );
    let changed = false;
    vi.mocked(runPrivateControlOperation).mockImplementation(
      async (...args) => {
        const result = await actual.runPrivateControlOperation(...args);
        if (
          !changed &&
          args[0] === "read" &&
          args[1].directory === options.directory
        ) {
          changed = true;
          control.context.assessmentAt = "2026-11-19T02:01:00Z";
          control.context.access[0].customerSummaryAllowed = false;
          await advanceStoredResearchAccess(control, 2);
        }
        return result;
      },
    );
    try {
      cryptoTrace.aad.length = 0;
      await expect(
        inspectResearchContentEdition(
          operation(options, "inspect"),
          2,
          control,
          2,
        ),
      ).rejects.toThrow();
      expect(
        cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
      ).toBe(false);
    } finally {
      vi.mocked(runPrivateControlOperation).mockImplementation(
        actual.runPrivateControlOperation,
      );
    }
  }));

it("stores encrypted artifacts and denies access after withdrawal, even after regrant", async () =>
  setup(async ({ f, control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const read = await readResearchContentEdition(
      operation(options, "read"),
      2,
      control,
      2,
    );
    expect(read.artifacts.json).toContain(f.raw.summary);
    const bytes = await readFile(join(options.directory, "control.sqlite"));
    expect(bytes.toString()).not.toContain(f.raw.summary);
    for (const call of vi
      .mocked(runPrivateControlOperation)
      .mock.calls.filter(
        (args) => args[1].directory === options.directory && args[4] !== null,
      )) {
      expect(call[4]).not.toContain(f.raw.summary);
      expect(call[4]).not.toContain(options.key.toString("base64"));
    }
    control.context.assessmentAt = "2026-11-19T02:01:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    control.context.access[0].customerSummaryAllowed = false;
    await advanceStoredResearchAccess(control, 2);
    vi.mocked(runPrivateControlOperation).mockClear();
    await expect(
      readResearchContentEdition(operation(options, "read"), 2, control, 2),
    ).rejects.toThrow(/research|revision/i);
    expect(
      vi
        .mocked(runPrivateControlOperation)
        .mock.calls.filter((args) => args[1].directory === options.directory),
    ).toHaveLength(0);
    control.context.assessmentAt = "2026-11-19T02:02:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    control.context.access[0].customerSummaryAllowed = true;
    await advanceStoredResearchAccess(control, 3);
    await expect(
      readResearchContentEdition(operation(options, "read"), 2, control, 2),
    ).rejects.toThrow(/research|revision/i);
    await removeResearchContentEdition(operation(options, "remove"), 2);
    await expect(
      readResearchContentEdition(operation(options, "read"), 3, control, 4),
    ).rejects.toThrow();
  }));
it("rejects tampered content ciphertext and a wrong content key", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    await expect(
      readResearchContentEdition(
        { ...operation(options, "read"), key: randomBytes(32) },
        2,
        control,
        2,
      ),
    ).rejects.toThrow(/authentication/i);
    execFileSync("python3", [
      "-c",
      "import sqlite3,json,sys; c=sqlite3.connect(sys.argv[1]); row=c.execute('select envelope from control').fetchone(); e=json.loads(row[0]); e['content']['tag']='AAAAAAAAAAAAAAAAAAAAAA=='; c.execute('update control set envelope=?',(json.dumps(e),)); c.commit()",
      join(options.directory, "control.sqlite"),
    ]);
    await expect(
      readResearchContentEdition(operation(options, "read"), 2, control, 2),
    ).rejects.toThrow(/authentication/i);
  }));
it("rejects an expired review before returning stored content", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    control.context.assessmentAt = "2026-11-19T02:31:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    cryptoTrace.aad.length = 0;
    await expect(
      readResearchContentEdition(operation(options, "read"), 2, control, 2),
    ).rejects.toThrow(/review|expiry/i);
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
  }));
it("enforces review maximum age even while the receipt itself is unexpired", async () =>
  setup(
    async ({ control, options, metadata, loaders }) => {
      await createResearchContentStore(options);
      await storeResearchContentEdition(
        operation(options, "store"),
        1,
        control,
        2,
        metadata,
        loaders,
      );
      control.context.assessmentAt = "2026-11-19T02:01:00Z";
      options.context.assessmentAt = control.context.assessmentAt;
      cryptoTrace.aad.length = 0;
      await expect(
        readResearchContentEdition(operation(options, "read"), 2, control, 2),
      ).rejects.toThrow(/review.*expired/i);
      expect(
        cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
      ).toBe(false);
    },
    { reviewMaxAgeSeconds: 60, receiptValidUntil: "2026-11-19T02:30:00Z" },
  ));
it("does not return cached ciphertext when removal commits during a read", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const actual = await vi.importActual(
      "../scripts/private-control-transport.mjs",
    );
    let removed = false;
    vi.mocked(runPrivateControlOperation).mockImplementation(
      async (...args) => {
        const result = await actual.runPrivateControlOperation(...args);
        if (
          !removed &&
          args[0] === "read" &&
          args[1].directory === options.directory
        ) {
          removed = true;
          await removeResearchContentEdition(operation(options, "remove"), 2);
        }
        return result;
      },
    );
    try {
      cryptoTrace.aad.length = 0;
      await expect(
        readResearchContentEdition(operation(options, "read"), 2, control, 2),
      ).rejects.toThrow(/revision/i);
      expect(
        cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
      ).toBe(false);
    } finally {
      vi.mocked(runPrivateControlOperation).mockImplementation(
        actual.runPrivateControlOperation,
      );
    }
  }));
it("discards decrypted output if removal happens after the pre-decrypt check", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const actual = await vi.importActual(
      "../scripts/private-control-transport.mjs",
    );
    let reads = 0;
    vi.mocked(runPrivateControlOperation).mockImplementation(
      async (...args) => {
        const result = await actual.runPrivateControlOperation(...args);
        if (
          args[0] === "read" &&
          args[1].directory === options.directory &&
          ++reads === 2
        ) {
          await removeResearchContentEdition(operation(options, "remove"), 2);
        }
        return result;
      },
    );
    try {
      cryptoTrace.aad.length = 0;
      await expect(
        readResearchContentEdition(operation(options, "read"), 2, control, 2),
      ).rejects.toThrow(/revision/i);
      expect(
        cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
      ).toBe(true);
    } finally {
      vi.mocked(runPrivateControlOperation).mockImplementation(
        actual.runPrivateControlOperation,
      );
    }
  }));
it("snapshots candidate loader output before later host mutation", async () =>
  setup(async ({ f, control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    const readOriginal = loaders.candidate;
    loaders.candidate = vi.fn(async (descriptor) => {
      const value = await readOriginal(descriptor);
      setTimeout(() => {
        value.receiptText = "MUTATED_AFTER_RETURN";
      }, 0);
      return value;
    });
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const result = await readResearchContentEdition(
      operation(options, "read"),
      2,
      control,
      2,
    );
    expect(result.artifacts.json).toContain(f.raw.summary);
  }));
it("does not retry a content write when a committed response is lost", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    const actual = await vi.importActual(
      "../scripts/private-control-transport.mjs",
    );
    let writes = 0;
    vi.mocked(runPrivateControlOperation).mockImplementation(
      async (...args) => {
        const result = await actual.runPrivateControlOperation(...args);
        if (args[0] === "replace" && args[1].directory === options.directory) {
          writes += 1;
          throw Error(
            "Private storage response unavailable; commit outcome unknown",
          );
        }
        return result;
      },
    );
    try {
      await expect(
        storeResearchContentEdition(
          operation(options, "store"),
          1,
          control,
          2,
          metadata,
          loaders,
        ),
      ).rejects.toThrow(/outcome unknown/i);
      expect(writes).toBe(1);
    } finally {
      vi.mocked(runPrivateControlOperation).mockImplementation(
        actual.runPrivateControlOperation,
      );
    }
    expect(
      (
        await readResearchContentEdition(
          operation(options, "read"),
          2,
          control,
          2,
        )
      ).revision,
    ).toBe(2);
  }));
it("allows one CAS writer and supports cleanup after content retention expires", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    const writes = await Promise.allSettled([
      storeResearchContentEdition(
        operation(options, "store"),
        1,
        control,
        2,
        metadata,
        loaders,
      ),
      storeResearchContentEdition(
        operation(options, "store"),
        1,
        control,
        2,
        metadata,
        loaders,
      ),
    ]);
    expect(
      writes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      writes.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    control.context.assessmentAt = "2026-11-19T02:46:00Z";
    options.context.assessmentAt = control.context.assessmentAt;
    const read = operation(options, "read");
    read.authority.retainUntil = null;
    await expect(
      readResearchContentEdition(read, 2, control, 2),
    ).rejects.toThrow(/retention/i);
    const remove = operation(options, "remove");
    remove.authority.retainUntil = null;
    expect(await removeResearchContentEdition(remove, 2)).toMatchObject({
      revision: 3,
      physicalErasureVerified: false,
    });
  }));
it("rejects denied content authority before either acquisition loader", async () =>
  setup(async ({ control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    const denied = operation(options, "store");
    denied.authority.allowed = false;
    await expect(
      storeResearchContentEdition(denied, 1, control, 2, metadata, loaders),
    ).rejects.toThrow(/authority/i);
    expect(loaders.research).not.toHaveBeenCalled();
    expect(loaders.candidate).not.toHaveBeenCalled();
  }));
it("does not accept a different controller copy with the same scope and revision", async () =>
  setup(async ({ root, control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const alternateDirectory = join(root, "old-control");
    await cp(control.directory, alternateDirectory, { recursive: true });
    const alternate = {
      ...control,
      context: structuredClone(control.context),
      authority: { ...control.authority, directory: alternateDirectory },
      directory: alternateDirectory,
    };
    control.context.assessmentAt = "2026-11-19T02:01:00Z";
    control.context.access[0].customerSummaryAllowed = false;
    await advanceStoredResearchAccess(control, 2);
    alternate.context.assessmentAt = control.context.assessmentAt;
    options.context.assessmentAt = control.context.assessmentAt;
    await expect(
      readResearchContentEdition(operation(options, "read"), 2, alternate, 2),
    ).rejects.toThrow(/controller|directory/i);
  }));
it("rejects a copied content database even with a separately granted destination", async () =>
  setup(async ({ root, control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const directory = join(root, "copied-content");
    await cp(options.directory, directory, { recursive: true });
    await removeResearchContentEdition(operation(options, "remove"), 2);
    const destinationScope = enterpriseDigest({
      namespace: "research-report-content-v1",
      customerId: options.context.customerId,
      recipientId: options.context.recipientId,
      purposeDigest: options.context.purposeDigest,
      storeId: options.context.storeId,
      directory,
    });
    const destination = {
      ...operation(options, "read"),
      directory,
      authority: {
        ...operation(options, "read").authority,
        directory,
        scopeDigest: destinationScope,
      },
    };
    cryptoTrace.aad.length = 0;
    await expect(
      readResearchContentEdition(destination, 2, control, 2),
    ).rejects.toThrow();
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
    execFileSync("python3", [
      "-c",
      "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.execute('update control set scope=?',(sys.argv[2],)); c.commit()",
      join(directory, "control.sqlite"),
      destinationScope,
    ]);
    await expect(
      readResearchContentEdition(destination, 2, control, 2),
    ).rejects.toThrow(/authentication/i);
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
  }));
it("rejects a symlinked directory alias before decrypting report content", async () =>
  setup(async ({ root, control, options, metadata, loaders }) => {
    await createResearchContentStore(options);
    await storeResearchContentEdition(
      operation(options, "store"),
      1,
      control,
      2,
      metadata,
      loaders,
    );
    const aliasRoot = join(root, "alias");
    await symlink(root, aliasRoot);
    const directory = join(aliasRoot, "content");
    const scopeDigest = enterpriseDigest({
      namespace: "research-report-content-v1",
      customerId: options.context.customerId,
      recipientId: options.context.recipientId,
      purposeDigest: options.context.purposeDigest,
      storeId: options.context.storeId,
      directory,
    });
    const alias = {
      ...operation(options, "read"),
      directory,
      authority: {
        ...operation(options, "read").authority,
        directory,
        stagingDirectory: aliasRoot,
        scopeDigest,
      },
    };
    cryptoTrace.aad.length = 0;
    await expect(
      readResearchContentEdition(alias, 2, control, 2),
    ).rejects.toThrow();
    expect(
      cryptoTrace.aad.some((aad) => aad.includes('"part":"content"')),
    ).toBe(false);
  }));
it.each(["recipient", "location", "class"])(
  "rejects mismatched %s authority before acquisition",
  async (field) =>
    setup(async ({ control, options, metadata, loaders }) => {
      await createResearchContentStore(options);
      const denied = operation(options, "store");
      if (field === "recipient")
        denied.context = { ...denied.context, recipientId: "other" };
      if (field === "location") denied.authority.directory += "-other";
      if (field === "class")
        denied.authority.artifactClass = "research-control-metadata";
      await expect(
        storeResearchContentEdition(denied, 1, control, 2, metadata, loaders),
      ).rejects.toThrow(/authority/i);
      expect(loaders.research).not.toHaveBeenCalled();
      expect(loaders.candidate).not.toHaveBeenCalled();
    }),
);
