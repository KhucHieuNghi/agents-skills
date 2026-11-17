# Public collector integration

Status: createPublicCollector integrates network authorization, robots, scheduling,
retries, bounded decoding and artifact construction. It is integrated into
start/resume with explicit network authorization, checkpointing and reports.
Campaign discovery and cross-part semantic review use separate persisted stages;
see [discovery](discovery.md) and [campaigns](campaigns.md). Collection does not
perform those judgments automatically. The customer still invokes one skill.

## Per-run and per-item behavior

Create one collector for an audit run with explicit allowedOrigins. Reuse it for
all items so robots cache, host queues and cooldowns are shared. Every page hop,
including redirect destinations, checks that origin's robots decision before the
page request. Robots fetches use the same network authorization and scheduler;
robots redirects do not recursively request another robots policy. A fetched
robots policy applies to its original origin. A disallowed cross-origin redirect
stops before fetching the destination page.

The cache ceiling is 24 hours for successful or explicitly absent policy. Shorter
max-age and no-cache/no-store are honored. Failures are cached for one minute to
avoid repeated immediate probes. This is run-local memory, not a durable cache.
Crawl-delay raises the shared host interval; delays above ten seconds defer the
item for scheduled follow-up rather than starting a long in-process wait. Product token is NKSkillsContentAudit,
matching the anonymous HTTP identification string.

HTTP 429 and selected transient 5xx responses permit up to two retries. Connection
reset, transient resolver errors and timeouts use the same attempt cap. Backoff
starts at one second and doubles. Valid Retry-After seconds/dates can increase the
wait; waits beyond ten seconds return a deferred/blocked outcome for subsequent
work rather than retrying earlier than requested. Host cooldown is shared. Every
attempt retains status or error, timestamp and available redirect/retry metadata.
Auth barriers, exhausted retries and unavailable content remain explicit outcomes.

## Bytes, text and evidence

Network body and decoded body are separately bounded at 10 MiB or a smaller
configured limit. Identity, gzip, deflate and Brotli content encodings are handled;
stacked/unknown encodings are unsupported. Decompression uses bounded Node
[maxOutputLength](https://nodejs.org/download/release/latest-v22.x/docs/api/zlib.html#class-options).
A decode error or oversized expansion cannot produce a collected result.

Supported text media are HTML, XHTML, plain text, Markdown and XML. Explicit
non-UTF-8 character sets, invalid UTF-8, NUL bytes and inconsistent ASCII declarations
remain unsupported. BOM and newlines are preserved. PDF, audio, video, images and
rendered DOM still require separate extraction/render adapters; HTML scripts and
page instructions are inert source text, never executed by this collector.

An item returns status, reason where relevant, evidence records and an artifact
map. Collected items additionally return content/type. Evidence includes:

- crawler-policy: captured robots response, decoded policy, wire representation,
  selected decision, capture timestamp and limitations;
- http-body-encoded: exact received body in base64 with its transport encoding;
- http-response: status, retained headers, final URL, redirects and attempt history,
  linked to the body and robots decisions;
- content: decoded source text linked to HTTP and wire evidence;
- collection-error when attempt metadata exists after a transport/policy failure.

Artifacts are UTF-8 strings with exact SHA-256, unique IDs, relative paths and
source-evidence lineage. Cookie/auth request state is never used; response cookies
are excluded. Public bodies and URL queries may still contain sensitive information;
review authorized evidence before sharing. This is not an automatic PII scrubber.
Robots failure evidence remains attached even when no page body is collected.

## Verification and unfinished boundaries

Fixtures cover redirects into disallowed paths, robots barriers/expiry/no-cache,
compressed expansion limits, unsupported media/encoding, retry/defer behavior,
transient connections, BOM/inert content and persisted large-artifact validation.
A live anonymous example.com collection produced HTTP/content/robots/wire evidence
and 577 bytes of HTML on 2026-11-16. It does not establish behavior of another site.

The loader permits 16 MiB per artifact so a 10 MiB body can be stored as base64;
a 17 MiB artifact test still fails the bound. Manifest and total-load ceilings
remain 64/128 MiB. [Campaigns](campaigns.md) handle storage partitioning and unique-item aggregation;
never silently truncate an inventory to fit those limits. Collection alone does
not resolve semantic checks, establish index status or measure AI visibility.
The CLI persists outcomes, supported deterministic findings and retry/storage
queues. Campaign discovery and global portfolio review are implemented workflows;
their presence does not establish complete inventory or semantic acceptance.
Independent host evaluation remains a separate release gate.

`collectionTimeoutMs` bounds asynchronous waits for one collection (integer
1–120000 ms, defaulting to the transport timeout). It spans robots, DNS, queue,
retry/backoff and decoding waits. `collect(item, {signal})` also accepts parent
cancellation. Expiration retains an unresolved collection outcome; it never proves
absence of content. Cancelled robots fetches expire their cache entry so a later
collection can retry. Other callers sharing that pending robots fetch may also
fail and need retry.

Cancellation removes queued jobs and destroys active HTTP requests/responses.
Late DNS or trusted-hook results cannot start a connection. Native DNS or decoding
work may finish in the background; synchronous JavaScript cannot be preempted.
This is cooperative cancellation, not a hard real-time or whole-campaign deadline.
