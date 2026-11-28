# Enterprise Landing Page

`enterprise-landing-page@0.1.0` is an evaluation candidate for Codex and Claude
Code. It supports new campaign pages, scoped redesigns, design proposals and
reviews in Vietnamese or English. The package contains one entrypoint.

## Build and install

From the authoring checkout with Node.js 22+ and npm:

```bash
git checkout --detach 160b3079a25342020b1ac2d154bdb83cfea40485
npm ci
npm run build
node dist/cli.js build-solution enterprise-landing-page --output build/enterprise-landing-page-0.1.0
npm pack --pack-destination build
```

Use the [archive installation steps](technical-v1.md#transfer-and-install) with
the `agent-skills-solution-enterprise-landing-page-0.1.0.tgz` archive and its
verified release digest. Start the host in the target project after installing.
Use `$enterprise-landing-page` in Codex or `/enterprise-landing-page` in Claude
Code. Install only for the intended host or select both.

## First prompt

**Tiếng Việt**

> Dùng enterprise-landing-page để dựng landing page tiếng Việt cho [sản phẩm /
> chiến dịch], dành cho [nhóm khách hàng] từ [kênh]. Hành động chính là [CTA] và
> đích đến là [URL hoặc luồng]. Dùng tài liệu thương hiệu và bằng chứng tại [đường
> dẫn]. Tạo preview trong repo, thử luồng chuyển đổi bằng dữ liệu giả, kiểm tra
> mobile, tablet và desktop, rồi bàn giao Markdown và JSON. Nếu thiếu dữ liệu,
> ghi rõ tôi cần cung cấp gì. Giữ mọi thay đổi ở môi trường local.

**English**

> Use enterprise-landing-page to build a landing page for [offer] for [audience]
> from [channel]. The primary action is [CTA] with destination [URL or flow]. Use
> the brand and approved evidence in [paths]. Build a local preview, test the
> conversion path with synthetic data, and deliver the Markdown and JSON handoff.
> List missing inputs with the decision each one unlocks.

The handoff lists the preview path, browser and build evidence, unresolved
decisions, and their owners. Keep the evidence private when it contains customer
material. Agree on publication and live data integrations separately.

## Test the 0.2.0 candidate

The development candidate adds questions for incomplete briefs, motion and
responsive guidance, basic SEO checks and structured browser evidence. Build
from the candidate checkout, keeping it separate from the `0.1.0` checkout.

```bash
npm ci
npm run build
node dist/cli.js build-solution enterprise-landing-page --output build/enterprise-landing-page-0.2.0
```

Use [archive installation](technical-v1.md#transfer-and-install) with
`agent-skills-solution-enterprise-landing-page-0.2.0.tgz`, the CLI archive and
the candidate's own digest. Install into a clean test project. Start a new
session and use the same host invocation and sample prompts above.
The candidate uses handoff schema version 2. Consumers of version 1 should
continue using the `0.1.0` package until they support the new schema.
See the [0.2.0 evaluation record](../research/enterprise-landing-page-evaluation-0.2.0.md)
for archive hashes and test results.

## Evaluation before commercial distribution

The [evaluation record](../research/enterprise-landing-page-evaluation.md)
contains the candidate archive hashes, installation evidence and trial scope.

Run the same frozen briefs on both hosts in fresh projects. Score the rendered
page, stated scope, evidence and handoff together. Retain the prompt, host
version, screenshots and check results for each trial.

| Scenario                                 | Required behavior                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Vietnamese lead generation, greenfield   | Clear primary CTA, readable diacritics and no horizontal overflow, no unsupported claims and honest preview status when no endpoint is supplied |
| English reservation or purchase campaign | Accurate CTA destination and safe validation of success and error states where applicable                                                       |
| Existing branded page, scoped redesign   | Retains existing framework, style system, out-of-scope routes and conversion wiring                                                             |
| Review with missing rights and analytics | No production mutation, no assumed metrics, and actionable requests for missing evidence                                                        |

Use blinded independent review for composition, message clarity and credibility.
Have reviewers score those three dimensions on a 1–5 scale using the same
brief, screenshots and viewport set. Compare the full workflow with the
customer's existing process or a matched baseline before claiming an uplift.
For commercial sign-off require a successful trial of the full matrix on both
hosts, zero unsupported published claims or unauthorized side effects, all
critical CTA and keyboard checks passed on applicable builds, a score of at
least 4/5 per design dimension on representative builds, and documented
owner acceptance of remaining limitations.
