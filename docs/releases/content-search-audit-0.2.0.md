# Content Search Audit 0.2.0 — official release

Date: 2026-11-18 (Asia/Ho_Chi_Minh). Status: **official release for an audit
workflow requiring independent review before use**. Supported hosts: Codex and
Claude Code only. One customer skill; five internally adapted upstream methods.

## Owner decision and product contract

After the [final dossier](../research/content-search-audit-final-decision-0140.md)
and [independent assessment](../research/content-search-audit-final-independent-assessment-0140.md),
the owner stated “Ok phát hành chính thức”. This accepts the proposed assisted
delivery scope and disclosed residual risks. It is not a per-finding human
verdict or approval to claim autonomous first-pass success.

Independent review of claims, applicability, recommendations, quotations, links
and coverage is mandatory before customer reliance. The customer or delivery
owner arranges a separate AI reviewer or qualified person. Follow the
[required review workflow](../guides/content-search-audit-review.md). Missing or
unresolved review leaves delivery pending. No automatic customer content edits
or publication are authorized by installation or by an audit recommendation.

The new manifest changes the product outcome and review responsibility. Component
bytes, five upstream pins, licenses and runtime helpers are unchanged from the
fully exercised 0.1.40 package. No old archive or native verdict is overwritten.
The historical Claude guard check remains failed, including its assisted
evaluator's overall result; the research guard is not shipped. AEO applicability
and summary errors can still require correction. Browser/OCR can remain
unavailable and must be reported as partial/unsupported. No general accuracy,
ranking or citation guarantee is made.

## Immutable artifact identity

- Component digest: `de029b4f618d1cd441d9f722e0dd60e6233f6d5fbc1dc258b6389d48341c2335`.
- Release directory digest: `96162e8a14ad867bbba5cd11bc28225ca7f406c9ce63fadbd3505d1d75b41ed9`.
- Archive SHA-256: `313a36b5de511c5658067e432c1c8e87e8231ec82b7dc15e9e78875dc18a116d`.
- Archive: `agent-skills-solution-content-search-audit-0.2.0.tgz`.
- Release tag: `content-search-audit-v0.2.0`.

Download the archive from the [versioned release](https://github.com/KhucHieuNghi/agents-skills/releases/tag/content-search-audit-v0.2.0),
verify its SHA-256 above before extraction, and keep this release record with it.
The CLI source remains version 1.2.0; build it from the tagged repository.
The solution archive is self-contained and installation requires no upstream
network fetch or additional upstream skill installation.

## Install or upgrade

From the release-tag checkout with Node.js 22+ and npm:

```sh
git clone https://github.com/KhucHieuNghi/agents-skills.git
cd agents-skills
git checkout --detach content-search-audit-v0.2.0
npm ci
npm run build
node dist/cli.js build-solution content-search-audit --output build/content-search-audit-0.2.0
node dist/cli.js install-solution --release build/content-search-audit-0.2.0 --digest 96162e8a14ad867bbba5cd11bc28225ca7f406c9ce63fadbd3505d1d75b41ed9 --project /absolute/path/to/project --target codex,claude-code
```

For a downloaded archive, extract it and pass its `package` directory as
`--release` with the same release digest. Select just `codex` or `claude-code`
when appropriate. Invoke `$content-search-audit` or `/content-search-audit`.
Inspect `.agent-skills/installed.json`; installed paths are `.agents/skills/`
for Codex and `.claude/skills/` for Claude Code. For an existing clean installation,
use `upgrade-solution` with the same arguments and its existing target set.
Locally modified installations are not overwritten.

## Verification and retained limits

The [fresh archive installation receipts](content-search-audit-0.2.0-installations.json)
cover each host separately, one discoverable skill, correct project lock,
helper methods/start/render-revision/validate, retained local evidence links,
unchanged source runs and clean upgrade from 0.1.40. These are new checks on the
0.2.0 archive, not a claim of new native model trials. The unchanged component's
Expanded, support, technical, public, extraction and real SIGKILL/resume trials
remain linked from the final dossier, with original and corrected outcomes split.

The final source/site checks and deployed version are recorded separately in
`content-search-audit-0.2.0-deployment.md` after deployment. Prior production
Worker version `c63940c1-7e3b-488f-bfee-26508d518488` is the rollback point;
archives are never replaced under an existing version.
