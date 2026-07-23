import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  normalizeBrandCandidate,
  renderBrandCss,
  serializeDesignMd,
} from "../skills/html-docs-standard/scripts/lib/brand-profile.mjs";

const skillRoot = "skills/html-docs-standard";

async function makeGitProject({ ignored = false } = {}) {
  const project = await mkdtemp(join(tmpdir(), "brand-workflow-"));
  execFileSync("git", ["init", "-q"], { cwd: project });
  if (ignored) {
    await writeFile(
      join(project, ".git/info/exclude"),
      "/.onboarding/brand/\n/docs/onboarding/\n",
    );
  }
  return project;
}

async function installValidBrandProfile(project: string) {
  const profile = normalizeBrandCandidate({
    brandName: "Example Brand",
    colors: { primary: "#174f7b" },
    typography: { bodyFamily: "Example Sans" },
  });
  const directory = join(project, ".onboarding/brand");
  await writeFile(
    join(project, ".git/info/exclude"),
    "/.onboarding/brand/\n/docs/onboarding/\n",
  );
  await writeFile(join(directory, "DESIGN.md"), serializeDesignMd(profile), {
    encoding: "utf8",
    flag: "w",
  }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    const { mkdir } = await import("node:fs/promises");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "DESIGN.md"), serializeDesignMd(profile));
  });
  await writeFile(
    join(directory, "extraction-state.yaml"),
    `version: 1\nbrand_name: Example Brand\nsource_origin: https://brand.example\nextraction_method: static\nextraction_status: extracted\ncreated_at: 2026-07-22T00:00:00.000Z\ndesign_path: .onboarding/brand/DESIGN.md\n`,
  );
}

function runScript(script: string, arguments_: string[]) {
  return execFileSync(
    "node",
    [`${skillRoot}/scripts/${script}`, ...arguments_],
    {
      encoding: "utf8",
      stdio: "pipe",
    },
  );
}

async function writeCandidate(
  project: string,
  overrides: Record<string, unknown> = {},
) {
  const candidate = join(project, ".brand-candidate.json");
  await writeFile(
    candidate,
    `${JSON.stringify({
      brandName: "Example Brand",
      sourceOrigin: "https://brand.example",
      method: "static",
      status: "extracted",
      candidate: {
        colors: { primary: "#174f7b", surface: "#ffffff" },
        typography: { bodyFamily: "Example Sans" },
      },
      ...overrides,
    })}\n`,
  );
  return candidate;
}

