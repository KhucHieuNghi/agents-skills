import { resolve } from "node:path";
import { checkUpstreams, loadUpstreams } from "../upstreams.js";

export async function runCheckUpstreams(options: {
  catalog?: string;
  failOnUpdate?: boolean;
}): Promise<void> {
  const upstreams = await loadUpstreams(
    resolve(options.catalog ?? "catalog.yaml"),
  );
  const status = await checkUpstreams(upstreams.values());
  console.log(JSON.stringify({ upstreams: status }, null, 2));
  if (
    options.failOnUpdate &&
    status.some(({ updateAvailable }) => updateAvailable)
  ) {
    process.exitCode = 2;
  }
}
