# Historical regression fixtures

`run.json` is the unchanged offline-012 checkpoint, version 0.1.0. Its source
path and SHA-256 are in `baseline.json`. It tests checkpoint compatibility only.

`release-0.2.0.tgz` is the immutable, owner-released solution archive from
`content-search-audit-v0.2.0`, retained as a regression oracle. SHA-256:
`313a36b5de511c5658067e432c1c8e87e8231ec82b7dc15e9e78875dc18a116d`.
It includes its original license notices. Do not regenerate or replace it.

`content-audit-release-baseline.test.ts` verifies the archive hash, extracted
release digest and component lock before executing its helper. It compares all
run/report artifacts from a synthetic readable-plus-unsupported input against the
current legacy helper. Only run-directory paths, generated UUIDs and capture/report
timestamps (including Markdown escaping) are normalized. This is a bounded
compatibility regression, not proof of every old input or enterprise capability.
