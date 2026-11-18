# Technical SEO development foundation

Implements [the technical SEO plan](../../docs/plans/website-audit-enterprise-technical-seo.md). This directory is not yet bundled in a released skill. Existing candidate archives and upstream pins remain unchanged.

`evaluateCanonicalCapture(context, source)` consumes one hash-bound, explicitly supplied canonical projection. It performs no IO, network access, HTML parsing or browser execution. Targets must already be absolute URLs resolved by the producer from source-head, rendered-head and final response Link declarations. A source hash authenticates neither the producer nor correspondence to native page bytes.

The three checks concern target format, observed declaration consistency and explicit owner intent. Pass requires complete coverage of all three layers. Missing declarations alone are unknown rather than a website defect; a single fresh observed conflict can fail the bounded consistency check even if another layer is incomplete. Canonical target fragments remain failures rather than being silently stripped. URLs preserve path case, query order and trailing slash; cross-domain targets can be legitimate when explicitly intended.

Context includes exact customer/entity/environment/targetUrl/profileId/stateId, assessmentAt, maxAgeSeconds and nullable expectedCanonical. Artifact version 1 has matching scope, capturedAt and layers `{sourceHead, renderedHead, httpLink}` each containing `{complete, targets}`. Complete means the supplied producer claims full extraction for that layer; the evaluator cannot authenticate this claim. Source envelope is `{sourceId, artifactText, artifactHash}` with SHA-256 over exact UTF-8 bytes. Exclusive expiry prevents old captures from passing a new assessment. There is no cross-capture aggregation or site-wide conclusion.

Run `npx vitest run tests/content-audit-canonical.test.ts --maxWorkers=1`. Native acquisition, raw-vs-rendered provenance, redirects, robots/noindex, hreflang, structured data, crawl coverage, URL Inspection contrast, immutable enterprise report integration and installed release verification remain in the plan. Do not advertise the foundation as a completed technical SEO module.

## HTTP Link projection

`parseCanonicalLinkHeaders(values, responseUrl)` parses a bounded complete set of supplied Link field values into targets and sanitized pending reasons. It uses the response URL for relative references, preserves fragments for the downstream format check and performs no network calls. Empty values alone do not prove that headers were actually collected.

The initial canonical-specific profile supports registered relation names, multiple relations, ordinary quoted title parameters and multiple fields. Anchor/context overrides, extension relation URIs, additional canonical attributes and duplicate parameters remain incomplete and excluded; valid independent fields remain visible. Malformed syntax does not become a complete clean projection. A general-purpose RFC Link parser is not claimed. The remaining native browser collector must bind this projection to actual response bytes and status.
