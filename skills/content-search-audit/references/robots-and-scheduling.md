# Robots decisions and collection scheduling

Status: parser, access decision helper and scheduler are integrated by the
[public collector](public-collector.md), used by explicitly authorized public
start/resume runs. These primitives themselves do not persist data.

## Robots interpretation

The original parser is informed by [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html),
reviewed 2026-11-16. It selects case-insensitive product-token groups, combines
matching groups, uses wildcard groups only as fallback, matches case-sensitive
paths including queries, supports wildcard/end markers and prefers allow on equal
specificity. It normalizes UTF-8 and unreserved percent escapes while retaining
encoded path separators. The robots resource itself is implicitly accessible.
Sitemap declarations are discovered data, not authorization to visit their hosts.
Unknown directives do not terminate groups. Rules before a group are ignored.

The audit policy is intentionally conservative beyond the protocol's permissive
options. Auth failures, throttling, transport failures, server errors, unresolved
redirects and partial responses block collection pending retry/review. Only 404
and 410 are treated as explicitly absent policy; 200 and 204 are parsed. Malformed
applicable rules block collection while retaining diagnostics and valid rules.
Malformed rules in another correctly identified group do not block our agent.

Implementation boundaries specific to this candidate:

- Input is already-decoded text. The collector must separately verify encoding,
  content type, compression and HTTP provenance. HTML-looking bodies and NUL bytes
  are rejected here, but text parsing alone cannot authenticate server responses.
- Maximum input is 512,000 UTF-8 bytes. Over-limit policy is rejected as a whole,
  not truncated into a potentially permissive fragment.
- Matching uses a bounded iterative wildcard algorithm. Paths longer than 16,384
  normalized characters or a million matcher steps become blocked with a reason.
  Specificity counts normalized literal octets, excluding wildcard/end operators.
  Broader interoperability fixtures are still required before release.
- Invalid escape syntax or malformed policy stays blocked for review. Do not
  remove a denial or loosen the parser merely to improve the coverage percentage.
- Crawl-delay is an optional extension. For applicable groups, the largest valid
  nonnegative delay is exposed to the scheduler. It is not treated as a ranking
  rule or an AI visibility factor. Unsupported delay values must leave collection
  pending; never clamp a requested delay downward.

## Scheduler contract

One scheduler instance must be shared across all network work in a collection run,
including robots requests, redirects and retries. Schedule an entire HTTP hop
through body completion, not only socket creation, so concurrency means active
requests. Separate HTTP/HTTPS origins on one hostname share the same queue.
Other hosts can progress independently.

Defaults and ceilings are two active requests per hostname and at least 1,000 ms
between request starts. Configuration can reduce concurrency or increase spacing;
it cannot exceed those ceilings. Crawl delay only increases spacing, measured from
the prior start. A delay beyond one day is rejected for explicit follow-up. Failed
operations release their slot and preserve subsequent queued work. snapshot()
reports active/pending counts for collection progress; it is not durable recovery
state and does not by itself prove discovery completeness.

Tests use controlled time to verify start spacing, shared-host behavior, independent
hosts, concurrency, failure recovery and increased crawl delays. The public collector
integrates cancellation, run-local cache expiry and retries. Start/resume retain
deferred collection work; campaigns persist discovery queues and bounded partitions.
The scheduler's in-memory queue is not itself a durable checkpoint.
No process can be called a compliant crawler merely because these
isolated helpers pass their tests.
