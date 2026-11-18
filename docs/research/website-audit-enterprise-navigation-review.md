# Native navigation binding review

Status: development collector foundation; production authorization/proxy integration and enterprise report packaging remain open under [Task 2c](../plans/website-audit-enterprise-technical-seo.md).

## Implementation and native proof

A host-owned CDP observer attaches before navigation, records main-document request/loader/frame identity and redirect hops, then retrieves the current completed response body by request ID. Ambiguous, unfinished, failed, service-worker-backed or oversized responses remain unknown. Snapshot rejects navigation/event changes during retrieval. Canonical fixture composition now requires response and isolated DOM frame/loader equality; canonical header parsing uses the bound response's headers.

Same-URL reload is exercised in `build/enterprise-navigation-native-003`: two loads have distinct loader/request/body identities; old response binding cannot match the new DOM. Final redirect, aborted navigation and a server-held response are also exercised. This five-case native trial retains private evidence and a digest receipt. The canonical harness in `build/enterprise-technical-seo-native-009` replays all 16 cases with navigation binding. Prior trials remain immutable.

Body representation is explicitly CDP-decoded UTF-8 or base64, not a claim of original wire bytes. Event timestamps are host receipt times. Native headers/body and redirect URLs remain private. Hash integrity alone does not authenticate execution.

## Independent review and deadline hardening

The independent reviewer passed the initial 13 unit tests and reproduced a delayed same-URL reload: it did not reuse the prior response, returning unknown when the newer response was incomplete. The reviewer also verified that a held navigation could leave CDP waiting indefinitely; the earlier plan deferred deadlines, so this was reported as a production limitation rather than a binding correctness defect.

The implementer addressed that limitation immediately. Two stall regressions first failed with a hung sentinel, then passed after bounded protocol/session/detach operations. Additional tests cover late-created session cleanup and setup error privacy. The final focused suite contains 17 cases. Each protocol command is bounded by timeoutMs; snapshot contains at most three commands plus cleanup. A total collector deadline still belongs to the outer production workflow, including rendered DOM capture. Failed cleanup is reported rather than silently claimed successful.

Native final trials passed after these changes. This is implementer verification following independent review, not a second independent acceptance pass. Authorization enforcement, resource budgets across the whole browser, charset policy, real public pilots and commercial acceptance remain required.

## Source basis

[CDP Network](https://chromedevtools.github.io/devtools-protocol/tot/Network/) describes document request/loader IDs, response completion and response-body retrieval. The installed Playwright protocol definitions were also inspected to confirm event fields. No protocol implementation code was copied.

Final verification: 17 focused unit cases, 5 native navigation cases and 16 canonical browser cases pass. The full single-worker repository suite passes 99 files / 998 tests (49.16 seconds). Format, lint, typecheck, build and staged diff checks pass. An initial lint failure for unqualified structuredClone was corrected to globalThis.structuredClone without changing behavior. Existing package manifests and archives remain unchanged.
