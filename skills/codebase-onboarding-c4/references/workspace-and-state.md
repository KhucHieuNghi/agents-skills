# Local Workspace and Resume Contract

## Output layout

Write Product and Technical Markdown and HTML under `docs/onboarding/`. Write
state, evidence, and per-run summaries under `.onboarding/`.

## Local ignore gate

Run `git check-ignore` for both generated roots before writing. If either root
is not ignored, add `/docs/onboarding/` and `/.onboarding/` to
`.git/info/exclude`, then check again. Do not edit tracked `.gitignore`
automatically. Warn and stop artifact generation when either root can still be
tracked.

## Safe writes

Check existing artifacts and ask before replacing them. Write YAML through a
temporary sibling file followed by an atomic replace. Never place credentials,
connection strings, raw database rows, private remote URLs, or absolute private
paths in state or evidence.

## Resume and invalidation

Record a sanitized repository fingerprint, Git HEAD, tracks, evidence sources,
gates, retries, grey zones, output paths, `resume_from`, and `updated_at`. When
Git HEAD or the fingerprint changes, mark affected evidence stale and rerun only
impacted tracks. Never resume blindly.

## HTML delivery

Use the installed `html-docs-standard` package, local assets, Mermaid default
theme, and its verifier for every HTML file. Markdown remains the reviewable
source.
