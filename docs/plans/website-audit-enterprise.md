# Enterprise Website Audit — lộ trình triển khai

**Trạng thái:** đang triển khai; P0–P1 đã có foundation và kiểm chứng có phạm vi, P2 report đã có hồ sơ kiểm chứng, P3–P7 còn mở. Phạm vi đa ngành thay thế lựa chọn SaaS-only trước đó.

**Goal:** một skill audit đa ngành, chủ động xin dữ liệu còn thiếu, xuất hồ sơ thống nhất và hỗ trợ sửa/retest trong quyền được cấp.

**Architecture:** giữ entrypoint `content-search-audit`; module/profile registry dùng chung evidence/run/report contract. Export-first và optional read connectors; mutation là workflow riêng có authorization.

**Tech stack:** Node ESM trong bundled scripts, JSON Schema/Ajv, TypeScript/Vitest trong repository; không thêm dependency runtime trước khi kiểm tra packaging.

**Spec:** [thiết kế enterprise](../specs/website-audit-enterprise.md). Đây là roadmap chia theo deliverable; mỗi phase cần plan chi tiết và review interface trước khi code. Chưa phải lệnh triển khai production.

## Ràng buộc chung

- Chỉ Codex và Claude Code; không pin model.
- Archive 0.2.0 bất biến; capability mới cần version/digest mới.
- JSON authoritative, Markdown cùng revision, HTML derived; mismatch phải lỗi.
- Unknown không phải pass/zero/N/A; mọi module trong scope đều có trạng thái.
- Audit mặc định read-only; quyền đã cấp được tái sử dụng đúng phạm vi.
- Không tuyên bố đã kiểm chứng mọi ngành hoặc causal uplift từ fixture pass.

## Các phase và hợp đồng bàn giao

Các đường dẫn dưới `skills/content-search-audit/` là dự kiến cho file mới, trừ những file đã có được chỉ rõ. Tên test mới là kế hoạch, chưa tồn tại và chưa đạt.

### P0 — bảo toàn baseline và compatibility

- [x] Đọc lại `SKILL.md`, `README.md`, `NOTICE.md`, `provenance.lock.json`, `solutions/content-search-audit.yaml` và release docs; lập danh sách wording candidate/release lệch nhau trước khi sửa bằng phiên bản mới.
- [x] Lưu archive 0.2.0 bất biến trong `tests/fixtures/content-audit/enterprise/legacy/`; compare toàn bộ artifacts của fixture readable + unsupported bằng helper cũ đã xác minh hash và helper hiện tại. Đây là regression có phạm vi, không chứng minh mọi input.
- [x] Thêm `tests/content-audit-enterprise-compat.test.ts`: historical checkpoint 0.1.0 giữ statuses, unsupported schema bị từ chối và scenario collision legacy được ghi nhận.
- [x] `tests/content-audit-release-baseline.test.ts` xác minh archive/release/component integrity và so sánh toàn bộ outputs của bounded synthetic run; chỉ normalize UUID/path/timestamps.

Deliverable: baseline regression và migration decision record. Phụ thuộc: không có.

### P1 — entities, module/profile registry, intake và data requests

- [x] Tạo `schemas/enterprise-context.schema.json`, `schemas/data-request.schema.json`, `profiles/*.json`, `scripts/lib/enterprise-context.mjs` và `scripts/lib/data-requests.mjs`.
- [x] Interface thực tế `resolveAuditContext(input, capabilities) -> enterpriseRun` chứa entities/profileVersions/moduleIds/checks/dataRequests; `reconcileDataRequests(requests, evidence, {assessmentAt, verifiedEvidence, parentRunIds?}) -> {requests, invalidatedCheckIds}`. Receipt `{evidenceId,bindingDigest}` gắn toàn bộ descriptor đã validate. Planned check định danh rule/entity/scenario/window; registry khai báo required evidence và applicability.
- [x] Tạo `tests/content-audit-enterprise-context.test.ts` và `tests/content-audit-data-requests.test.ts`: mixed profile không nhân đôi check, missing access không N/A, answer hợp lệ không hỏi lại, invalid/declined có fallback, replacement evidence invalidates đúng dependency.
- [x] Nối dispatcher `scripts/audit.mjs`, state/resume/coverage hiện có qua adapter schema version, không thay semantics legacy.

Deliverable đã đạt ở mức foundation/intake: năm profile, câu hỏi theo business outcome, revision lưu owner answers/refusals, tiếp tục giữ unknown ở phần thiếu dữ liệu. Rule suite assessment chi tiết và commercial gates vẫn thuộc các phase sau. Phụ thuộc P0.

### P2 — canonical report và review

