# Product model

## Two skill types

**Upstream Skill** is a curated public dependency. Its record in
[`catalog.yaml`](../catalog.yaml) includes topic tags, canonical Git URL,
immutable commit, skill path, content digest, license file, attribution, and
local change description. The commit is the source snapshot. A scheduled check
stages remote HEAD and compares the skill folder's content digest with the pin.
It reports a candidate only when the skill content changes; it never changes
the pin or a shipped release.

**Solution Skill** is the product customers install. Its manifest in
[`solutions/`](../solutions/codebase-onboarding.yaml) states the outcome,
entrypoint, supported hosts, ordered components, quality gates, semantic
version, and expected component digests. A version is a fixed dependency set,
not a pointer to the latest public source. Each release embeds the component
folders, provenance lock, product license, and required upstream notices.

Catalog `profiles` are discovery and experimentation recipes. A profile is not
a released Solution Skill merely because it lists several skills.

## Release lifecycle

1. **Curate:** inspect a public repository, license, exact commit, skill path,
   scripts, references, and local modification history. Record a digest.
2. **Review updates:** run `check-upstreams`; inspect each candidate diff and
   rerun license and skill validation. Change a pin only after review.
3. **Version a solution:** update the solution manifest's component hashes and
   semantic version. A changed component cannot rebuild an old version under
   the same manifest.
4. **Build:** create a self-contained directory and `.tgz` archive. Verify all
   skills and notices and record both archive and release-directory SHA-256.
5. **Install:** transfer the CLI and solution archives through the chosen
   customer channel. The installer checks a separately supplied release digest,
   refuses collisions, and records the installed version.
6. **Upgrade:** accept only a higher solution version with the same target set
   and unchanged installed components. Stage the new release and restore the
   prior files if installation fails.

V1's first Solution Skill was `codebase-onboarding@1.0.0`; the current manifest
is `codebase-onboarding@1.0.1`. The public Hallmark
component is pinned to commit `13ac0ec7e148655948100b6396439e481361d690`.
The bundled `html-slides` rewrite has a reviewed current upstream reference,
but its original derivation commit was not recorded. The presentation profile
is therefore outside the V1 Solution Skill release set.

## Technical and business boundary

The engine produces installable, content-checked artifacts for Codex and Claude
Code. A separately trusted delivery of the expected digest is needed to detect
malicious replacement of an archive and its internal manifest. The business
workflow determines who can receive the artifacts, the distribution channel,
pricing, customer terms, and support promises. This repository's MIT license
does not itself implement customer access control.
