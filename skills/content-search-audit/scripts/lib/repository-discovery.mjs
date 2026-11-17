import { Buffer } from "node:buffer";
import { lstat, opendir, realpath } from "node:fs/promises";
import path from "node:path";

const text = (value) => typeof value === "string" && value.trim().length > 0;
const within = (root, file) => {
  const relative = path.relative(root, file);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
};
/** Enumerate explicitly scoped stable local directories without reading or executing file contents. */
export async function enumerateRepository(config) {
  if (
    !config ||
    !text(config.sourceId) ||
    !Array.isArray(config.roots) ||
    !config.roots.length ||
    config.roots.some((root) => !text(root) || !path.isAbsolute(root)) ||
    !Array.isArray(config.extensions) ||
    !config.extensions.length ||
    config.extensions.some(
      (ext) =>
        typeof ext !== "string" ||
        (ext !== "" && ext !== "*" && !/^\.[a-z0-9]+$/.test(ext)),
    ) ||
    !Array.isArray(config.excludeDirectoryNames) ||
    config.excludeDirectoryNames.some(
      (name) => !text(name) || /[/\\]/.test(name) || [".", ".."].includes(name),
    )
  )
    throw new Error(
      "Explicit repository roots, extensions and directory exclusions required",
    );
  const maxEntries = config.maxEntries ?? 100000,
    maxDepth = config.maxDepth ?? 64;
  const maxRecordsBytes = config.maxRecordsBytes ?? 8 * 1024 * 1024;
  if (
    !Number.isSafeInteger(maxEntries) ||
    maxEntries < 1 ||
    maxEntries > 1000000 ||
    !Number.isSafeInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > 128 ||
    !Number.isSafeInteger(maxRecordsBytes) ||
    maxRecordsBytes < 128 ||
    maxRecordsBytes > 8 * 1024 * 1024
  )
    throw new Error("Invalid repository traversal limits");
  const roots = [];
  for (const root of config.roots) {
    const stat = await lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error(
        "Repository root must be a real directory, not a symlink",
      );
    roots.push(await realpath(root));
  }
  const selectedRoots = [...new Set(roots)]
    .sort()
    .filter(
      (root, _i, all) =>
        !all.some((parent) => parent !== root && within(parent, root)),
    );
  const directories = selectedRoots.map((root) => ({
    root,
    directory: root,
    depth: 0,
  }));
  const records = [],
    pendingQueue = [],
    exclusions = [],
    skippedExtensions = new Map();
  let visitedEntries = 0,
    bytes = 2,
    stopped = false;
  const pending = (kind, locator, reason) =>
    pendingQueue.push({ kind, locator, reason });
  for (let index = 0; index < directories.length; index++) {
    const current = directories[index];
    let directory;
    try {
      const before = await lstat(current.directory);
      if (
        !before.isDirectory() ||
        before.isSymbolicLink() ||
        !within(current.root, await realpath(current.directory))
      ) {
        pending(
          "changed-directory",
          current.directory,
          "Directory changed or escaped the authorized root",
        );
        continue;
      }
      directory = await opendir(current.directory);
      let entry;
      while ((entry = await directory.read()) !== null) {
        const file = path.join(current.directory, entry.name);
        if (visitedEntries >= maxEntries) {
          pending(
            "entry-budget",
            current.directory,
            "Traversal stopped at entry budget; rerun this source with a larger authorized budget",
          );
          stopped = true;
          break;
        }
        visitedEntries++;
        if (entry.isSymbolicLink()) {
          pending(
            "unfollowed-symlink",
            file,
            "Symlink target not traversed; authorize its real root separately or explicitly narrow scope",
          );
          continue;
        }
        if (entry.isDirectory()) {
          if (config.excludeDirectoryNames.includes(entry.name))
            exclusions.push({
              locator: file,
              reason: "Explicit directory-name exclusion",
            });
          else if (current.depth >= maxDepth)
            pending("depth-budget", file, "Directory depth limit reached");
          else
            directories.push({
              root: current.root,
              directory: file,
              depth: current.depth + 1,
            });
          continue;
        }
        if (!entry.isFile()) {
          pending(
            "unsupported-entry",
            file,
            "Non-regular filesystem entry not read",
          );
          continue;
        }
        const extension = path.extname(entry.name).toLowerCase();
        if (
          !config.extensions.includes("*") &&
          !config.extensions.includes(extension)
        ) {
          skippedExtensions.set(
            extension,
            (skippedExtensions.get(extension) ?? 0) + 1,
          );
          continue;
        }
        const record = { path: file };
        const recordBytes = Buffer.byteLength(JSON.stringify(record)) + 1;
        if (bytes + recordBytes > maxRecordsBytes) {
          pending(
            "record-budget",
            current.directory,
            "Inventory metadata budget reached; split authorized roots into separately identified source exports",
          );
          stopped = true;
          break;
        }
        records.push(record);
        bytes += recordBytes;
      }
      const after = await lstat(current.directory);
      if (
        before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs ||
        before.ino !== after.ino
      )
        pending(
          "directory-mutated",
          current.directory,
          "Directory metadata changed during enumeration; repeat on a stable tree",
        );
    } catch (error) {
      pending(
        "directory-read-failure",
        current.directory,
        `Directory enumeration failed (${error.code ?? "read-error"})`,
      );
    } finally {
      await directory?.close();
    }
    if (stopped) {
      for (const remaining of directories.slice(index + 1))
        pending(
          "unvisited-directory",
          remaining.directory,
          "Traversal budget ended before this directory was visited",
        );
      break;
    }
  }
  records.sort((a, b) => a.path.localeCompare(b.path));
  return {
    id: config.sourceId,
    kind: "records",
    locator: `repository:${config.sourceId}`,
    collectedAt: new Date().toISOString(),
    complete: pendingQueue.length === 0,
    records,
    pendingQueue,
    exclusions,
    scope: {
      roots: selectedRoots,
      extensions: [...new Set(config.extensions)].sort(),
      excludeDirectoryNames: [...new Set(config.excludeDirectoryNames)].sort(),
      maxEntries,
      maxDepth,
      maxRecordsBytes,
      visitedEntries,
      skippedExtensions: Object.fromEntries(
        [...skippedExtensions].sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
    limitations: [
      "Enumeration covers only declared roots/extensions/exclusions; it does not establish full site or CMS scope",
      "File contents are not read; PDFs and other formats remain subject to collection/extraction support",
      "No Git commands, ignore rules, hooks, scripts or network requests execute",
      "Use stable trusted directories; this is not an atomic filesystem snapshot or hostile concurrent ancestor sandbox",
      "Partial enumeration requires a fresh source export, not an unverified cursor resume",
    ],
  };
}