- [x] Tạo `schemas/enterprise-report.schema.json`, `scripts/lib/enterprise-report.mjs`; nối CLI với enterprise model riêng; giữ schema/report legacy bất biến để bảo toàn compatibility.
- [x] Interface `buildEnterpriseReport(context, results, requests, review) -> report`; `renderEnterpriseReport(report, edition) -> {json, markdown, html, manifest}`. Timestamp lấy từ revision, không lấy clock khi render lại; narrative nằm trong JSON.
- [x] Tạo `tests/content-audit-enterprise-report.test.ts`: mọi scoped module hiện diện, failed + unknown không mất, denominator chính xác, historical citation không bị summary phủ nhận, hash/count consistency, escaping, redaction và offline rendering.
- [x] Synthetic examples phải gắn nhãn sample, gồm complete và partial-data; kiểm tra HTML đọc tốt trên mobile và keyboard, dùng brand khách hàng.

Deliverable đã kiểm chứng ở mức P2: report đầy đủ về cấu trúc khi evidence chưa đầy đủ; revision mismatch bị chặn. [Hồ sơ 0.3.2](../research/website-audit-enterprise-report-032-review.md) ghi review/fixes, examples, browser checks và installed workflow. Không thay thế P3–P7. Phụ thuộc P1.

### P3 — provider/config adapters và measurement

- [x] Tạo `references/provider-access.md`, `scripts/lib/provider-capabilities.mjs`, `scripts/lib/measurement-config.mjs`; mở rộng analytics/search-console/bing importers sau compatibility review.
- [ ] Interface `inspectProviderAccess(context) -> capabilities`; `normalizeProviderSnapshot(source, input, metadata) -> {entities, evidence, gaps}`. Source enum GA4/GSC/Bing/GTM; config và observed measurement tách loại.
- [ ] Định nghĩa adapter đọc hiện có trên host trước, supplied export luôn dùng được; không tự lưu credential hoặc tự cài plugin. Ghi property/container/version/window/query/timezone/pagination/freshness.
- [ ] Tạo `tests/content-audit-provider-capabilities.test.ts`: expired auth/quota, wrong property, truncated exports, approximate metric, stale snapshot, mixed currency/window; không ép sessions bằng clicks.

Deliverable: import/config audit kèm precise input requests, capability matrix ghi live/export/manual rõ ràng. Phụ thuộc P1–P2.

### P4 — tracking và consent runtime

- [ ] Tạo `scripts/lib/tracking-chain.mjs`, `scripts/lib/consent-scenarios.mjs`, `schemas/tracking-observation.schema.json`, references tương ứng.
- [ ] Interface `evaluateTrackingChain(journey, observations, contract) -> moduleResult`; `evaluateConsentScenarios(policy, observations) -> moduleResult`. `moduleResult` phải có moduleId/checks/findings/evidenceIds/dataRequests, validate bằng report schema P2.
- [ ] Tạo `tests/content-audit-tracking-chain.test.ts`, `tests/content-audit-consent-scenarios.test.ts` và fixture browser apps: duplicate SPA pageview, submit thất bại, payment retry/refund, delayed ingestion, denied/basic/advanced, revoke, region và cross-domain.
- [ ] Browser observation chỉ chạy trong scope được phép; dry-run liệt kê side effects; test accounts/sandbox cho lead/booking/payment. Unknown tại mắt xích provider không biến thành claim event đã nhận.

Deliverable: evidence xuyên chuỗi, không kết luận chỉ từ tag fired. Phụ thuộc P3.

### P5 — performance, accessibility, UX/CRO và technical SEO runtime

- [ ] Tạo các adapter `scripts/lib/performance-audit.mjs`, `accessibility-audit.mjs`, `journey-audit.mjs`; bổ sung technical rules vào registry có version, không thay rule legacy tại chỗ.
- [ ] Interface từng adapter `evaluate...(context, evidence) -> moduleResult` theo P4; giữ các metric field/lab, automated/manual, heuristic/experiment trong namespaces riêng.
- [ ] Tạo `tests/content-audit-performance.test.ts`, `content-audit-accessibility.test.ts`, `content-audit-journeys.test.ts`: no CrUX, origin fallback, lab variance, keyboard trap, inaccessible error, mobile overflow, unsuccessful booking, canonical mismatch và crawl sampling.
- [ ] Tạo instructions lấy evidence còn thiếu từ người dùng, bao gồm manual a11y và user research; không biến automated scan thành conformance hoặc giả thuyết thành uplift.

Deliverable: mỗi module có clean/defective/missing fixtures và report. Phụ thuộc P2; provider field adapters dùng P3.

### P6 — optimization có quyền và retest

