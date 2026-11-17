import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

/** A projection of declared configuration and collector defaults, not new authority. */
export function runContract(config) {
  const network = config.network;
  return {
    contractVersion: 1,
    scope: {
      inputs: globalThis.structuredClone(config.inputs),
      mode: config.mode ?? "full",
      inventoryComplete: config.inventoryComplete,
      trackingParameters: globalThis.structuredClone(
        config.trackingParameters ?? [],
      ),
    },
    sourcePermissions: {
      localRoots: globalThis.structuredClone(config.localRoots),
      network: network
        ? { allowedOrigins: globalThis.structuredClone(network.allowedOrigins) }
        : null,
    },
    budgets: {
      maxRunBytes: config.maxRunBytes ?? 96 * 1024 * 1024,
      maxLocalBytes: config.maxBytes ?? 10 * 1024 * 1024,
      network: network
        ? {
            maxBytes: network.maxBytes ?? 10 * 1024 * 1024,
            timeoutMs: network.timeoutMs ?? 20000,
            maxRedirects: network.maxRedirects ?? 5,
            retries: network.retries ?? 2,
            collectionTimeoutMs:
              network.collectionTimeoutMs ?? network.timeoutMs ?? 20000,
          }
        : null,
    },
  };
}
export function hasRunContract(run) {
  return (
    run.version === "0.2.0" ||
    ["contractVersion", "scope", "sourcePermissions", "budgets"].some((key) =>
      Object.hasOwn(run, key),
    )
  );
}
export function validateRunContract(run, config) {
  if (!hasRunContract(run)) return; // Legacy artifacts do not claim this contract.
  if (
    !config ||
    createHash("sha256").update(JSON.stringify(config)).digest("hex") !==
      run.configHash
  )
    throw new Error("Run configuration hash mismatch");
  const expected = runContract(config);
  for (const [key, value] of Object.entries(expected))
    if (!isDeepStrictEqual(run[key], value))
      throw new Error(`Run configuration contract mismatch: ${key}`);
  if (
    run.mode !== expected.scope.mode ||
    run.inventoryComplete !== expected.scope.inventoryComplete
  )
    throw new Error("Run configuration contract mismatch: scope flags");
}
