# Local Workspace and Resume Contract

## Output layout

Write Product and Technical Markdown and HTML under `docs/onboarding/`. Write
state, evidence, per-run summaries, and the local brand profile under
`.onboarding/`.

```text
.onboarding/
├── brand/
│   ├── DESIGN.md
│   └── extraction-state.yaml
├── state.yaml
├── evidence.yaml
└── runs/

docs/onboarding/
├── assets/
│   ├── docs-theme.css
│   ├── docs-brand.css
│   └── docs-theme.js
└── generated pages
```

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

Run the installed HTML standard's brand preflight before creating HTML. A valid
`.onboarding/brand/DESIGN.md` is reused with no questions and no network. A
missing or invalid profile requires only Brand name and Brand website; static
extraction, optional read-only browser evidence, or the accessible fallback is
then saved atomically.

Generate `docs/onboarding/assets/docs-brand.css` from the valid profile. Load it
after `docs-theme.css`, use the branded Mermaid base theme, and verify the brand
profile before verifying every HTML file. Markdown remains the reviewable
source.
