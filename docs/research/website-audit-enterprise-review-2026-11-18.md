# Enterprise audit — independent review và bước triển khai đầu

Ngày: 2026-11-18. Đây là review thiết kế/source trước implementation, không phải chứng nhận chất lượng sản phẩm enterprise.

## Phạm vi thực sự đã review

Builder check ban đầu xem khả năng lập kế hoạch, report authority, provider fallback và gates thương mại. Reviewer độc lập tiếp theo đọc spec, roadmap và source state/resume/coverage/report để đối chiếu hợp đồng với implementation hiện có. Không chạy pilot khách hàng hoặc native enterprise trials; module mới chưa được xây.

| Finding                                       | Source gây ràng buộc                               | Quyết định xử lý                                                | Verification còn cần                                                     |
| --------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Scenario/window đụng key legacy               | `state.mjs`, `resume.mjs`, coverage dùng item/rule | Enterprise schema/state/check identity riêng; legacy giữ nguyên | Scenario coexistence, window separation và selective invalidation ở P1   |
| Mode thao tác đụng mode crawl                 | `run.mjs`, `run.schema.json` dùng full/sample      | operationMode và inventoryMode riêng; explicit legacy mapping   | Tám tổ hợp mode và legacy round trip                                     |
| Authorization đến sau browser side effects    | P4 thực thi, P6 mới mô tả change authority         | Envelope và evaluator chuyển lên P1; P4/P6 dùng chung           | Read-only không submit; revoked/expired/mismatched identity bị chặn      |
| Hash không đủ xác định evidence còn dùng được | Legacy reconciliation chủ yếu dựa hashes           | Reuse thêm versions/policy/freshness/assessmentAt               | Same bytes stale, policy changed, deterministic render vs new assessment |
| Thiếu nguồn business outcome cuối chuỗi       | P3 chỉ có GA4/GSC/Bing/GTM                         | Business observations export/manual ở P3                        | Analytics purchase nhưng settlement failed; CRM rejected lead            |

Trạng thái cả năm finding: **đã xử lý trong thiết kế, chưa xác minh implementation**. Không ghi closed/pass cho feature chưa có. Reviewer xác nhận gates thương mại bổ sung đã giải quyết hai câu hỏi trước; điều đó không thay thế việc chạy gates.

## P0 historical checkpoint compatibility hoàn thành, current-output baseline còn mở

- Giữ nguyên package/digest/manifest/archive 0.2.0.
- Đóng băng historical checkpoint từ offline-012 với source hash; dùng làm compatibility fixture, không dùng làm bằng chứng chất lượng đa ngành.
- Thêm tests bảo toàn checkpoint partial/unknown, từ chối schema không hỗ trợ và ghi rõ legacy scenario collision cần state contract riêng.
- Wording cũ vẫn còn trong SKILL.md (“implementation candidate”), README (“evaluation candidate”), NOTICE (“This candidate”). Sửa trong release tương lai cùng digest/version mới; không sửa archive đã phát hành tại chỗ.

Đường triển khai tiếp: hoàn thiện hợp đồng P1 đã bổ sung, red/green tests cho state/authorization/context/data requests, rồi mới nối report và providers. Release/pilot gates P7 vẫn chưa chạy.

## Quyết định thực hiện

Người dùng cho phép triển khai tiếp trong chat. Dùng worktree riêng, branch `codex/enterprise-audit`, giữ nguyên ba bản nháp ở checkout gốc để tránh xóa dữ liệu người dùng đang mở. Bản cập nhật nằm trong worktree; không merge/publish/deploy trong bước review/P0 này.

## Kết quả kiểm tra P0

67 test files / 528 tests đạt; format:check, lint, typecheck, build và git diff --check đạt. Package và solution manifest không thay đổi so với HEAD. Archive local 0.2.0 SHA-256 vẫn là `313a36b5de511c5658067e432c1c8e87e8231ec82b7dc15e9e78875dc18a116d`. Ba tests mới kiểm tra compatibility, không phải enterprise semantic evaluation. Chưa chạy native enterprise trials hoặc pilot khách hàng.

Reviewer follow-up phát hiện phạm vi closure P0 quá rộng: fixture là checkpoint 0.1.0, chưa phải full audit/report golden của 0.2.0. Đã mở lại task current-output baseline và automated release hash guard trong roadmap. Checksum thủ công hiện tại không thay regression test; không tuyên bố toàn bộ P0 hoàn thành.
