# Enterprise foundation — implementation và independent review

Ngày: 2026-11-18. Branch: `codex/enterprise-audit`. **Unpublished evaluation**, không phải enterprise release acceptance. Goal đầy đủ vẫn gồm P2–P7 trong [kế hoạch](../plans/website-audit-enterprise.md).

## Đã triển khai và kiểm tra

- P0: giữ archive 0.2.0 và kiểm tra SHA-256, release tree, component lock trước khi chạy helper cũ. So sánh toàn bộ 12 artifacts sinh ra từ fixture readable/unsupported giữa helper cũ và mới; chỉ normalize timestamps, UUID và output path. Đây là compatibility regression có phạm vi.
- P1: enterprise schema/state riêng, entity/customer/run ownership, scenario/window identity, coverage theo declared scope, dependency/freshness invalidation và historical verdicts.
- Intake 10 nhóm module với năm business profiles kết hợp được; yêu cầu business outcome thay đổi theo profile. Registry hiện là câu hỏi intake, chưa phải full audit rule suite.
- Data requests có instructions/fallback/owner, dedup và trạng thái; validation receipt gắn toàn bộ descriptor thay vì chỉ evidence ID.
- CLI intake/validate/coverage/revise. Revision ghi nhận owner answers, refusals và parent lineage; không sửa nguồn hoặc tự cấp pass. Provider answers chưa có adapter tương ứng vẫn unresolved.
- Authorization evaluator dùng grant đầy đủ từ trusted host session, kiểm tra environment/assets/identity/action/validity. Helper chưa thực thi mutation.

## Review độc lập và cách xử lý

Reviewer thứ nhất kiểm tra source mới và tái hiện ba lỗi: forged grant reference, foreign entity ownership, changed entity retaining pass. Đã tạo tests thất bại trước sửa, sau đó chạy đạt.

Reviewer fresh-context thứ hai (GPT-6.2 Astra) đưa verdict **changes requested** cho foundation. Bảng dưới ghi sửa đổi và test evidence; không viết lại verdict gốc thành một lần re-review đã pass.

| Finding của reviewer                                                     | Sửa trong implementation                                                                                          | Kiểm thử                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Run không liên quan nhận history; parent hợp lệ lại mất pass do runId    | Bắt explicit parent lineage, validate history ownership/source digest, so sánh asset identity tách revision owner | `requires explicit lineage…`, foreign history/response tests         |
| Check bị bỏ khỏi plan làm mất verdict và giảm denominator                | Archive removed check; union declared scope; missing check vẫn unknown trong coverage                             | `preserves removed verdicts…`                                        |
| Future/expired evidence hoặc future N/A vẫn được đếm assessed            | Validate tại stored assessment time, độc lập với việc có gọi reconcile hay chưa                                   | `rejects future observations…`, request future-observation test      |
| Provided request không có bindings; receipt ID cũ dùng lại cho bytes mới | Require provided evidence/digests/metadata; receipts bind toàn descriptor; replacement cần validation mới         | Provided-without-bindings, replaced-evidence, temporal tests         |
| Không có installed workflow lưu answer/refusal/revision                  | Thêm `enterprise-revise`, source digest/new run binding, attributed owner answers, giữ refusal và nguyên bản      | Installed-style three-revision test; extracted archive install smoke |
| Profile không thay đổi câu hỏi                                           | Tổng hợp business outcomes theo profile và tạo hướng dẫn riêng; mixed profiles dedup                              | Commerce vs publishing question test                                 |

Trong cùng fix pass có thêm guard giữ refusal khi old evidence còn tồn tại, declared scope bắt buộc, content digest và response-history ownership. Các trường hợp đó đã được tái hiện bằng tests thất bại trước sửa.

**Minor được ghi nhận:** link nhãn `content-search-audit@0.2.0` trong README vẫn trỏ vào manifest development 0.3.0; prose phân biệt rõ archive cũ và source candidate. Sửa navigation cùng lần hoàn thiện tài liệu release, trước khi phát hành thương mại.

## Quyết định của implementer

- Native implementation và review độc lập trên worktree riêng. Không merge/publish/deploy trong milestone này.
- Source manifest 0.3.0 chỉ dùng đóng gói evaluation. Archive chính thức 0.2.0 không đổi. Nếu nhãn candidate bị bỏ khi phân phối, khách hàng có thể hiểu nhầm mức hỗ trợ; mọi claim enterprise vẫn phải qua P7.
- Revision giữ nguyên declared obligations; scope bị thu hẹp cần một audit mới được thống nhất, không âm thầm xóa denominator. Điều này có thể giữ report partial lâu hơn nhưng tránh che mất phần chưa kiểm tra.
- Owner text chỉ được chấp nhận là nguồn khẳng định của owner cho business context/content sources/consent policy/optimization scope. Nó không chứng minh behavior của provider. Adapter P3 vẫn phải validate supplied provider exports.
- Reviewer không đánh giá P2 report, P3 authenticity, P4–P5 runtime accuracy, P6 executor safety hoặc P7 trials/pilots. Các phần đó được giữ mở; foundation không thay thế bằng chứng của chúng.

## Verification và giới hạn

**75 test files / 562 tests đạt**; format, lint, typecheck, build và diff whitespace check đạt. Bao gồm legacy regression và red/green tests cho findings trên. Không có claim về precision/recall của enterprise semantic audit từ số lượng unit tests.

Build archive mới, extract rồi install vào project sạch riêng cho Codex và Claude Code. Chạy installed helper để intake, tạo revision từ chối dữ liệu, validate và coverage: cả hai giữ refusal, 10 module/10 intake checks, zero assessed passes. Đây là kiểm tra packaging/runtime helper, không phải native agent behavioral trial.

- Component: `c247071c004a26f1412bdad50acc6122bc56eaed90508179e05166113e382f30`.
- Release directory: `407b5039f2827889aa94e4fd6c43c5eb00239f7bd586d485af2d639d9187480a`.
- Archive: `27a5de5e83d41a14a3c2f1a9ed782a0008dcb567f852e638b92eeb1e29a2973f`.
- [Installation receipts](website-audit-enterprise-foundation-installations.json).
- [Structural/provenance verifier](website-audit-enterprise-foundation-verification.json): releaseAccepted luôn false; chưa có enterprise semantic acceptance.

Bước tiếp theo là P2 canonical report/revisions; song song trong kế hoạch tiếp theo cần khóa chi tiết adapters/module checks và các holdout scenarios. Customer pilot, independent semantic evaluation, risk acceptance và production release vẫn chưa hoàn thành.