describe("local brand profile lifecycle", () => {
  it("reports first-use without network when the profile is absent", async () => {
    const project = await makeGitProject();
    const output = runScript("ensure-brand-profile.mjs", [project]);
    expect(JSON.parse(output)).toMatchObject({ action: "first-use" });
  });

  it("reuses a valid profile and supports explicit refresh", async () => {
    const project = await makeGitProject({ ignored: true });
    await installValidBrandProfile(project);
    expect(
      JSON.parse(runScript("ensure-brand-profile.mjs", [project])),
    ).toMatchObject({ action: "reuse" });
    expect(
      JSON.parse(runScript("ensure-brand-profile.mjs", [project, "--refresh"])),
    ).toMatchObject({ action: "refresh" });
  });

  it("writes ignored canonical state and removes the temporary candidate", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project);
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);

    expect(
      await readFile(join(project, ".onboarding/brand/DESIGN.md"), "utf8"),
    ).toContain('name: "Example Brand"');
    expect(
      await readFile(
        join(project, ".onboarding/brand/extraction-state.yaml"),
        "utf8",
      ),
    ).toContain("source_origin: https://brand.example");
    expect(existsSync(candidate)).toBe(false);
    expect(() =>
      execFileSync("git", ["check-ignore", "-q", ".onboarding/brand"], {
        cwd: project,
      }),
    ).not.toThrow();
  });

  it("records an accessible deterministic fallback", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project, {
      status: "insufficient",
      candidate: { colors: {}, typography: {}, confidence: "low" },
    });
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);
    const state = await readFile(
      join(project, ".onboarding/brand/extraction-state.yaml"),
      "utf8",
    );
    expect(state).toContain("extraction_method: fallback");
    expect(state).toContain("extraction_status: fallback");
    expect(
      JSON.parse(runScript("ensure-brand-profile.mjs", [project])),
    ).toMatchObject({ action: "reuse" });
  });

  it("rejects a browser candidate with a private source origin", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project, {
      sourceOrigin: "http://127.0.0.1",
      method: "browser",
    });
    expect(() =>
      runScript("write-brand-profile.mjs", [
        "--project-root",
        project,
        "--candidate",
        candidate,
      ]),
    ).toThrow(/private/i);
    expect(existsSync(candidate)).toBe(true);
  });

  it("backs up an invalid existing profile before replacement", async () => {
    const project = await makeGitProject();
    const directory = join(project, ".onboarding/brand");
    const { mkdir, readdir } = await import("node:fs/promises");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "DESIGN.md"), "invalid: true\n");
    const candidate = await writeCandidate(project);
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);
    expect(
      (await readdir(directory)).some((file) => /^DESIGN\.invalid-/.test(file)),
    ).toBe(true);
  });

  it("generates semantic brand CSS atomically from DESIGN.md", async () => {
    const project = await makeGitProject({ ignored: true });
    await installValidBrandProfile(project);
    const output = join(project, "docs/onboarding/assets/docs-brand.css");
    runScript("generate-brand-css.mjs", [
      "--design",
      join(project, ".onboarding/brand/DESIGN.md"),
      "--output",
      output,
    ]);
    const css = await readFile(output, "utf8");
    expect(css).toContain("--brand-primary:");
    expect(css).toContain("--font-body:");
    expect(css).toContain("system-ui");
  });

  it("verifies valid ignored state and generated CSS", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project);
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);
    const output = join(project, "docs/onboarding/assets/docs-brand.css");
    runScript("generate-brand-css.mjs", [
      "--design",
      join(project, ".onboarding/brand/DESIGN.md"),
      "--output",
      output,
    ]);
    expect(() =>
      runScript("verify-brand-profile.mjs", [
        project,
        "docs/onboarding/assets/docs-brand.css",
      ]),
    ).not.toThrow();
  });

  it("rejects generated CSS that is stale against DESIGN.md", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project);
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);
    const staleProfile = normalizeBrandCandidate({
      brandName: "Old Brand",
      colors: { primary: "#275d8c" },
      typography: { bodyFamily: "Example Sans" },
    });
    const cssPath = join(project, "docs/onboarding/assets/docs-brand.css");
    await mkdir(join(project, "docs/onboarding/assets"), { recursive: true });
    await writeFile(cssPath, renderBrandCss(staleProfile));

    expect(() =>
      runScript("verify-brand-profile.mjs", [
        project,
        "docs/onboarding/assets/docs-brand.css",
      ]),
    ).toThrow(/out of sync/i);
  });

  it("applies a first-use candidate, generated CSS, and verification together", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project);
    const cssPath = join(project, "docs/onboarding/assets/docs-brand.css");

    expect(() =>
      runScript("apply-brand-profile.mjs", [
        "--project-root",
        project,
        "--candidate",
        candidate,
        "--css-output",
        cssPath,
      ]),
    ).not.toThrow();

    expect(existsSync(candidate)).toBe(false);
    expect(await readFile(cssPath, "utf8")).toContain(
      "--brand-primary: #174f7b;",
    );
    expect(() =>
      runScript("verify-brand-profile.mjs", [
        project,
        "docs/onboarding/assets/docs-brand.css",
      ]),
    ).not.toThrow();
  });

  it("reports unsafe state and incomplete generated CSS together", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project);
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);
    const statePath = join(project, ".onboarding/brand/extraction-state.yaml");
    const state = await readFile(statePath, "utf8");
    await writeFile(
      statePath,
      state.replace(
        "https://brand.example",
        "https://brand.example/private?token=value",
      ),
    );
    const cssPath = join(project, "docs-brand.css");
    await writeFile(cssPath, ":root { --brand-primary: #174f7b; }\n");
    let message = "";
    try {
      runScript("verify-brand-profile.mjs", [project, cssPath]);
    } catch (error) {
      message = String((error as { stderr?: string }).stderr ?? error);
    }
    expect(message).toMatch(/source_origin/i);
    expect(message).toMatch(/missing brand CSS variable/i);
    await rm(cssPath, { force: true });
  });

  it("rejects a tampered private source origin during offline verification", async () => {
    const project = await makeGitProject();
    const candidate = await writeCandidate(project);
    runScript("write-brand-profile.mjs", [
      "--project-root",
      project,
      "--candidate",
      candidate,
    ]);
    const statePath = join(project, ".onboarding/brand/extraction-state.yaml");
    const state = await readFile(statePath, "utf8");
    await writeFile(
      statePath,
      state.replace("https://brand.example", "http://127.0.0.1"),
    );
    expect(() => runScript("verify-brand-profile.mjs", [project])).toThrow(
      /private/i,
    );
  });
});
