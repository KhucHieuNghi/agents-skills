import { homedir } from "node:os";
import { parseSourceReference, resolveCacheDirectory } from "../config.js";
import { stageSource } from "../source.js";

export async function runPull(source: string): Promise<void> {
  const staged = await stageSource(
    parseSourceReference(source),
    resolveCacheDirectory(homedir()),
  );

  console.log(JSON.stringify({ cached: staged.cached, status: "staged" }));
}
