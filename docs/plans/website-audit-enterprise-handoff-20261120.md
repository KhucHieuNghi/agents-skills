# Enterprise Website Audit — hồ sơ dừng và bàn giao

Ngày 20/11/2026. Người dùng yêu cầu dừng triển khai và ghi lại công việc còn dang dở. Đây là ảnh chụp trạng thái làm việc, không phải quyết định nghiệm thu hay phát hành.

## Trạng thái và phạm vi

- `content-search-audit@0.2.0` là bản content/search đã phát hành; enterprise mở rộng vẫn là candidate, không được quảng bá là sản phẩm enterprise đã release. Xem [catalog](../agent-catalog.md) và [roadmap](website-audit-enterprise.md).
- Commit nền tại thời điểm bàn giao: `c0626c1`. Có thay đổi chưa commit liệt kê bên dưới; không giả định rằng checkout sạch hoặc các thay đổi đã được tích hợp vào bản cài đặt.
- Audit công khai bốn website và các giới hạn được ghi trong [pilot](../research/enterprise-public-pilot-20261118/README.md). Dữ liệu Search Console riêng của VBA nằm dưới `build/vba-gsc-verified-20261120/report-final/` trong workspace hiện tại; đây là dữ liệu riêng, không đưa vào Git hoặc mặc nhiên chia sẻ với khách hàng khác. Báo cáo đầy đủ vẫn có `reviewStatus: pending`.
- GA4 của VBA chưa được xác nhận truy cập trong phiên connector này. Lần kết nối gần nhất trả lỗi yêu cầu `link_id`; các lần trước còn có sai khác tài khoản/project. Không suy ra tài khoản không có dữ liệu và không khẳng định đã audit GA4 thực tế. Khi tiếp tục, kiểm tra lại kết nối read-only bằng tài khoản được người dùng chỉ định, sau đó xác thực property, quyền, khoảng thời gian và nguồn trước khi nhập dữ liệu. Không yêu cầu mật khẩu hoặc token.

## Công việc chưa commit

Giữ nguyên để người tiếp tục kiểm tra; chưa coi là production-ready:

| Tệp                                                      | Nội dung hiện tại                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/enterprise-journeys/research-content-store.mjs` | Thêm `privateBinding` do owner tạo cho đường đọc assembly nội bộ.                                                                                       |
| `tests/content-audit-research-content-store.test.ts`     | Kiểm tra binding mới; targeted test đã chạy đạt trong phiên làm việc.                                                                                   |
| `scripts/enterprise-mixed-report-store.mjs`              | Prototype kho membership mã hóa và đọc báo cáo hỗn hợp từ các nguồn được cấp quyền. Chưa được đóng gói vào release.                                     |
| `tests/content-audit-mixed-report-store.test.ts`         | Một end-to-end scenario về nguồn research được phép rồi bị thu hồi. Reviewer độc lập chạy đạt khi tăng timeout lên 60 giây; mặc định 5 giây bị timeout. |

Prototype không lưu plaintext báo cáo hỗn hợp vào kho; output chỉ là bản dựng nội bộ, cờ disclosure/delivery đều chưa được cấp. Một revision ban đầu chỉ nhận thành viên `current`; predecessor và lịch sử mixed chưa được triển khai. Danh sách nguồn được khai báo không chứng minh đã bao phủ mọi nguồn hiện có.

## Finding độc lập cần xử lý trước

**P1 — thời gian kiểm tra quyền bị đóng băng.** Review độc lập xác nhận các kiểm tra quyền, thời hạn review và retention hiện dùng lại `assessmentAt` tại thời điểm bắt đầu. Một grant hợp lệ lúc bắt đầu có thể hết hạn trong quá trình replay/decrypt/render nhiều giây mà vẫn trả artifact. Đây là finding từ đọc code; reviewer chưa chạy exploit hết hạn. Test E2E mất khoảng 11 giây trong lần review.

Hướng xử lý cần thiết: nhận đồng hồ đáng tin từ host, lấy lại thời gian tại các ranh giới trước khi giải mã nội dung và trước khi trả kết quả, kiểm tra thời gian đơn điệu, đồng bộ timestamp giữa source/controller và kiểm tra lại grant, review, retention. Viết test có thao tác thật bị trì hoãn qua thời điểm hết hạn và chứng minh từ chối, không trả artifact. Xác định rõ giới hạn về việc quyền có thể thay đổi đồng thời trong lúc decrypt; đồng hồ và identity vẫn phụ thuộc host đáng tin.

Reviewer cũng xác nhận guard chỉ cho `current` ở lần tạo đầu đã xử lý việc caller tự gắn nhãn lịch sử không có chứng cứ. Các boundary đã đọc gồm inventory nguồn, encryption gắn đường dẫn, provenance do owner tạo, grant nguồn generated, kiểm tra metadata trước research decrypt và marker withheld chung. Đây là review có phạm vi, chưa phải phê duyệt toàn hệ thống.

## Thứ tự tiếp tục

1. Giữ nguyên các thay đổi trên; đọc lại diff, contract [report history](website-audit-enterprise-report-history.md), [report V2](website-audit-enterprise-report-v2.md) và [research disclosure](website-audit-enterprise-research-disclosure.md). Sửa P1 theo test thất bại trước; review độc lập lại sau khi sửa.
2. Bổ sung test tích hợp mixed layer cho nguồn đã tombstone so với directory thiếu, grant sai/hết hạn, source alias trùng, controller mâu thuẫn, ciphertext hỏng, race và thay thế source; kiểm tra không rò ID/số lượng nguồn bị withheld và parity JSON/Markdown/HTML. Kiểm tra public read không lộ `privateBinding`.
3. Thiết kế và kiểm thử lifecycle xóa/tombstone membership, quyền cleanup và expiry; không mô tả tombstone là xóa vật lý. Đánh giá backup/rollback cùng đường dẫn và các bảo đảm external monotonic store trước khi tuyên bố chống rollback.
4. Thực hiện revision kế tiếp và lịch sử membership theo contract đã review; kiểm tra predecessor, nguồn cũ bị xóa/thu hồi và thay đổi nội dung. Không gắn nhãn historical chỉ dựa trên caller khai báo.
5. Phân loại và ràng buộc provenance của generated source: grant đọc không tự chứng minh nội dung generated không chứa research bị quản lý. Trước release cần cơ chế đáng tin để nội dung bị thu hồi không tiếp tục xuất hiện qua một nguồn generated khác. Rà scope tenant, recipient, purpose, disclosure, delivery và rủi ro đồng thời.
6. Tiếp tục các phần P3–P7 còn mở trong [roadmap](website-audit-enterprise.md): provider thực tế, chuỗi conversion/consent, performance field, accessibility và UX research, remediation có quyền/retest, đánh giá đa ngành và independent review. Báo cáo phải giữ unknown và đưa ra yêu cầu bổ sung cụ thể, không biến thiếu dữ liệu thành pass.
7. Thực hiện commercial evaluation theo [protocol](../research/website-audit-enterprise-evaluation.md): holdout tách biệt, baseline, hai host, repeated runs, metrics có denominator, kiểm tra an toàn, chi phí và giới hạn; bổ sung pilot được phép và phản hồi chủ sở hữu. Không dùng fixture pass hoặc số verdict làm precision/recall.
8. Sau khi các gate đạt: cập nhật provenance, license và digest; chạy `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`; build archive có version và cài archive đã giải nén vào project sạch cho Codex và Claude Code. Review độc lập evidence pack, sau đó trình người dùng duyệt rủi ro còn lại trước release/deployment.

## Những điều chưa được chứng minh

Chưa có bằng chứng đủ để nói enterprise skill hoàn chỉnh, được nghiệm thu, deploy production hay tạo uplift thương mại. Targeted test của prototype không thay thế full suite, kiểm thử installed workflow, native host evaluation hoặc security review. Dữ liệu pilot, output riêng và các thư mục `build/` có thể mang tính tạm thời; xác minh sự tồn tại và quyền truy cập khi tiếp tục, không coi là nơi lưu trữ lâu dài được bảo đảm.
