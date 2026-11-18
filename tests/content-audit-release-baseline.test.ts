import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { verifySolutionRelease } from "../src/release.js";
import { digestTree } from "../src/integrity.js";

const execute = promisify(execFile);
const archive =
  "tests/fixtures/content-audit/enterprise/legacy/release-0.2.0.tgz";
const archiveHash =
  "313a36b5de511c5658067e432c1c8e87e8231ec82b7dc15e9e78875dc18a116d";
it("preserves the released archive and all legacy run/report artifacts against its verified implementation", async () => {
  expect(
    createHash("sha256")
      .update(await readFile(archive))
      .digest("hex"),
  ).toBe(archiveHash);
  const root = await mkdtemp(
    path.join(tmpdir(), "enterprise-release-baseline-"),
  );
  try {
    // Only execute the archived helper after authenticating the exact historical release bytes and lock.
    await execute("tar", ["-xzf", path.resolve(archive), "-C", root]);
    const release = path.join(root, "package");
    expect(await digestTree(release)).toBe(
      "96162e8a14ad867bbba5cd11bc28225ca7f406c9ce63fadbd3505d1d75b41ed9",
    );
    expect((await verifySolutionRelease(release)).version).toBe("0.2.0");
    const content = path.join(root, "input");
    await mkdir(content);
    await writeFile(
      path.join(content, "page.md"),
      "# Product\nSynthetic compatibility fixture, not a customer pilot.\n",
    );
    await writeFile(path.join(content, "unreadable.pdf"), "%PDF-synthetic");
    const config = path.join(root, "config.json");
    await writeFile(
      config,
      JSON.stringify({
        inputs: [
          { path: path.join(content, "page.md"), source: "fixture" },
          { path: path.join(content, "unreadable.pdf"), source: "fixture" },
        ],
        localRoots: [content],
        inventoryComplete: true,
        brandName: "Baseline fixture",
      }),
    );
    const before = path.join(root, "before"),
      after = path.join(root, "after");
    await execute(process.execPath, [
      path.join(release, "skills/content-search-audit/scripts/audit.mjs"),
      "start",
      config,
      before,
    ]);
    await execute(process.execPath, [
      path.resolve("skills/content-search-audit/scripts/audit.mjs"),
      "start",
      config,
      after,
    ]);
    async function artifacts(
      directory: string,
      prefix = "",
    ): Promise<Record<string, string>> {
      const output: Record<string, string> = {};
      for (const item of await readdir(path.join(directory, prefix), {
        withFileTypes: true,
      })) {
        const name = path.join(prefix, item.name);
        if (item.isDirectory())
          Object.assign(output, await artifacts(directory, name));
        else
          output[name] = (await readFile(path.join(directory, name), "utf8"))
            .replaceAll(directory, "<run-directory>")
            .replace(
              /\d{4}\\?-\d{2}\\?-\d{2}T\d{2}:\d{2}:\d{2}\\?\.\d{3}Z/g,
              "<timestamp>",
            )
            .replace(
              /[a-f0-9]{8}\\?-[a-f0-9]{4}\\?-4[a-f0-9]{3}\\?-[89ab][a-f0-9]{3}\\?-[a-f0-9]{12}/g,
              "<run-id>",
            );
      }
      return output;
    }
    const historical = await artifacts(before);
    expect(historical).toHaveProperty("report.html");
    expect(historical).toHaveProperty("report.md");
    expect(historical).toHaveProperty("checks.jsonl");
    expect(await artifacts(after)).toEqual(historical);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
