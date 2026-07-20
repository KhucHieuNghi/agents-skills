import { readdirSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { parse } from "yaml";
import type { DiscoveredSkill } from "./discovery.js";

export type ValidationResult = { valid: boolean; errors: string[] };

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECRET_DETECTORS = [
  { name: "API key assignment", pattern: /\b[A-Z][A-Z0-9_]*_API_KEY\s*=/ },
  { name: "token assignment", pattern: /\b[A-Z][A-Z0-9_]*_TOKEN\s*=/ },
  {
    name: "PEM private key",
    pattern: /-----BEGIN(?: [A-Z]+)* PRIVATE KEY-----/,
  },
];

export function validateSkill(skill: DiscoveredSkill): ValidationResult {
  const errors = validateFrontmatter(skill);
  errors.push(...findSecretAssignments(skill));

  return { valid: errors.length === 0, errors };
}

function validateFrontmatter(skill: DiscoveredSkill): string[] {
  const frontmatter = skill.markdown.match(
    /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/,
  );

  if (frontmatter === null) {
    return ["SKILL.md must begin with YAML frontmatter."];
  }

  let metadata: unknown;
  try {
    metadata = parse(frontmatter[1]);
  } catch {
    return ["SKILL.md frontmatter must be valid YAML."];
  }

  if (!isSkillMetadata(metadata)) {
    return [
      "SKILL.md frontmatter must include string name and description fields.",
    ];
  }

  const errors: string[] = [];
  if (!SKILL_NAME_PATTERN.test(metadata.name)) {
    errors.push("Skill name must match ^[a-z0-9]+(-[a-z0-9]+)*$.");
  }
  if (metadata.name !== skill.name) {
    errors.push("Skill name must match its package directory.");
  }

  return errors;
}

function findSecretAssignments(skill: DiscoveredSkill): string[] {
  return listPackageFiles(skill.directory).flatMap((file) => {
    const text = readTextFile(file);
    if (text === undefined) {
      return [];
    }

    const detector = SECRET_DETECTORS.find(({ pattern }) => pattern.test(text));
    if (detector === undefined) {
      return [];
    }

    return [
      `Possible secret (${detector.name}) in ${relative(skill.directory, file)}.`,
    ];
  });
}

function listPackageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return listPackageFiles(file);
    }

    return entry.isFile() ? [file] : [];
  });
}

function readTextFile(file: string): string | undefined {
  const content = readFileSync(file);
  return content.includes(0) ? undefined : content.toString("utf8");
}

function isSkillMetadata(
  value: unknown,
): value is { name: string; description: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    value.description.length > 0
  );
}
