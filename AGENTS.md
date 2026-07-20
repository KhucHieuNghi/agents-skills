# Contributor Guidance

## Canonical package contract

A skill is a directory named with a lowercase hyphenated identifier. It must
contain `SKILL.md` with YAML frontmatter that supplies matching `name` and
non-empty `description` fields. Optional `references/`, `scripts/`, and
`assets/` directories are package content, not validation-time executables.

## Public repository boundary

Keep this repository generic. Do not commit private source locations,
credentials, proprietary prompts, real skill content, customer data, or local
cache state. Use synthetic fixtures and placeholder paths in tests and docs.

## Development checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

Run `npm run build` when changing CLI entrypoints. The documentation contract
test scans tracked public text and web assets for prohibited source markers and
obsolete runtime claims.

## Documentation package

`skills/html-docs-standard/` is a portable generic package for HTML
documentation. Its template and assets must remain light-only, responsive, and
free of real organization or project details.
