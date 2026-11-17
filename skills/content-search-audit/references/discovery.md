# Supplied-source inventory discovery

The `discover CONFIG.json` helper unifies supplied snapshots without network access.
It returns inputs, normalized inventory, source metadata/hashes, pendingQueue and
inventoryComplete as JSON. This is source ingestion, not an automatic site crawl.
Use the same single skill invocation; customers do not invoke upstream skills.

## Input contract

The config requires expectedSourceIds (unique source identifiers), scopeComplete
(boolean), sources, and optional trackingParameters. Every source has a unique id
listed in expectedSourceIds, kind, locator, collectedAt and complete (boolean).
Missing expected sources become explicit queue entries. `complete: false` means
pagination, export filtering or some other source work remains.

Supported kinds:

- html-links: content contains a captured HTML source document and locator is its
  absolute HTTP(S) document URL. Its document and extracted links enter the union;
  extraction ambiguities and unreviewed rendering surfaces remain queued. See the
  source-link contract below.

- sitemap-xml: content contains a supplied UTF-8 XML snapshot, using the sitemap
  protocol namespace. urlset supplies page locations; sitemapindex supplies child
  sitemap locations. Child snapshots must be separately supplied with matching
  locators. Missing/failed children and cyclic index graphs remain queued.
- url-list: content contains one absolute HTTP(S) URL per nonempty line. Useful for
  supplied analytics landing-page exports and plain-text sitemap lists. It does not
  interpret analytics measures or fetch these URLs.
- records: records contains URI or absolute-path objects with optional locale,
  type and canonical. Map supplied CMS/repository/document exports to these fields.
  Their source membership comes from the source id, not untrusted row labels.

Example:

```json
{
  "expectedSourceIds": ["cms", "analytics"],
  "scopeComplete": true,
  "trackingParameters": ["utm_source"],
  "sources": [
    {
      "id": "cms",
      "kind": "records",
      "locator": "provided:cms-export",
      "collectedAt": "2026-11-16T00:00:00Z",
      "complete": true,
      "records": [{ "uri": "https://example.com/help", "locale": "en" }]
    },
    {
      "id": "analytics",
      "kind": "url-list",
      "locator": "provided:landing-pages",
      "collectedAt": "2026-11-16T00:00:00Z",
      "complete": false,
      "content": "https://example.com/help?utm_source=email\n"
    }
  ]
}
```

This example remains incomplete because analytics is explicitly partial. The URL
identity merges after removing only the declared tracking parameter; both source
memberships and original aliases remain. Canonical relationships never discard a
locale, version or audience variant.

## Evidence and completion

Each source keeps a SHA-256 of its supplied content (or JSON serialization of records),
locator/date, accepted/rejected row counts, status and child sitemap list. Invalid
rows remain counted and queued with their source row number; a malformed sitemap is
rejected as a whole. Raw snapshots must accompany the receipt for independent replay;
hashes do not authenticate a CMS, analytics provider or remote response.

inventoryComplete requires a nonempty inventory, nonempty expected source set,
scopeComplete=true, all sources declared complete, and no pending queue. These are
coverage assertions relative to the declared scope, not proof that every page on a
website has been found. Analytics landing pages alone cannot establish exhaustiveness.
The host must assess the expected source set, filters and export pagination.

## Persisting discovery in a campaign

Set campaign config.discovery to the original discovery request (including supplied
snapshots), inputs to the returned inputs, and inventoryComplete to the returned
value. Authorize localRoots/network.allowedOrigins separately. Use campaign, not
standalone start/resume: standalone runs reject discovery instead of dropping its
queue. The collection trackingParameters policy must match discovery's explicit
policy; discovery inherits it when omitted.

The campaign recomputes discovery before writing. Its normalized input union must
match exactly, including source memberships and aliases. An incomplete result cannot
be overridden with inventoryComplete=true. Config retains the source snapshots;
campaign.json retains their hashed receipt, source summaries and typed discovery
queues. Validation recomputes that receipt, rejecting missing or altered queues.

Discovery is stored once at campaign scope, not copied into every partition config.
Aggregate coverage includes its queues once, alongside collection failures and pending
items. The report displays discovery kind and source ID. Snapshot continuation and
immutable part-review revisions preserve the original receipt and unresolved scope.
A new source export or resolved pagination requires a new campaign config/discovery
request; it never retroactively marks the historical campaign complete.

This closes durable ingestion for supplied source snapshots. Bounded static-link crawling and repository enumeration are available through the
explicit adapters below. Connector pagination remains separate work. Scope
completeness is still the publisher/host's justified assertion about the expected
source set, not a proof inferred from a successful parser.

