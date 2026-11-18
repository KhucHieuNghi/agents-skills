# Guard entrypoint alias failure and correction

The full 0.1.40 trial executed a direct `rtk proxy node -e ...` command despite
the declared guard rejecting inline Node code. Tool ID
`toolu_014sgdRFHvtpAbCTsX8jisit` and its successful directory-listing result are
retained in that trial's native events. The earlier no-denial counts did not
prove that the guard was active.

## Root cause and bounded reproduction

The prototype compared `import.meta.url` with a URL made from `process.argv[1]`.
When the temporary script was invoked through macOS `/var/...`, Node resolved
its module through `/private/var/...`. Equality failed, the main stdin handler
never ran, and the script exited 0 with empty output. Claude legitimately treated
empty successful hook output as no decision; `onFailure: block` cannot detect
this semantic no-op. This was a defect in the author prototype, not the skill
package.

The [direct reproduction](path-alias-reproduction.json) binds exact script hashes
and outcomes: the original alias emits nothing; its canonical path emits a denial;
the corrected script emits a denial through the alias too. The source fix compares
real paths. A symlink CLI regression failed on empty output before the change and
passed afterward; all 42 focused tests and ESLint passed.

## Evidence impact

The initial three-case native integration used the guard at `/Users/...` and its
observed deny/allow/missing/timeout results remain valid for that path. Its scope
cannot be extended to the broken temporary-copy entrypoint. Full Expanded 0.1.38,
0.1.39 and the in-flight 0.1.40 trial used the broken alias and are **not evidence
of enforced execution**, even where every observed command happened to comply.
Their raw archives, prompts, settings and old script copies must remain unchanged.

The running 0.1.40 session was not modified when this defect was discovered. Its
content/report artifacts can still be evaluated as observed outputs, with the
execution-profile failure explicitly recorded. The corrected guard needs native
integration through a temporary alias before any enforcement claim. No commercial
release or human verdict follows from this correction.

## Module import follow-up

Author-side parser replay through `node --input-type=module -` exposed a separate import exception: `argv[1]` is `-`, which is not a real executable path. Entrypoint detection now catches an unavailable importer path and returns false. Direct native file invocation is unchanged. A stdin-import regression and the symlink regression pass among **43 focused tests**; ESLint passes. Frozen integration/extraction copies retain SHA `3f1fde9e765b3d0674b747d5a7bb53b221c28c392a51a173c4340912d5c3b498` and are not overwritten. The final source includes this later import-only correction; no new native session was run for it.
