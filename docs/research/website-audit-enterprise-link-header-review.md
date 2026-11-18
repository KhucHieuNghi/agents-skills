# Technical SEO HTTP Link parser review

Status: development foundation under [Task 2a](../plans/website-audit-enterprise-technical-seo.md). Native browser acquisition and enterprise report integration remain open.

## Implemented

The original canonical-specific parser handles multiple supplied fields, quoted strings/escapes, comma-containing targets, relative references, case-insensitive registered relation names and multiple relations. It preserves distinct canonical targets for the evaluator. Malformed fields and unsupported constructs produce sanitized pending reasons; no fetch occurs. Bounds: 100 fields, 64 KiB combined field bytes, 100 link values and 8,192 characters per target.

Empty input is a complete empty projection only if the caller obtained the complete response header set. This parser cannot authenticate acquisition or supply HTTP status semantics. It does not prove target accessibility or search-engine behavior.

## Review and corrections

Tests first failed on the absent module; 32 initial cases then passed. Independent AI review ran those tests and identified two P2 findings:

1. Illegal colons in the first relative path segment were being repaired by WHATWG URL resolution. Explicit URI-reference validation now rejects them; an explicitly relative `./1:abc` remains valid.
2. Malformed extension relation URIs could be accepted alongside canonical. The initial profile now explicitly excludes all extension relation URI lists as unsupported, preserving an incomplete result rather than claiming general Link parsing support. Supporting those lists requires a future separately verified grammar; this reduces coverage for unusual headers, not the scope of the overall enterprise goal.

The six direct finding/policy regression cases failed before the fixes and passed afterward. A separate root-found multiple-space relation-list issue was reproduced red-to-green. Valid independent fields survive another malformed field. Tests also exercise bounded inputs, privacy, context-changing parameters, malformed quoted strings and credential-bearing targets. A native loopback HTTP response test checks the combined representation of repeated Link fields; it is not a production browser trial.

These fixes were verified by the implementer after independent review; a second independent acceptance pass is not claimed. Existing skill package and archives are unchanged.

## Source basis

[RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html) informs field syntax, relative-reference context and relation handling. [RFC 3986 section 4.2](https://www.rfc-editor.org/rfc/rfc3986.html#section-4.2) informs relative-path validation. No implementation code was copied from either specification. Conservative unknown behavior for unsupported constructs is the product's documented policy.

Final verification: 41 parser tests pass, including native loopback HTTP transport. Full single-worker suite: 97 files / 977 tests pass (89.42 seconds). Format, lint, typecheck, build and staged diff checks pass. Native browser extraction and commercial release gates remain open.
