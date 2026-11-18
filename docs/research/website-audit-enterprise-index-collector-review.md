# Authorized index-control collector review

Status: development collector integrated with the existing authorization, network and report contracts. Package/release, broader technical rules and commercial acceptance remain open.

## Implementation

`collectIndexControlsReadOnly` shares a private collection core with `collectCanonicalReadOnly`; the plan cannot select internal mode or import authority. Robots retrieval uses the existing DNS-pinned public transport, scoped trusted read grant, shared request budget and cancellation deadline. UTF-8 decode is strict and unsupported compression fails closed. Grant expiry/revocation and bound identity are rechecked before dispatch and after retrieval. Robots redirects are retained privately and leave policy assessment coverage incomplete.

The existing conservative NKSkills robots gate decides collection; Googlebot evaluation remains separate. Same-origin page resources are checked against collected robots. Other origins are blocked pending separate policy support even when present in the general origin allowlist. A positive crawl-delay uses a serialized permit held through response completion, then waits the declared interval before another dispatch. This includes DNS/connection latency. A delay exceeding collection budget stops before launch. Failed paced responses stop subsequent paced requests; queued work makes rendered coverage incomplete. Cleanup cancels queued and observation timers.

Page raw/full-document and isolated rendered projections bind to a native navigation instance. Index-control captures retain observed non-200 responses; exact status is not a content or indexing verdict. Redirect scope and mismatched navigation remain explicit. Complete acquisition does not imply complete rendering or a passed website audit.

## Independent finding and regression proof

Independent review found that pacing browser route releases could violate crawl-delay after delayed DNS reordered requests. Native delayed-DNS regression failed in red-007 and passed in index-collector-008 after holding the permit until response completion. Fourteen native cases cover clean/body/header capture, HTTP404, blocked POST, denied resources, delay spacing and budget, concurrent DNS, denied/unavailable/redirected robots, mid-flight revocation, forged authority and deadline. The pre-existing canonical collector regression passed nine cases in canonical-collector-010 after the shared-core change.

Thirteen collector unit tests include invalid bounds/scope, forged authority, foreign origins, private DNS and revocation during DNS, with assertions that no forbidden request/browser launch occurred. Fixture corrections: proxy header coalescing means a repeated header test checks retained values rather than expecting exactly two physical CDP entries; resource denial uses `/asset$` so it does not also block the `/asset-page` fixture.

## Public pilot and reporting

[Sanitized eight-capture pilot](enterprise-public-pilot-20261118/index-controls/README.md) records the final collector cohort. Every sample acquired HTTP200 and a Googlebot-allowing robots policy; rendered coverage remains incomplete. All 24 owner-intent comparisons stay unknown, with no new website findings. Four report appendices preserve JSON as source of truth and derive Markdown/HTML through the existing report workflow. Internal source runs, raw receipts and report bytes remain under build; original pilot snapshots remain immutable.

Independent evidence review verified all eight source/private hashes and coverage mappings, all four report digests, and absence of raw capture/header leakage. Reports contain 32 added unknown checks plus 40 intake placeholders (72 total), zero findings. Eight offline report viewport checks passed without overflow, scripts or external requests.

## Remaining gates

Resource-origin expansion needs separate robots policy collection. Per-response transport limits do not constitute a global traffic-byte quota. CDP-decoded body representation, observed readiness and HTTPS proxy limitations remain as documented. Complete real-world rendered evidence, further technical rules, packaging/dual-host installation and cross-module commercial evaluation are still required. No official release is claimed.
