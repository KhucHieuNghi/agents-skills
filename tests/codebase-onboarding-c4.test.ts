import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { createBrandedOnboardingWorkspace } from "./helpers/create-branded-onboarding-workspace.mjs";

const skillRoot = "skills/codebase-onboarding-c4";
const workspaceVerifier = `${skillRoot}/scripts/verify-onboarding-workspace.mjs`;

async function createOnboardingWorkspace({ branded = true } = {}) {
  const project = await mkdtemp(join(tmpdir(), "onboarding-workspace-"));
  if (branded) {
    await createBrandedOnboardingWorkspace({
      projectRoot: project,
      htmlSkillRoot: "skills/html-docs-standard",
      onboardingSkillRoot: skillRoot,
    });
    return project;
  }
  execFileSync("git", ["init", "-q"], { cwd: project });
  await mkdir(join(project, "docs/onboarding"), { recursive: true });
  await mkdir(join(project, ".onboarding/runs"), { recursive: true });
  await writeFile(
    join(project, ".git/info/exclude"),
    "/docs/onboarding/\n/.onboarding/\n",
  );
  for (const file of [
    "index.html",
    "product-business.md",
    "product-business.html",
    "technical-architecture.md",
    "technical-architecture.html",
  ]) {
    await writeFile(join(project, "docs/onboarding", file), "synthetic\n");
  }
  await copyFile(
    `${skillRoot}/assets/state-template.yaml`,
    join(project, ".onboarding/state.yaml"),
  );
  await copyFile(
    `${skillRoot}/assets/evidence-template.yaml`,
    join(project, ".onboarding/evidence.yaml"),
  );
  await copyFile(
    `${skillRoot}/assets/run-summary-template.yaml`,
    join(project, ".onboarding/runs/sample-run.yaml"),
  );
  return project;
}

