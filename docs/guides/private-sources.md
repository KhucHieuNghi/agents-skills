# Public Sources

## Source forms

The default catalog is `./catalog.yaml` at the repository root. It may point
to a local directory in this repository or to a public canonical Git URL. Use
`agent-skills catalog --source <path-or-git-url>` to inspect a source before
adding it to the public catalog.

Use [skills.sh](https://skills.sh/) to discover candidate packages, then record
the package's canonical Git URL in the catalog. The CLI stages and validates
that URL; it does not install from a skills.sh search result.

## Cache behavior

Git-backed sources are staged below the current user's cache directory, outside
this repository. A source cache is local state and must not be committed or
shared as a public artifact.

## URL safety

Catalog sources must be public URLs without credentials. The CLI still redacts
credential-like URL segments from surfaced errors; do not place tokens in
configuration files, examples, or issue text.

## Local paths

Local paths are read directly. Validate the source before applying it so the
canonical package shape and metadata are checked without executing package
content.
