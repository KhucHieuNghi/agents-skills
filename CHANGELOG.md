# Changelog

All notable changes are documented here.

## 1.0.0 - 2026-10-17

- Limit installation, project detection, packaged manifests, and active guides
  to Codex and Claude Code.
- Remove the Eve installation adapter and reject other target IDs before
  staging or installing skills.
- Define pinned Upstream Skills and versioned Solution Skills in the catalog.
- Release `codebase-onboarding@1.0.0` with Hallmark provenance, licenses,
  a component lock, and content digests.
- Add content-aware upstream update checks and a weekly CI signal.
- Add self-contained release build, archive packaging, verified project
  installation, bundled CLI runtime dependencies, and guarded upgrades for
  Codex and Claude Code.
- Document the cross-machine release workflow and technical limits.

## 0.1.0 - 2026-07-20

- Added a generic CLI for cataloging, staging, validating, and applying
  externally hosted private Agent Skills.
- Added support for OpenCode, Codex, Claude Code, and Eve targets.
- Added validation, source redaction, target conflict handling, and synthetic
  test fixtures.