describe("codebase-onboarding-c4 contracts", () => {
  it("defines a journey-first Product and Business contract", async () => {
    const [journey, evidence] = await Promise.all([
      readFile(`${skillRoot}/references/product-business-journey.md`, "utf8"),
      readFile(
        `${skillRoot}/references/evidence-and-output-contract.md`,
        "utf8",
      ),
    ]);

    for (const section of [
      "## Journey selection",
      "## Mode depth",
      "## Required journey structure",
      "## Product document boundary",
    ]) {
      expect(journey).toContain(section);
    }

    for (const requirement of [
      "business operation journey",
      "Journey ID",
      "Trigger and preconditions",
      "Actors, roles, and responsibilities",
      "Business rules",
      "State transitions",
      "Critical exceptions",
      "Domain vocabulary",
      "grey zones",
    ]) {
      expect(journey).toContain(requirement);
    }

    expect(journey).toContain("An HTTP request path is not a business journey");
    expect(journey).toContain("Do not add KPI, SLA, or target metrics");
    expect(evidence).toContain("## Source precedence and contradictions");
    expect(evidence).toContain("current code or runtime behavior");
  });

  it("defines complete C1 and C2 with journey-selective C3", async () => {
    const technical = await readFile(
      `${skillRoot}/references/technical-c4-navigation.md`,
      "utf8",
    );
    const normalizedTechnical = technical.replace(/\s+/g, " ");

    for (const section of [
      "## C1 System Context",
      "## C2 Containers",
      "## Selective C3 Components",
      "## Required technical views",
      "## Engineering Navigation",
      "## Mode depth",
    ]) {
      expect(technical).toContain(section);
    }

    for (const requirement of [
      "Repository count does not define container count",
      "Dependency direction",
      "Owned data",
      "Failure boundary",
      "critical shared boundary",
      "Runtime and startup model",
      "Primary entrypoints",
      "Test strategy and test locations",
      "CodeGraph call paths",
    ]) {
      expect(normalizedTechnical).toContain(requirement);
    }

    expect(normalizedTechnical).toContain(
      "Do not create a class or function catalog",
    );
  });

  it("defines stage-gated adaptive coordination and root ownership", async () => {
    const [skill, coordinator] = await Promise.all([
      readFile(`${skillRoot}/SKILL.md`, "utf8"),
      readFile(`${skillRoot}/references/adaptive-coordinator.md`, "utf8"),
    ]);

    for (const stage of [
      "Preflight",
      "Inline orientation",
      "Inline journey selection",
      "Gap planning",
      "Adaptive investigation",
      "Root reconciliation",
      "Quality evaluation",
      "Delivery",
    ]) {
      expect(coordinator).toContain(stage);
    }

    for (const field of [
      "track_id",
      "question",
      "scope",
      "expected_output",
      "evidence_required",
      "dependencies",
      "access_required",
      "stop_conditions",
      "out_of_scope",
    ]) {
      expect(coordinator).toContain(`\`${field}\``);
    }

    const normalizedCoordinator = coordinator.replace(/\s+/g, " ");
    expect(normalizedCoordinator).toContain("at least two independent");
    expect(coordinator).toContain("root agent");
    expect(coordinator).toContain("PASS_WITH_GREY_ZONES");
    expect(normalizedCoordinator).toContain("one targeted retry per section");
    expect(skill).toContain("references/adaptive-coordinator.md");
    expect(skill).toContain("references/product-business-journey.md");
    expect(skill).toContain("references/technical-c4-navigation.md");
  });

  it("ships agent manifests for Codex, Claude Code, and OpenCode", async () => {
    const manifests = await Promise.all(
      ["openai", "claude-code", "opencode"].map(async (agent) => ({
        agent,
        manifest: parse(
          await readFile(`${skillRoot}/agents/${agent}.yaml`, "utf8"),
        ),
      })),
    );

    expect(manifests.map(({ agent }) => agent)).toEqual([
      "openai",
      "claude-code",
      "opencode",
    ]);
    for (const { manifest } of manifests) {
      expect(manifest.interface).toMatchObject({
        display_name: "Codebase Onboarding C4",
        short_description: "Map a large codebase into C4 onboarding.",
        default_prompt:
          "Use $codebase-onboarding-c4 to create evidence-backed onboarding for this codebase.",
      });
    }
  });

  it("ships parseable resume and evidence templates", async () => {
    const [stateText, evidenceText, runText] = await Promise.all([
      readFile(`${skillRoot}/assets/state-template.yaml`, "utf8"),
      readFile(`${skillRoot}/assets/evidence-template.yaml`, "utf8"),
      readFile(`${skillRoot}/assets/run-summary-template.yaml`, "utf8"),
    ]);

    const state = parse(stateText);
    const evidence = parse(evidenceText);
    const run = parse(runText);

    expect(state).toMatchObject({
      schema_version: 1,
      mode: "standard",
      status: "preflight",
      tracks: [],
      grey_zones: [],
    });
    expect(Object.keys(state.gates)).toEqual([
      "product_journey",
      "technical_c4",
      "engineering_navigation",
      "evidence_integrity",
      "security_public_boundary",
    ]);
    expect(evidence).toEqual({ schema_version: 1, items: [] });
    expect(run).toMatchObject({
      schema_version: 1,
      final_status: "NOT_READY",
      tracks: [],
      contradictions: [],
      grey_zones: [],
    });
  });

  it("documents local ignore and stale-state behavior", async () => {
    const [skill, workspace, runbook] = await Promise.all([
      readFile(`${skillRoot}/SKILL.md`, "utf8"),
      readFile(`${skillRoot}/references/workspace-and-state.md`, "utf8"),
      readFile(`${skillRoot}/references/real-project-usage.md`, "utf8"),
    ]);

    expect(workspace).toContain("git check-ignore");
    expect(workspace).toContain(".git/info/exclude");
    expect(workspace).toContain("Do not edit tracked `.gitignore`");
    expect(workspace).toContain("atomic replace");
    expect(workspace).toContain("Git HEAD");
    expect(workspace).toContain("stale");
    expect(workspace).toContain(".onboarding/brand/DESIGN.md");
    expect(workspace).toContain("docs-brand.css");
    expect(workspace).toContain("Mermaid base theme");
    expect(skill).toContain("ensure-brand-profile.mjs");
    expect(skill).toContain("Do not preview");
    for (const instruction of [
      "Brand name",
      "Brand website",
      "action: reuse",
      "--refresh",
      "verify-brand-profile.mjs",
    ]) {
      expect(runbook).toContain(instruction);
    }
  });

  it("verifies a complete ignored local onboarding workspace", async () => {
    const project = await createOnboardingWorkspace();
    try {
      const output = execFileSync("node", [workspaceVerifier, project], {
        encoding: "utf8",
      });
      expect(output).toContain("Onboarding workspace contract passed");
    } finally {
      await rm(project, { force: true, recursive: true });
    }
  });

  it("rejects onboarding HTML without local brand state and assets", async () => {
    const project = await createOnboardingWorkspace({ branded: false });
    try {
      expect(() =>
        execFileSync("node", [workspaceVerifier, project], {
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).toThrow(/brand/i);
    } finally {
      await rm(project, { force: true, recursive: true });
    }
  });

  it("accepts a fully branded ignored onboarding workspace", async () => {
    const project = await createOnboardingWorkspace({ branded: true });
    try {
      expect(() =>
        execFileSync("node", [workspaceVerifier, project], {
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).not.toThrow();
    } finally {
      await rm(project, { force: true, recursive: true });
    }
  });

  it("rejects onboarding state without schema_version", async () => {
    const project = await createOnboardingWorkspace();
    try {
      await writeFile(
        join(project, ".onboarding/state.yaml"),
        "status: preflight\n",
      );
      expect(() =>
        execFileSync("node", [workspaceVerifier, project], {
          encoding: "utf8",
          stdio: "pipe",
        }),
      ).toThrow(/schema_version/);
    } finally {
      await rm(project, { force: true, recursive: true });
    }
  });

  it("defines the required synthetic behavior scenarios", async () => {
    const scenarios = parse(
      await readFile(
        "tests/fixtures/onboarding-scenarios/scenarios.yaml",
        "utf8",
      ),
    );

    expect(scenarios.schema_version).toBe(1);
    expect(
      scenarios.scenarios.map((scenario: { id: string }) => scenario.id),
    ).toEqual([
      "single-service-inline",
      "monorepo-container-boundaries",
      "multi-repository-adaptive",
      "missing-external-access",
      "conflicting-evidence",
      "no-subagent-runtime",
      "sensitive-evidence",
    ]);

    for (const scenario of scenarios.scenarios) {
      expect(scenario).toMatchObject({
        topology: expect.any(String),
        prompt: expect.any(String),
        expected: {
          route: expect.any(String),
          status: expect.any(String),
          required: expect.any(Array),
          forbidden: expect.any(Array),
        },
      });
    }
  });

  it("keeps topology behavior quality unverified until forward testing", async () => {
    const evaluation = await readFile(
      `${skillRoot}/references/evaluation-contract.md`,
      "utf8",
    );

    for (const section of [
      "## Evaluation layers",
      "## Behavior rubric",
      "## Release classification",
      "## Private forward-test boundary",
    ]) {
      expect(evaluation).toContain(section);
    }
    expect(evaluation).toContain("quality-unverified");
    expect(evaluation).toContain(
      "inline fallback meets the same output contract",
    );
    expect(evaluation).toContain("Do not compare exact prose snapshots");
  });
});
