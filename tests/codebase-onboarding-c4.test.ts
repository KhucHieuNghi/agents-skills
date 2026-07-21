import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const skillRoot = "skills/codebase-onboarding-c4";

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
});
