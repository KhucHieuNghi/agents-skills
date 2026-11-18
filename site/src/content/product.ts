import type { Host } from "./prompts.js";

export const productFacts = {
  id: "codebase-onboarding",
  version: "1.1.0",
  entrypoint: "codebase-onboarding-c4",
  hosts: ["codex", "claude-code"] as Host[],
  components: ["codebase-onboarding-c4", "html-docs-standard", "hallmark"],
  releaseStatus:
    "Technical release; behavior quality not yet verified across customer repositories.",
  prerequisites: [
    "Node.js 22+",
    "Git",
    "codegraph",
    "rtk",
    "valid CodeGraph index at the repository root",
  ],
  links: {
    source: "https://github.com/KhucHieuNghi/agents-skills",
    setup:
      "https://github.com/KhucHieuNghi/agents-skills/blob/main/docs/guides/technical-v1.md",
    release:
      "https://github.com/KhucHieuNghi/agents-skills/blob/main/docs/releases/1.1.0.md",
    manifest:
      "https://github.com/KhucHieuNghi/agents-skills/blob/main/solutions/codebase-onboarding.yaml",
  },
} as const;

type Claim = {
  id: string;
  version: string;
  entrypoint: string;
  hosts: readonly string[];
  components: readonly string[];
};

type Manifest = {
  id: string;
  version: string;
  entrypoint: string;
  hosts: readonly string[];
  components: ReadonlyArray<{ id: string }>;
};

export function claimMismatches(claim: Claim, manifest: Manifest): string[] {
  const mismatches: string[] = [];
  for (const key of ["id", "version", "entrypoint"] as const) {
    if (claim[key] !== manifest[key]) mismatches.push(key);
  }
  if (claim.hosts.toSorted().join(",") !== manifest.hosts.toSorted().join(","))
    mismatches.push("hosts");
  if (
    claim.components.toSorted().join(",") !==
    manifest.components
      .map((component) => component.id)
      .toSorted()
      .join(",")
  )
    mismatches.push("components");
  return mismatches;
}

// Public presentation status is explicit: catalog membership is not release acceptance.
const solutionStatuses: Record<string, "technical" | "candidate"> = {
  "codebase-onboarding": "technical",
  "problem-presentation": "candidate",
  "content-search-audit": "candidate",
};

export function summarizeSolutions(solutions: Record<string, unknown>) {
  const ids = Object.keys(solutions);
  if (
    ids.toSorted().join(",") !==
    Object.keys(solutionStatuses).toSorted().join(",")
  ) {
    throw new Error(
      "Review public solution statuses when catalog membership changes",
    );
  }
  return {
    total: ids.length,
    technical: ids.filter((id) => solutionStatuses[id] === "technical").length,
    candidates: ids.filter((id) => solutionStatuses[id] === "candidate").length,
  };
}
