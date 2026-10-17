import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { resolveCacheDirectory } from "../config.js";
import { digestTree } from "../integrity.js";
import { buildSolutionRelease, packSolutionRelease } from "../release.js";
import { loadIndexedSolution } from "../solutions.js";
import { loadUpstreams } from "../upstreams.js";

export async function runBuildSolution(
  id: string,
  options: { catalog?: string; output: string },
): Promise<void> {
  const catalog = resolve(options.catalog ?? "catalog.yaml");
  const manifest = await loadIndexedSolution(catalog, id);
  const upstreams = await loadUpstreams(catalog);
  const outputDirectory = resolve(options.output);
  await buildSolutionRelease({
    manifest,
    upstreams,
    repositoryRoot: dirname(catalog),
    cacheDirectory: resolveCacheDirectory(homedir()),
    outputDirectory,
  });
  const archive = await packSolutionRelease(
    outputDirectory,
    dirname(outputDirectory),
  );
  console.log(
    JSON.stringify({
      solution: id,
      version: manifest.version,
      release: outputDirectory,
      digest: await digestTree(outputDirectory),
      archive: archive.path,
      archiveDigest: archive.digest,
    }),
  );
}
