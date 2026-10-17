import { cwd } from "node:process";
import { resolve } from "node:path";
import {
  installSolutionRelease,
  upgradeSolutionRelease,
} from "../solution-install.js";
import { parseTargets } from "./apply.js";

export async function runInstallSolution(options: {
  release: string;
  digest: string;
  project?: string;
  target: string;
}): Promise<void> {
  const targets = parseTargets(options.target);
  const projectDirectory = resolve(options.project ?? cwd());
  await installSolutionRelease({
    releaseDirectory: resolve(options.release),
    expectedDigest: options.digest,
    projectDirectory,
    targets,
  });
  console.log(
    JSON.stringify({
      installed: options.release,
      project: projectDirectory,
      targets,
    }),
  );
}

export async function runUpgradeSolution(options: {
  release: string;
  digest: string;
  project?: string;
  target: string;
}): Promise<void> {
  const targets = parseTargets(options.target);
  const projectDirectory = resolve(options.project ?? cwd());
  await upgradeSolutionRelease({
    releaseDirectory: resolve(options.release),
    expectedDigest: options.digest,
    projectDirectory,
    targets,
  });
  console.log(
    JSON.stringify({
      upgraded: options.release,
      project: projectDirectory,
      targets,
    }),
  );
}