- [ ] Tạo `schemas/change-plan.schema.json`, `scripts/lib/change-plan.mjs`, `scripts/lib/retest.mjs`, `references/remediation.md`.
- [ ] Interface `planChanges(report, permissions) -> changePlan`; `verifyChanges(changePlan, newEvidence) -> moduleResult`. Plan có asset/environment/owner/dependencies/auth/rollback/acceptance; app execution tích hợp host tools đã được cấp, không shell arbitrary từ input.
- [ ] Tạo `tests/content-audit-remediation.test.ts`: audit không publish, sandbox authorized apply, stale authorization scope, failed retest, rollback evidence, unchanged finding không falsely resolved, before/after window không causal claim.

Deliverable: draft → authorized apply → retest có dấu vết. Phụ thuộc P4/P5 cho từng loại thay đổi.

### P7 — đánh giá đa ngành và commercial release

- [ ] Tạo `tests/fixtures/content-audit/enterprise/` theo năm profile và mixed profile; tách dev/gold/holdout, đảm bảo runner không mount gold vào agent context.
- [ ] Tạo protocol `docs/research/website-audit-enterprise-evaluation.md`: rubric, proposed thresholds trong spec, baseline, native/assisted, 3 repeats/case/host, denominators, errors, cost/time/review effort và uncertainty.
- [ ] Thực hiện pilot được cấp quyền mỗi profile; ghi lịch sử thất bại, independent review và customer-owner feedback. Thiếu pilot không giả bằng synthetic case.
- [ ] Review attribution/licenses cho code hoặc phương pháp được adaptation; cập nhật provenance/component digests và solution manifest bằng version mới.
- [ ] Chạy kiểm tra repo, build archive versioned, extract và install vào project sạch cho từng host; xác minh notices/links/digests/installation lock.
- [ ] Chỉ cập nhật catalog/landing/customer dossier theo capability đã đạt; owner duyệt residual risk với evidence pack cụ thể trước production release.

Deliverable: hồ sơ chứng minh mức hỗ trợ từng module/profile, release quyết định theo evidence. Phụ thuộc P0–P6; có thể tổ chức thử nghiệm sớm từng module nhưng không bỏ gate tổng.

## Review focus xuyên phase

| Tình huống dễ bị bỏ sót                                                      | Phase và test chịu trách nhiệm                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| Website vừa booking vừa ecommerce, check bị nhân đôi hoặc missingness bị che | P1 context + P2 report                            |
| API report hợp lệ nhưng sai property/window hoặc cấu hình đã đổi             | P3 provider capabilities                          |
| Event xuất hiện nhưng business action thất bại hoặc provider nhận chậm       | P4 tracking chain                                 |
| Input cố chèn chỉ dẫn, token/PII hoặc evidence tenant khác                   | P2 rendering + P3 import + P7 adversarial holdout |
| Sửa staging thành công nhưng production chưa đổi, report ghi resolved        | P6 remediation/retest                             |

## Verification cho mỗi thay đổi thực thi

Focused tests trước, sau đó `rtk proxy npm run format:check`, `rtk proxy npm run lint`, `rtk proxy npm run typecheck`, `rtk proxy npm test`, `rtk proxy npm run build`, `rtk proxy git diff --check`. Skill/release thay đổi phải thêm package validation/archive/install hai host theo repository guide. Không ghi test pass trước khi thực chạy. Không đưa estimate thời gian hay cam kết chất lượng thương mại khi chưa đo pilot.

## Prerequisites bắt buộc sau independent review

Trạng thái: người dùng cho phép tiếp tục triển khai ngày 2026-11-18; P0 đã hoàn thành historical checkpoint + bounded current-output regression trên branch `codex/enterprise-audit`. Các phase sau chưa hoàn thành.

- P1 bổ sung `schemas/enterprise-run.schema.json`, `enterprise-check.schema.json`, `enterprise-evidence.schema.json`, `authorization.schema.json`; `scripts/lib/enterprise-state.mjs`, `enterprise-coverage.mjs`, `authorization.mjs`. Interface `authorizeAction(envelope, action, context, now) -> {allowed, reason}` fail closed khi action/environment/identity không khớp. `reconcileEnterpriseChecks(previous, nextContext, assessmentAt)` trả retained/invalidated IDs và reasons theo dependency + freshness/version. Không sửa key legacy để phục vụ enterprise.
- P1 tests bắt buộc: cùng entity/rule khác consent scenario/window tồn tại đồng thời; mixed customer evidence bị từ chối; tám tổ hợp operationMode/inventoryMode; legacy mode không đổi; expired/revoked authorization, import giả mạo grant và permission chỉ đọc không cho submit.
- P2 tests bổ sung identical bytes nhưng stale; policy đổi chỉ invalidates dependent checks; render cùng revision byte-identical, reassessment revision mới; historical evidence giữ nguyên.
- P3 thêm `schemas/business-observation.schema.json`, `scripts/lib/business-observations.mjs` và `tests/content-audit-business-observations.test.ts`; `normalizeBusinessObservations(input, dictionary) -> {observations, evidence, gaps}`. Hỗ trợ export/manual có provenance trước, live vendor integrations chưa là claim.
- P4 phụ thuộc authorization P1 và business observations P3; tests bắt buộc analytics purchase nhưng settlement failed, submit nhưng CRM rejected, unmatched/late backend event, unauthorized form submission, production/test identity mismatch và read-only continuation khi action bị chặn.