## Parser scope and limits

Based on the [Sitemaps protocol](https://www.sitemaps.org/protocol.html), reviewed
2026-11-16. The parser extracts direct protocol loc children of url/sitemap entries,
including namespace prefixes and XML entity decoding. Extension loc fields (for
example image locations) do not become page URLs. CDATA is read as inert text.
DTD/external entities, other processing instructions, malformed nesting, duplicate
loc fields, missing namespaces and credential-bearing/non-HTTP locations are rejected.
No external resource is resolved by parsing.

This is a bounded location extractor, not an XML/schema conformance validator or a
rendering engine. Optional sitemap metadata and extension semantics are not assessed.
Each source is limited to 10 MiB, the input bundle to 32 MiB, XML depth to 64 and
sitemap locations to 50,000. The 10 MiB operational limit is intentionally below the
protocol's 50 MiB uncompressed limit; exceeding it remains a visible failure, not
silent sampling. Larger sources need partitioned exports or a reviewed adapter.

A discovered external/private URL does not become authorized for collection.
Network allowlists, DNS/public-address checks and robots policy remain separate.
No sitemap priority or lastmod value is treated as ranking evidence or factual freshness.

## Repository enumeration adapter

`discover-repository CONFIG.json` returns one records source that can be placed
unchanged in discovery.sources. It enumerates directory entries without reading file
contents, running Git/hooks/scripts, consulting .gitignore, or using the network.
The config explicitly names sourceId, absolute roots, extensions and
excludeDirectoryNames; no implicit directory or file-type exclusions are applied.

```json
{
  "sourceId": "repository-content",
  "roots": ["/absolute/project/content", "/absolute/project/docs"],
  "extensions": [".md", ".mdx", ".html", ".txt", ".pdf"],
  "excludeDirectoryNames": [".git", "node_modules"],
  "maxEntries": 100000,
  "maxDepth": 64,
  "maxRecordsBytes": 8388608
}
```

Extension matching is case-insensitive. `*` explicitly includes every regular file;
an empty extension string includes extensionless files. The caller must choose the
content scope; no extension list proves full site coverage. Unsupported extraction
formats are preserved as paths for later collection, not labeled audited. File bytes
are not hashed at enumeration; normal collection captures their content snapshots.

Duplicate and nested roots are reduced to unique outer roots; directory-name
exclusions apply while walking that resulting scope. Explicit exclusions and counts
by unselected extension are recorded in source scope metadata. To include a nested
root under an excluded directory, enumerate it as a separately identified source.

Root symlinks are rejected. Encountered symlinks are not followed and remain queued;
non-regular entries, read errors, detected directory changes and depth/entry/record
budgets also remain explicit. Real paths and directory metadata are checked, but the
contract requires stable trusted roots; this is not an atomic snapshot or protection
against a hostile process swapping ancestor directories concurrently.

The adapter returns complete=false whenever a queue remains. discover validates and
preserves supplied adapter queues and exclusions with an adapter-metadata hash, so a
source cannot declare complete=true while carrying pending work. Campaign receipts
retain those details. For any source adapter, pendingQueue entries require kind,
locator and reason; exclusions require locator and reason. These remain supplied
claims, not independently authenticated provider attestations.

Limits bound traversal entries (default 100,000, maximum 1,000,000), depth (default
64, maximum 128) and record bytes (default/maximum 8 MiB). They do not bound total
process heap or provide a strict wall-clock deadline. Oversized source metadata can
still exceed discovery's bundle limit and requires separately scoped exports.
Directory order is filesystem-dependent; partial results are not a representative
sample. Repeat enumeration with justified budgets or split roots into source exports;
there is no durable directory cursor resume. Only a fully enumerated declared scope
can produce a complete source, and overall discovery still needs the other expected
sources.

## Automatic public sitemap traversal

`discover-sitemaps CONFIG.json NEW_DIRECTORY` fetches declared seed sitemaps and
follows their sitemap-index locations with the existing public collector. It writes
raw artifacts and capture.json under numbered captures directories, checkpoints
frontier/capture metadata in discovery.json, and writes source.json at completion.
Use the returned records source unchanged in discovery.sources. Each page record
retains its sitemap URL, capture path and content snapshot hash as source provenance.
The records are discovery data, not completed page audits.

```json
{
  "sourceId": "public-sitemaps",
  "seeds": ["https://example.com/sitemap.xml"],
  "localRoots": [],
  "network": { "allowedOrigins": ["https://example.com"], "retries": 1 },
  "maxSitemaps": 100,
  "maxDepth": 16,
  "maxStoredBytes": 67108864,
  "maxInventoryBytes": 8388608
}
```

Seeds must belong to explicitly allowed origins before output/network work begins.
Child sitemaps outside the allowlist remain queued. Listed page URLs can be retained
as inventory even when external; they are not fetched by this adapter and never
expand collection permissions. Redirects still undergo the transport's per-hop
origin/DNS checks and destination robots checks. Requests share robots cache,
scheduling, retries and server cooldowns; no credentials or scripts are used.

Cycles are checked both along traversal paths and in the parsed index graph, including
cycles whose endpoints were separately seeded. XML failures, blocked/failed captures,
missing child access and budget exhaustion remain explicit source queues. Captured
failed responses remain available for inspection when they fit the storage budget.
A fetched result too large to persist is not claimed processed: current and remaining
sitemaps stay queued, and the discarded capture is explicitly identified by reason.

Limits: up to 1,000 captures (default 100), depth up to 64 (default 16), 10,000 scheduled
sitemap locations/seeds, capture-storage budget up to 128 MiB (default 64 MiB), and
page-record metadata up to 8 MiB. Underlying per-response and XML limits still apply.
Queue/scope metadata is additional to the page-record budget; if the resulting source
exceeds supplied-discovery limits, split the seed scope into separate sources. No
strict wall-clock or total process heap bound is claimed.

A terminal status complete-for-seeds means only that this declared sitemap graph had
no unresolved work. It does not establish full site coverage, link-graph coverage,
index status, freshness or semantic correctness. Page content is collected later by
the audit campaign. Other expected sources remain necessary where relevant.

Output is new-only and outside declared content roots/package. File SHA-256 and byte
lengths are listed in discovery.json, including source.json. These bind local files,
not remote authenticity. Preserve the directory with the source receipt for replay.
A collecting checkpoint is not a finished source, and a timed-out observer is not
proof the writer stopped. After confirming termination, use discovery-resume below to rebuild traversal
from registered snapshots in a new directory. Existing captures are never
overwritten or silently deleted.

## HTML source-link extraction

The html-links supplied-source adapter uses an original conservative inert extractor.
It follows the [HTML hyperlink definition](https://html.spec.whatwg.org/multipage/links.html#links-created-by-a-and-area-elements)
and [base URL semantics](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element)
for the supported source subset (reviewed 2026-11-16). It is not a full HTML5 DOM parser.
Only a/area href values become navigation candidates. The first base href determines
relative resolution; later bases do not override it. Query parameters are retained
until the separate explicit normalization policy runs. Fragment-only links resolve
to the same document identity; rel annotations remain metadata, not index evidence.

Comments, raw-text elements and inert templates do not contribute fake embedded
anchors. Script/iframe/template surfaces flag rendered inspection as outstanding;
noscript interpretation is explicitly unresolved. Forms, event handlers, hyperlink
ping, scripts, stylesheets and resource hints are never executed, submitted or fetched.
Non-HTTP links are counted separately and credential-bearing links remain unresolved.
Source metadata includes link offsets and rel tokens for later graph/evidence review.

The parser supports ordinary quoted/unquoted attributes, numeric character references
outside unsupported control mappings and the basic amp/lt/gt/quot/apos named entities.
Other entities, ambiguous attributes/base URLs, malformed markup, SVG/MathML navigation,
meta refresh and unclosed containers create pending work rather than guessed targets.
Limits are 10 MiB per source and 200,000 inspected markup tokens; this is not a
strict wall-clock guarantee. A rendered browser adapter is required for complex or
unsupported markup before claiming those links fully inspected.

A static-source result with no parser gaps still does not prove full website inventory.
The discovery source must describe the chosen document scope, and other expected
sources and live collection permissions remain separate. This adapter ingests supplied HTML captures. The discover-links command below adds
bounded public traversal using the same extractor.

## Bounded static-link crawler

`discover-links CONFIG.json NEW_DIRECTORY` traverses allowed source hyperlinks in
breadth-first order, using the same anonymous public collector and extractor above.
Its source.json is another records source for the durable discovery union.

```json
{
  "sourceId": "internal-links",
  "seeds": ["https://example.com/"],
  "localRoots": [],
  "network": { "allowedOrigins": ["https://example.com"], "retries": 1 },
  "maxPages": 100,
  "maxDepth": 8,
  "maxStoredBytes": 67108864,
  "maxGraphBytes": 8388608
}
```

Seeds must be explicitly allowed before output or requests. Page records include
seeds, discovered in-scope targets and redirect aliases. Source-link resolution uses
the final response URL and first base href. Exact normalized URLs are scheduled once;
query variants remain distinct. A captured redirect final representation is not
fetched again merely because it also appears in the frontier. Redirect policy still
checks every hop. External links remain graph edges and explicit origin exclusions,
not automatically authorized requests or silent scope expansion.

Robots-blocked, failed, unsupported and unvisited URLs remain inventory records with
pending reasons. Static parser ambiguities and unreviewed dynamic navigation remain
queued. Nofollow stays a rel annotation; it is neither robots permission nor proof
of ranking impact. Forms, scripts, events, ping and resource hints do not execute.
Non-text/html representations require another extraction adapter; XHTML is not
silently interpreted under HTML source rules.

Captures retain HTTP/robots/wire/content evidence and hashes. graph.jsonl records
from/to URLs, rel values, offsets, capture path/hash and whether a target is in scope.
discovery.json checkpoints frontier/captures/queues and final artifact hashes;
source.json supplies inventory, exclusions and scope metadata. Raw captures and the
graph must accompany the source receipt for evidence review. A collecting manifest
is not a completed export; use discovery-resume only after confirming the source writer stopped.

Limits are up to 1,000 page captures (default 100), depth up to 64 (default 8),
10,000 scheduled unique URLs, up to 128 MiB capture storage (default 64 MiB), and
8 MiB graph/record metadata. The capture count is not a count of HTTP hops/retries.
Underlying byte/redirect/retry policies still apply. Partial traversal is not a
representative sample; queues explain gaps. No strict wall-clock or total heap bound
is claimed. Cooldowns are shared inside this crawl. discovery-resume restores captured
HTTP/robots cooldown evidence before unresolved requests; unrelated fresh commands
do not inherit that evidence automatically. Respect deferred work across commands.

Terminal complete-for-static-scope only means the declared static-link traversal
has no unresolved work. It cannot prove orphan-page discovery, CMS completeness,
rendered navigation, current indexing or semantic correctness. Other expected
sources and per-item review remain required. Audit campaigns collect/review their
own snapshots; discovery captures are historical evidence, not an automatic bypass
of semantic audit gates. Output is new-only and outside content roots/package.

## Resume stopped link or sitemap discovery

```sh
node scripts/audit.mjs discovery-validate SOURCE_DIRECTORY
node scripts/audit.mjs discovery-resume SOURCE_DIRECTORY NEW_DIRECTORY BUDGETS.json
```

The optional budgets object may contain only the discovery kind's existing budget
fields: maxPages/maxSitemaps, maxDepth, maxStoredBytes, and
maxGraphBytes/maxInventoryBytes. Source ID, seeds, allowed origins and all network
policies stay fixed. Start a separate discovery to change scope or refresh already
successful representations. The configured capture budget includes replayed captures,
so increase it when continuing a count-limited run.

Resume loads only manifest-registered artifacts and validates byte lengths/hashes,
config binding, capture/item identity, evidence value hashes/IDs/lineage and content
bindings. Symlink artifacts are rejected. Loader bounds are 1000 captures, 50000
registered files, 64 MiB per artifact and 192 MiB total loaded file bytes; config
and checkpoint limits are 32/16 MiB. These are input bounds, not total heap limits.
Pre-binding legacy checkpoints are rejected rather than treating unrelated config
as trusted. New discoveries record configHash from the beginning.

Traversal is rebuilt from seeds by parsing the original successful snapshots again.
Graphs, depth/budget queues and source receipts are recomputed rather than trusting
saved complete flags or silently dropping work from a partial frontier. Original
capture dates and evidence bytes are retained. Unsuccessful/unvisited URLs may be
collected through fresh robots/DNS policy checks; captured Retry-After and minimum
host cooldowns are restored first. Expired robots permissions are not reused for
new requests. Parsing/rendering gaps persist when the original snapshot still
requires another adapter.

Output must be new and outside the source directory, content roots and package.
A recovery receipt binds the parent discovery ID and checkpoint hash and lists
reused URLs. Unregistered files from interrupted writes are ignored and left in
place. A changed checkpoint during loading is rejected; this is still a stable
trusted-directory contract, not a hostile filesystem/concurrent-writer sandbox.
Confirm the source process has actually terminated before recovery: collecting,
partial or complete labels and observer timeouts are not process-state evidence.
A resumed snapshot is a historical continuation, not a fresh revalidation of pages.
