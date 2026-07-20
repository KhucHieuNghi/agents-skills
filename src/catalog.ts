import { readFile } from "node:fs/promises";
import { parse } from "yaml";

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CatalogSource = { name: string; reference: string };
export type CatalogSkill = {
  name: string;
  source: CatalogSource;
  tags: string[];
  conflicts: string[];
};
export type CatalogProfile = {
  name: string;
  intents: string[];
  skills: CatalogSkill[];
};
export type SkillCatalog = {
  profiles: Map<string, CatalogProfile>;
};

type CatalogDocument = {
  version?: unknown;
  sources?: unknown;
  skills?: unknown;
  profiles?: unknown;
};

export async function loadCatalog(file: string): Promise<SkillCatalog> {
  const parsed = parse(await readFile(file, "utf8"));
  if (!isRecord(parsed)) {
    throw new Error("Catalog must be an object.");
  }
  const document = parsed as CatalogDocument;
  if (document.version !== 1) {
    throw new Error("Catalog version must be 1.");
  }

  const sources = parseSources(document.sources);
  const skills = parseSkills(document.skills, sources);
  return { profiles: parseProfiles(document.profiles, skills) };
}

export function resolveIntent(
  catalog: SkillCatalog,
  intent: string,
): CatalogProfile {
  assertIdentifier("Intent", intent);
  const matches = [...catalog.profiles.values()].filter((profile) =>
    profile.intents.includes(intent),
  );
  if (matches.length === 0) {
    throw new Error(`No profile matches intent: ${intent}`);
  }
  if (matches.length > 1) {
    throw new Error(`Intent matches multiple profiles: ${intent}`);
  }
  return validateProfile(matches[0]);
}

export function resolveProfile(
  catalog: SkillCatalog,
  profileName: string,
): CatalogProfile {
  assertIdentifier("Profile", profileName);
  const profile = catalog.profiles.get(profileName);
  if (profile === undefined) {
    throw new Error(`Profile not found: ${profileName}`);
  }

  return validateProfile(profile);
}

function validateProfile(profile: CatalogProfile): CatalogProfile {
  assertNoConflicts(profile);
  return profile;
}

function parseSources(value: unknown): Map<string, CatalogSource> {
  const sources = new Map<string, CatalogSource>();
  for (const [name, definition] of entries("sources", value)) {
    assertIdentifier("Source", name);
    const reference = property(definition, "reference");
    if (typeof reference !== "string" || reference.length === 0) {
      throw new Error(`Source ${name} must define a non-empty reference.`);
    }
    sources.set(name, { name, reference });
  }
  return sources;
}

function parseSkills(
  value: unknown,
  sources: Map<string, CatalogSource>,
): Map<string, CatalogSkill> {
  const skills = new Map<string, CatalogSkill>();
  for (const [name, definition] of entries("skills", value)) {
    assertIdentifier("Skill", name);
    const sourceName = property(definition, "source");
    if (typeof sourceName !== "string" || !sources.has(sourceName)) {
      throw new Error(`Skill ${name} must reference a defined source.`);
    }
    skills.set(name, {
      name,
      source: sources.get(sourceName) as CatalogSource,
      tags: identifiers(`Skill ${name} tags`, property(definition, "tags"), []),
      conflicts: identifiers(
        `Skill ${name} conflicts`,
        property(definition, "conflicts"),
        [],
      ),
    });
  }
  return skills;
}

function parseProfiles(
  value: unknown,
  skills: Map<string, CatalogSkill>,
): Map<string, CatalogProfile> {
  const profiles = new Map<string, CatalogProfile>();
  for (const [name, definition] of entries("profiles", value)) {
    assertIdentifier("Profile", name);
    const selectedSkills = identifiers(
      `Profile ${name} skills`,
      property(definition, "skills"),
    ).map((skillName) => {
      const skill = skills.get(skillName);
      if (skill === undefined) {
        throw new Error(
          `Profile ${name} references unknown skill: ${skillName}`,
        );
      }
      return skill;
    });
    profiles.set(name, {
      name,
      intents: identifiers(
        `Profile ${name} intents`,
        property(definition, "intents"),
      ),
      skills: selectedSkills,
    });
  }
  return profiles;
}

function assertNoConflicts(profile: CatalogProfile): void {
  const selected = new Set(profile.skills.map((skill) => skill.name));
  for (const skill of profile.skills) {
    const conflict = skill.conflicts.find((name) => selected.has(name));
    if (conflict !== undefined) {
      throw new Error(
        `Profile ${profile.name} contains conflicting skills: ${skill.name} and ${conflict}`,
      );
    }
  }
}

function entries(name: string, value: unknown): Array<[string, unknown]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Catalog ${name} must be an object.`);
  }
  return Object.entries(value);
}

function property(value: unknown, name: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Catalog entry must be an object.`);
  }
  return (value as Record<string, unknown>)[name];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifiers(
  name: string,
  value: unknown,
  fallback?: string[],
): string[] {
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${name} must be an array of identifiers.`);
  }
  for (const identifier of value) {
    assertIdentifier(name, identifier);
  }
  return value;
}

function assertIdentifier(label: string, value: string): void {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`${label} must be lowercase hyphenated.`);
  }
}
