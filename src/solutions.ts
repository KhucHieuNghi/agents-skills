import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import type { Target } from "./types.js";

export type SolutionComponent = {
  id: string;
  source: "bundled" | "upstream";
  upstream?: string;
  digest: string;
};

export type SolutionManifest = {
  schemaVersion: 1;
  id: string;
  version: string;
  outcome: string;
  entrypoint: string;
  hosts: Target[];
  qualityGates: string[];
  components: SolutionComponent[];
};

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^[a-f0-9]{64}$/;
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export async function loadSolutionManifest(
  file: string,
): Promise<SolutionManifest> {
  const raw: unknown = parse(await readFile(file, "utf8"));
  if (!isRecord(raw) || raw.schemaVersion !== 1) {
    throw new Error("Solution manifest requires schemaVersion 1.");
  }
  const id = stringField(raw, "id");
  const version = stringField(raw, "version");
  const entrypoint = stringField(raw, "entrypoint");
  if (
    !IDENTIFIER.test(id) ||
    !IDENTIFIER.test(entrypoint) ||
    !VERSION.test(version)
  ) {
    throw new Error("Solution id, entrypoint, or semantic version is invalid.");
  }
  const hosts = stringArray(raw.hosts, "hosts");
  if (
    hosts.length === 0 ||
    new Set(hosts).size !== hosts.length ||
    hosts.some((host) => host !== "codex" && host !== "claude-code")
  ) {
    throw new Error("Solution hosts must be Codex and/or Claude Code.");
  }
  const qualityGates = stringArray(raw.qualityGates, "qualityGates");
  if (qualityGates.length === 0) {
    throw new Error("Solution requires quality gates.");
  }
  if (!Array.isArray(raw.components) || raw.components.length === 0) {
    throw new Error("Solution requires components.");
  }
  const components: SolutionComponent[] = raw.components.map(
    (item: unknown) => {
      if (!isRecord(item)) {
        throw new Error("Solution component must be an object.");
      }
      const componentId = stringField(item, "id");
      const digest = stringField(item, "digest");
      if (!IDENTIFIER.test(componentId) || !DIGEST.test(digest)) {
        throw new Error(
          `Solution component ${componentId} has invalid id or digest.`,
        );
      }
      if (item.source !== "bundled" && item.source !== "upstream") {
        throw new Error(
          `Solution component ${componentId} has invalid source.`,
        );
      }
      if (item.source === "upstream") {
        const upstream = stringField(item, "upstream");
        if (!IDENTIFIER.test(upstream)) {
          throw new Error(
            `Solution component ${componentId} has invalid upstream.`,
          );
        }
        return { id: componentId, source: "upstream", upstream, digest };
      }
      if (item.upstream !== undefined) {
        throw new Error(
          `Bundled component ${componentId} cannot name an upstream.`,
        );
      }
      return { id: componentId, source: "bundled", digest };
    },
  );
  if (
    new Set(components.map(({ id: componentId }) => componentId)).size !==
    components.length
  ) {
    throw new Error("Solution contains duplicate components.");
  }
  if (!components.some((component) => component.id === entrypoint)) {
    throw new Error("Solution entrypoint must be one of its components.");
  }
  return {
    schemaVersion: 1,
    id,
    version,
    outcome: stringField(raw, "outcome"),
    entrypoint,
    hosts: hosts as Target[],
    qualityGates,
    components,
  };
}

export async function loadIndexedSolution(
  catalogFile: string,
  solutionId: string,
): Promise<SolutionManifest> {
  const catalog: unknown = parse(await readFile(catalogFile, "utf8"));
  if (!isRecord(catalog) || !isRecord(catalog.solutions)) {
    throw new Error("Catalog must define solutions.");
  }
  const entry = catalog.solutions[solutionId];
  if (!isRecord(entry)) {
    throw new Error(`Solution not found: ${solutionId}`);
  }
  const relativePath = stringField(entry, "manifest");
  if (
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("Solution manifest path must stay inside the catalog.");
  }
  const manifest = await loadSolutionManifest(
    resolve(dirname(catalogFile), relativePath),
  );
  if (manifest.id !== solutionId) {
    throw new Error(`Solution index and manifest disagree: ${solutionId}`);
  }
  return manifest;
}

function stringField(record: Record<string, unknown>, name: string): string {
  const value = record[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Solution requires ${name}.`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    throw new Error(`Solution ${label} must be a non-empty string list.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
