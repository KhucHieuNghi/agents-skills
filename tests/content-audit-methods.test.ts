import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

const helper = path.resolve("skills/content-search-audit/scripts/audit.mjs");
it("prints actual method bodies for context loading from any working directory", async () => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [helper, "methods"],
    { cwd: "/tmp" },
  );
  const result = JSON.parse(stdout);
  expect(result.methods).toHaveLength(6);
  for (const method of result.methods) {
    expect(method.text).toBe(
      await readFile(
        path.resolve("skills/content-search-audit", method.path),
        "utf8",
      ),
    );
    expect(method.sha256).toBe(
      createHash("sha256").update(method.text).digest("hex"),
    );
  }
  expect(result).not.toHaveProperty("reviewComplete");
});
it("selects a known dimension and rejects arbitrary file paths", async () => {
  const { stdout } = await promisify(execFile)(process.execPath, [
    helper,
    "methods",
    "aeo",
  ]);
  expect(
    JSON.parse(stdout).methods.map((m: { dimension: string }) => m.dimension),
  ).toEqual(["aeo"]);
  await expect(
    promisify(execFile)(process.execPath, [
      helper,
      "methods",
      "../../README.md",
    ]),
  ).rejects.toThrow(/dimension/i);
});
