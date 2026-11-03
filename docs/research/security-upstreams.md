# Security Upstream Skills: source review

Reviewed 2026-11-03 for the NKSkills discovery catalog. These four entries are
**tracked Upstream Skills**, not bundled components or a released security
Solution Skill. `catalog.yaml` holds the full commit and SHA-256 skill-tree
digest; `check-upstreams` compares later source revisions without changing any
pin or customer installation.

| Skill                                                                                                                                               | Pinned source and scope                                                                                                                              | License and attribution                                                                                                                                                                                                                                                                                        | Review boundary                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`security-audit`](https://github.com/cloudflare/security-audit-skill/tree/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit)          | Cloudflare `c1c8a8c`, `skills/security-audit`; six-phase, coverage-led audit with independent validation and machine-readable findings               | [MIT](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/LICENSE), Cloudflare and contributors                                                                                                                                                                   | Full mode needs independent agents and an OS-enforced, network-isolated sandbox for target-controlled execution. We have not proved that both customer hosts satisfy this contract.                                 |
| [`security-review`](https://github.com/getsentry/skills/tree/0c464f411bdfb8d4c12314b36264d06cb2f60270/skills/security-review)                       | Sentry `0c464f4`, `skills/security-review`; focused review that reports only high-confidence exploitable findings                                    | Repository [Apache-2.0](https://github.com/getsentry/skills/blob/0c464f411bdfb8d4c12314b36264d06cb2f60270/LICENSE); skill [LICENSE](https://github.com/getsentry/skills/blob/0c464f411bdfb8d4c12314b36264d06cb2f60270/skills/security-review/LICENSE) attributes OWASP Cheat Sheet material under CC BY-SA 4.0 | A commercial bundle needs a review of attribution and ShareAlike obligations. The upstream `allowed-tools` field uses Claude-style tool names; Codex behavior has not been trialed.                                 |
| [`security-and-hardening`](https://github.com/addyosmani/agent-skills/tree/301b02b12bff98e4688e6984af6556802322bbde/skills/security-and-hardening)  | Addy Osmani `301b02b`, `skills/security-and-hardening`; threat modeling and secure implementation patterns for web applications                      | [MIT](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/LICENSE), Addy Osmani and contributors                                                                                                                                                                          | The skill links `../../references/security-checklist.md` outside its own directory. A standalone copy would lose that checklist; package closure and host trials are required before inclusion in a Solution Skill. |
| [`security-best-practices`](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices) | OpenAI `49f948f`, `skills/.curated/security-best-practices`; explicit security guidance for supported Python, JavaScript/TypeScript, and Go contexts | [Apache-2.0](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices/LICENSE.txt), OpenAI                                                                                                                                                       | This is nested under `skills/.curated`, beyond the current generic profile discovery path. Claude Code packaging and invocation have not been trialed.                                                              |

The four skills serve different tasks. Cloudflare's full audit is a bounded
investigation with strong execution prerequisites. Sentry's review is for a
specific file or diff while using surrounding code to confirm input flow and
protections. Addy's skill guides secure web development and hardening. OpenAI's
skill selects language and framework references before advising on secure
defaults or producing a requested report. Their instructions should not be
concatenated into one untested workflow: reporting scope, output, and execution
permissions differ.

## Local checks

At the pinned commits, `checkUpstreams` verified all four directory digests and
reported no newer remote revision. The local package validator accepted
Cloudflare and Addy Osmani unchanged. It rejected Sentry's Docker reference
because its example populates an npm token from a mounted secret file, and
OpenAI's Vue reference because it discusses a Vite API key placeholder.
These are illustrative text, not discovered credentials; the validator is
intentionally strict. Any future bundled copy needs a reviewed way to pass
validation while preserving source attribution and a recorded local diff.

## Catalog decision

- Pin the four original source folders, without copying or modifying their
  content. Record their source, digest, license, attribution, and topics in
  `catalog.yaml`.
- Show all four as **tracked security upstreams** on the English and Vietnamese
  landing and catalog pages. Do not market them as a released security solution
  or claim a security audit of NKSkills took place.
- Before proposing a commercial security Solution Skill, resolve Sentry's
  license terms, close Addy's external references, choose an explicit outcome
  and report contract, and run Codex and Claude Code host trials under the
  required sandbox and independent-verification conditions.
