# Problem presentation pilot

Status: experimental bundled skill, not a released Solution Skill. This pilot
tests the shape of a narrow decision presentation; it does not establish
repeatable Codex or Claude Code behavior for customers.

## Brief

- **Audience:** product owner of this catalog.
- **Problem:** the current public `html-slides` reference is pinned, but the
  original derivation commit of the local rewrite is unrecorded.
- **Decision requested:** authorize a bounded provenance search, then decide
  whether to replace the component if the original base cannot be established.
- **Output:** [five-slide offline HTML pilot](problem-presentation-pilot.html).

For a local trial, build the CLI in this checkout, change to the target project,
and install the pilot skill for both supported hosts:

```bash
catalog_root=/absolute/path/to/agents-skills
node "$catalog_root/dist/cli.js" apply problem-presentation \
  --source "$catalog_root" --target codex,claude-code --scope project
```

This copies the skill to `.agents/skills/problem-presentation` and links it at
`.claude/skills/problem-presentation`; it is not a versioned customer release.

The source record is [`catalog.yaml`](../../catalog.yaml), the current
commercial release rule is in [the product model](../product-model.md), and the
current status is in [the catalog](../agent-catalog.md). The deck treats the two
routes as proposals, not findings. It makes no cost, customer-impact, or legal
claim because the repo has no evidence for those claims.

## Observed result and remaining work

The initial unaided outline already selected one problem, cited the gap, and
asked for a decision. The pilot adds a reusable skill contract and a visual
artifact; it is not evidence that the skill improves model behavior across
hosts. Local checks cover frontmatter validation, source links, offline
rendering, desktop and 390px viewport layout, keyboard navigation, five-page
PDF printing, and installation paths for Codex and Claude Code. These
installation checks do not test actual model output in either host.

Before packaging this as a commercial Solution Skill, test the same brief with
fresh Codex and Claude Code sessions, have intended users judge clarity and
decision usefulness, choose and review any upstream diagram or presentation
component, record its provenance and notices, and publish a versioned solution
manifest only after its quality gates pass.
