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
});
