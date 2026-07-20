# Private Sources

## Source forms

Provide a local directory or a Git URL at runtime. Use placeholders in shared
documentation, for example `/path/to/private-skills` or
`https://example.invalid/private-skills.git`.

## Cache behavior

Git-backed sources are staged below the current user's cache directory, outside
this repository. A source cache is local state and must not be committed or
shared as a public artifact.

## Credential safety

Use your normal local credential mechanism for private access. The CLI redacts
credential-like URL segments from surfaced errors. Do not place tokens in
configuration files, examples, or issue text.

## Local paths

Local paths are read directly. Validate the source before applying it so the
canonical package shape and metadata are checked without executing package
content.
