# Enterprise evaluation isolation — implementation checkpoint

Status: incomplete development infrastructure, 2026-11-19. No isolated native
trial or commercial gate is established by this checkpoint.

The 0.3.20 development repeat demonstrated that prompt-only read boundaries are
insufficient. The planned broker keeps native-host authentication outside the
workload container and exposes only a command tool executing inside that
container. Each host must separately prove that built-in filesystem, shell,
browser, app and additional MCP paths are unavailable. Configuration flags alone
are not that proof.

## Observed feasibility

The local compatibility backend exported a sentinel from a paused container's
`/work` tmpfs, preserving its SHA-256. Container removal succeeded. The local
receipt is [retained here](enterprise-evaluation-isolation/backend-probe.json). This single
probe does not establish portability: Docker documents limitations around copying
tmpfs contents. A broker must preflight its exact backend and fail closed on
unsupported export, or use a separately verified bounded volume/exporter design.
It must never resume untrusted background processes merely to create a tar.

## Implemented artifact boundary

`scripts/enterprise-evaluation/artifact_export.py` accepts bounded uncompressed
tar bytes from a trusted broker, validates members and publishes into a new
directory under a caller-owned private parent. It rejects path traversal,
absolute paths, links, special files, sparse/PAX members, duplicate/conflicting
paths and configured size/count limits. Files receive fixed private permissions;
archive ownership and executable bits are not restored. Returned file hashes
bind bytes, not semantic correctness or provider authenticity.

The caller must enforce input-stream limits before buffering, freeze the
container, own the output parent exclusively and never execute exported files.
This module has no container lifecycle or native-host authorization controls.

## Independent review and verification

AI reviewer `measurement_workflow_review` reproduced two issues: intermediate
directory permissions depended on umask, and GNU metadata headers were consumed
before the member guard. Both now have regressions observed failing before the
fix and passing afterward. Directory creation now sets each parent explicitly;
raw header validation rejects extensions before tarfile iteration. No independent
post-fix semantic approval is claimed.

Five exporter test groups pass, including nine unsafe member cases and three
resource-limit cases. The full Python suite passes 58 tests. The repository
lint, typecheck, build, formatting and root/site test commands also pass.
The [real-container integration receipt](enterprise-evaluation-isolation/export-integration.json)
records paused state, exact exported bytes/hash and successful cleanup. These
checks establish the bounded exporter checkpoint only; the broker and host
isolation gates below remain incomplete. No skill package or release lock changed.

## Remaining implementation and acceptance sequence

1. Build the broker with a fixed trusted Docker endpoint, image digest/platform,
   task labels and broker-selected mount/output paths. The model supplies command
   text only. Inputs and installed skill are read-only; no repository, gold,
   credentials, daemon socket or host output bind is available.
2. Enforce no workload network, nonroot, read-only root, dropped capabilities,
   default seccomp, no-new-privileges, bounded CPU/memory/swap/PIDs/file descriptors
   and tmpfs. Inspect effective settings instead of trusting requested arguments.
3. Implement bounded newline-delimited MCP JSON-RPC, serialized calls, command and
   session deadlines, cumulative output limits and disconnect/crash cleanup.
   Timeout or output exhaustion permanently aborts the session and terminates the
   whole container; terminating only a docker-exec client is insufficient.
4. Freeze execution, verify paused state, export within byte/time limits, validate
   artifacts and retain hashes of input, skill, image, configuration and transcript.
   Abort can destroy tmpfs output; do not promise artifact recovery after abort.
5. Integrate Codex and Claude Code independently. Record actual tool inventory
   and adversarial attempts through every alternate read/write/network/tool path.
   Host authentication traffic is distinct from denied workload network traffic.
6. Only after those checks pass, execute independently authored holdouts with
   matched baseline runs under the commercial evaluation protocol. Container
   confinement is not a guarantee against kernel/runtime exploits.

Sources: [Docker cp](https://docs.docker.com/reference/cli/docker/container/cp/),
[Docker run](https://docs.docker.com/engine/containers/run/),
[MCP transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
