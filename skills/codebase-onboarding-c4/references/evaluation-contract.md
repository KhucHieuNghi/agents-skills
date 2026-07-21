# Evaluation Contract

## Evaluation layers

1. Package contract validates package shape, reference links, assets, scripts,
   and public boundaries.
2. Behavior scenarios pressure-test routing, access gates, evidence handling,
   quality gates, and fallback against synthetic repositories.
3. Artifact contract validates Markdown headings, Mermaid relationships, HTML,
   YAML state, local ignore behavior, and cross-document Journey IDs.
4. Human acceptance checks that a new engineer can explain the primary journey,
   identify system boundaries and dependencies, locate an entrypoint, and
   continue run, test, debug, or investigation work.

## Behavior rubric

For every scenario record pass or fail for Product Journey completeness,
C1/C2/selective C3 coverage, journey-to-C4 traceability, evidence correctness,
routing, access approval, root-only writes, invented facts, and public-boundary
safety. Record the supporting output location and one concise reason.

Do not compare exact prose snapshots. Evaluate required structure, supported
facts, relationships, and prohibited behavior.

## Release classification

Keep topology quality `quality-unverified` until all required scenarios pass,
inline fallback meets the same output contract, no security or public-boundary
violation remains, and one real-project forward test passes without committing
private project data. Only then report topology behavior as `verified`.

## Private forward-test boundary

Store forward-test output only in the approved target project's ignored local
workspace. Commit no target name, path, source, prompt, generated artifact,
credential, connector output, or evidence to this public package.