Review là kiểm tra source/design, chưa là runtime verification của enterprise. Việc bổ sung hợp đồng giải quyết findings ở mức thiết kế; chỉ đóng verification khi các tests tương ứng tồn tại và đạt.

## Tiến độ P1 — 2026-11-18

Đã có evaluation intake cho năm business profiles và 10 nhóm module; đây mới là câu hỏi intake, chưa là rule suite hoàn chỉnh từng module. Đã nối enterprise-intake/validate/coverage CLI, immutable state, schema family riêng, data-request dedup/reconciliation, dependency/freshness invalidation và grant binding. Context và runtime đều giữ operationMode/inventoryMode riêng. Đã có independent code review và red/green fixes cho forged grant, foreign entity, changed entity reuse. Whole-branch review và packaging evidence được ghi riêng.

P1 foundation đã tích hợp request reconciliation/revise cho owner answers và refusals; provider/runtime answers chờ adapter tương ứng. Mandatory assessment checks phải khóa cùng các module P3–P5, không lấy 10 câu hỏi intake làm full rule suite. P2–P7 vẫn mở. Source manifest 0.3.0 là unpublished evaluation candidate để đóng gói phần này, không phải official enterprise release.

Hồ sơ source review, findings/fixes, tests và install receipts: [foundation review](../research/website-audit-enterprise-foundation-review.md).

## Lịch sử P2 — snapshot 0.3.1

Đã có model/schema và CLI enterprise-report / enterprise-report-validate / enterprise-report-revise. JSON giữ dữ liệu authoritative; Markdown/HTML sinh cùng revision; parent artifacts được kiểm tra trước revision; lịch sử verdict và responses được giữ riêng. Review độc lập đã tìm thêm bypass về source run, evidence binding và public metadata; đã bổ sung fixes/tests, chưa chốt toàn bộ P2. Candidate 0.3.1 đã build/extract/install hai host và chạy synthetic workflow. Xem [interim report review](../research/website-audit-enterprise-report-interim-review.md). Tại snapshot 0.3.1, P2 còn mở vì thiếu UI/examples/final review; trạng thái 0.3.2 được ghi dưới đây. P3–P7 không đổi.

P2 đã đóng implementation/verification slice ở candidate 0.3.2 theo [hồ sơ cuối](../research/website-audit-enterprise-report-032-review.md); review lịch sử vẫn được giữ nguyên. P3 tiếp tục theo [provider adapter contract](website-audit-enterprise-providers.md).

## Tiến độ P3 — provider foundation

Đã có library capability planning, supplied GA4/GSC/Bing/GTM normalization, GA4 config và business observations/schema. Hai vòng review đã phát hiện và đóng bảy finding ở phạm vi kiểm tra; 24 focused tests đạt. CLI/revision/request integration, full-package verification và GA4 config final review còn mở. [Hồ sơ interim](../research/website-audit-enterprise-provider-foundation-review.md). Không đánh dấu các checkbox P3 hoàn thành từ library tests.

P3 follow-up: plan/import CLI now has six workflow tests, with source lineage, request binding, refused/reopened requests, replaced-evidence invalidation and valid/invalid planning contracts. Independent review closed the impossible-plan finding after two residual fixes (duplicate GA4 metrics; fixed GSC timezone). See the provider foundation dossier for scope. Supplied-export guide is linked from the skill; release packaging and the remaining P3/P4 integration remain open. Four real public-site pilots are delivered in [the pilot dossier](../research/enterprise-public-pilot-20261118/README.md); private provider/outcome evidence is still requested, not inferred.

Provider foundation được đóng gói ở evaluation 0.3.4; [hồ sơ candidate](../research/website-audit-enterprise-provider-034-review.md) giữ scope chưa hoàn tất và receipts cài hai host. Capability inspection hiện không có live executor; không đánh dấu toàn P3 hoàn tất từ package green.

P4 implementation under [runtime contract](website-audit-enterprise-runtime.md) now includes supplied trace normalizer/schema, declared stage count/status evaluator, supplied consent policy comparator and immutable CLI/report integration. [Candidate 0.3.8](../research/website-audit-enterprise-runtime-038-review.md) adds typed payload comparison and same-source ordering, with independent review and both-host installed-script trials. Raw protocol authentication, cross-system clock alignment, dedup semantics, live consent scenarios and browser execution remain open; P4 is not complete and prior archives are unchanged.
