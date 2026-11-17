# Public collection transport contract

Status: internal transport and a separate policy-aware collector are implemented.
Start/resume support explicit public authorization. Campaigns persist discovery
queues and support separately submitted global portfolio reviews. The default is offline.
Do not call this primitive directly as a substitute for the complete crawler.

## Authorization and destination checks

The host supplies exact HTTP/HTTPS `allowedOrigins`, including scheme and any
nondefault port. There are no wildcard hosts, suffix matches, inferred subdomains
or private-address exceptions. URL credentials, backslashes, controls, whitespace,
non-HTTP schemes and trailing-dot host aliases are rejected. WHATWG normalization
precedes literal-IP checks, so alternate numeric loopback spellings do not bypass
validation. Fragments are removed; query strings remain content-sensitive.

Every hop independently resolves all DNS answers. Any disallowed answer rejects
the entire destination. The selected validated address is supplied through Node's
request lookup callback; the HTTP Host and HTTPS identity remain the URL hostname.
There is no second resolver selection after authorization. Requests use a fresh
agent, fixed anonymous headers, explicit TLS certificate validation and no cookie
jar or authorization headers. Server cookies are not returned in the retained
headers or forwarded to the next hop. Trusted runtime adapters are test seams,
not JSON-configurable permissions or a private-network bypass for customers.

The address classifier is deliberately conservative: it rejects IPv4 special-use
blocks and multicast/reserved ranges. IPv6 is restricted to ordinary global unicast
2000::/3, excluding special-use subranges, documentation and transition mechanisms.
It blocks some globally reachable special-purpose addresses too. This is a public
web collection policy, not a general routability oracle. Unknown future allocations
may need a reviewed policy update; the code never downloads an allowlist at runtime.

The reviewed references are the [IANA IPv4 special-purpose registry](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml)
and [IANA IPv6 special-purpose registry](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml),
checked 2026-11-16. Their latest-update fields were 2025-10-09. Numeric assignments
inform the original implementation; registry routability flags are not treated as
permission to fetch a destination.

## Transport boundaries

Default transport deadline is 20 seconds across DNS, redirects and body reception;
default maximum body size is 10 MiB per final response and maximum redirect count
is five. Limits must be explicit bounded integers if overridden. Headers are
bounded by Node's 32 KiB parser limit. Redirect bodies are discarded without
buffering. Redirects are followed only after full origin/DNS authorization again.
The transport retains HTTP status, selected nonsensitive headers, bounded raw body
bytes, final URL and prior hop URL/status records. It does not infer indexability.

The request asks for identity content encoding. It returns raw bytes if the server
nevertheless sends compressed data; safe bounded decoding and character conversion
are implemented by the collector. A DNS timeout stops awaiting resolution
but does not cancel an operating-system resolver operation; no HTTP request is
started from its late result. Abort, body-limit and total-timeout paths destroy the
request/response streams. No proxy environment is intentionally configured; the
fresh agent avoids reuse of a globally configured agent. The process and host
network configuration remain trusted runtime dependencies.

The implementation follows the inherited request options documented in
[Node.js 22 HTTPS](https://nodejs.org/download/release/latest-v22.x/docs/api/https.html)
and its [HTTP request options](https://nodejs.org/download/release/latest-v22.x/docs/api/http.html#httprequesturl-options-callback).
No TLS identity override or disabled certificate verification is accepted from a
page or audit configuration. Target HTML, redirects and response bytes are data;
none are evaluated as code or instructions.

## Evidence and remaining work

Deterministic tests cover special address families, alternate numeric loopback,
exact origins, mixed DNS answers, pinned lookup, redirects, anonymous headers,
body bounds and DNS/request deadlines. A single live smoke request to
https://example.com/ returned HTTP 200 with 577 bytes on 2026-11-16. That demonstrates
native transport operation in the current environment, not exhaustive network
security, robots compliance, crawling completeness or live customer-site behavior.

The public collector integrates robots policy, per-host scheduling, backoff/retry
limits, bounded decoding, content-type handling and artifact provenance. Start/resume
persist collection outcomes; campaigns retain partition and discovery queues.
Use the integrated workflow rather than calling transport directly. Local fixtures
must use test-owned adapters; never add a customer-controlled flag that disables
address validation. These implementation boundaries do not establish independent
native-host acceptance or full inventory completeness.

The [robots and scheduling contract](robots-and-scheduling.md) records the
integrated primitives and their limits. [Discovery](discovery.md) and
[campaigns](campaigns.md) describe persisted inventory and global review.

The [public collector contract](public-collector.md) describes the integrated
policy, retry, decoding and evidence layer above this transport.

Policy and queue hooks are trusted collector adapters. Their waits observe the
request AbortSignal. Expired queued operations check cancellation before opening
a connection, and active requests/responses are destroyed. Hook implementations
must cooperate to release their own resources; cancellation cannot preempt
synchronous JavaScript or stop the OS DNS resolver itself.
