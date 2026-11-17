# Supplied server-log evidence

Use `node scripts/audit.mjs import-server-logs EXPORT.json` for a normalized,
redacted JSONL request export. No SSH, log agent, shell parser, network access or
bot verification runs. This is a format-neutral input contract: Apache, nginx,
CDN and application logs require an explicitly reviewed normalization step.
It does not guess fields from arbitrary access-log text.

## Envelope

Provide sourceId, locator, timezone-bearing capturedAt, synthetic (boolean),
sourceText (exact normalized JSONL), sourceHash (SHA-256 of UTF-8 sourceText), plus:

```json
{
  "scope": {
    "from": "2026-11-16T00:00:00Z",
    "to": "2026-11-16T01:00:00Z",
    "system": "declared edge or origin instance",
    "filters": "explicit filters, sampling and rotation boundaries",
    "exportComplete": false
  },
  "normalization": {
    "method": "reviewed mapping from named log format",
    "reviewer": "responsible reviewer",
    "redaction": "describe removed credentials, cookies, IPs and identifiers",
    "limitations": ["State normalization losses and missing log sources"]
  }
}
```

Scope endpoints are inclusive and timezone-bearing. Each nonblank line must contain
one object with timestamp, method, absolute HTTP(S) url, status (100–599 or null),
and userAgent (string or null). Optional fields are requestId, bytesSent and
durationMs. Byte count is an integer; duration is nonnegative milliseconds.
Null means unavailable. URLs preserve meaningful queries but cannot include
credentials or fragments. No URL is fetched or added to authorized scope.

Other fields are rejected as unresolved normalization work, including raw headers,
IP addresses and arbitrary log extensions. This field allowlist is not automatic
secret detection: review query strings, user agents, request IDs and all supplied
text for sensitive data before import/sharing. The declared redaction is an
attribution, not a verification that all secrets were removed.

Input is bounded to 16 MiB and 100000 request lines (one final newline allowed).
Malformed JSON, fields, out-of-scope timestamps, duplicate IDs and invalid numeric
values create line-numbered pending entries with hashes. They are not silently
skipped or counted as HTTP errors. Invalid envelope/hash fails the whole import.
Without request IDs, identical lines remain separate observations; reconcile log
rotation/overlap at the source. Repeated IDs leave later lines unresolved rather
than automatically choosing a conflicting record.

## Interpretation and report attachment

Counts represent accepted request lines, grouped by exact method/URL/status. They
are not users, sessions, unique visits or complete crawl counts. A missing status
stays unknown. `suppliedExportParsed` describes only the declared export and its
row errors; `populationComplete` stays false. Empty logs prove no broader absence.

User-Agent remains an unverified claim. The
[official Google request-verification guidance](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests)
requires additional checks, such as matching published IP ranges or verifying
reverse and forward DNS. This importer performs neither. Even an independently
verified crawler request would not by itself prove indexing, rendering, AI citation
or answer accuracy. Guidance reviewed 2026-11-16.

Add `serverLogExports: [EXPORT, ...]` to report options. Both renderers recompute
receipts and persist supplied normalized text plus results in
`server-log-evidence.json`. Campaign manifests hash the file. Reports display
scope, normalization/redaction, accepted/rejected/unknown counts, pending rows,
synthetic labels and evidence links. These observations do not change audit
coverage or automatically resolve semantic checks. Keep original source logs under
their existing access controls; only the approved normalized export is attached.

Each provider allows up to 20 exports. The combined serialized Search Console,
GA4, Bing and log exports must fit 32 MiB. IDs must be unique within the log source
family. Existing-report no-overwrite rules still apply; use a new campaign report
edition to attach fresh evidence.
