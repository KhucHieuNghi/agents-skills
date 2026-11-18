# Content Search Audit 0.1.40 — hồ sơ quyết định phát hành

Trạng thái: các lượt native và review cuối đã hoàn tất; [đánh giá độc lập](content-search-audit-final-independent-assessment-0140.md) đã đối chiếu hợp đồng, counts và archive hashes. Chưa ghi nhận quyết định rủi ro cuối của chủ sản phẩm. Không phải biên bản nghiệm thu chính thức.

## Phạm vi quyết định

Chủ sản phẩm đã chọn “Review AI độc lập + tôi duyệt rủi ro cuối” ngày 2026-11-18. AI review từng kết quả và giữ riêng tác giả, reviewer, bản gốc, bản đính chính. Chủ sản phẩm quyết định trên hồ sơ tổng hợp này; AI không điền verdict thay người dùng. Các ngưỡng precision/recall và critical checks không tự đổi.

Gói được đánh giá là 0.1.40, component `de029b4f618d1cd441d9f722e0dd60e6233f6d5fbc1dc258b6389d48341c2335`, release `4410487c622352ebed49961331dd58341ba31960ed6e3836d652983f7e226b1e`, archive SHA-256 `574df835c14b81a0e6fde330582d102e6f60c3ea95024316fcbf484b2f8fe011`. [Kiểm tra package và cài mới hai host](content-search-audit-trials/release-hardening-0140/README.md). Bản archive cũ không bị ghi đè.

## Bằng chứng đã xác minh

- Root sau sửa guard import stdin: **525 tests / 66 files**, lint, typecheck, build, format và git diff --check đều đạt. Guard có 43 tests tập trung.
- Site: 19 tests và 18 browser tests đạt. Hai lỗi public pilot được sửa: khóa commit nguồn trong hướng dẫn build và thêm đường dẫn cài audit cho cả hai host. Source commit `435a7e1`; chưa triển khai các sửa này lên production.
- [Codex Expanded](content-search-audit-trials/native-expanded-0140/README.md): 5 findings hỗ trợ đủ 6 gold units, 10 dossier được đối chiếu, precision/recall 1 trong cohort này. 4 revisions hợp lệ, 11 quotes theo normalization đã khai báo, 171 local links hợp lệ. Host thực sự dùng render-revision; không suy từ unit tests.
- [Claude Expanded gốc](content-search-audit-trials/guarded-expanded-0140/README.md): 5 findings hỗ trợ 6 material units; 3 revisions hợp lệ, 30 quotes, 130 local links hợp lệ. Historical 40/100 được giữ đúng. Review ghi nhận lỗi AEO và suy luận quy tắc engine chưa kiểm chứng. [Bản đính chính độc lập](content-search-audit-trials/claude-expanded-0140-independent/ASSESSMENT.md) sửa đúng một check và một finding, giữ nguyên evidence/config, xác minh 30 quotes và 114 local links. Đây là kết quả có can thiệp review; original first pass không được đổi thành đạt. Cả hai evaluator Claude hiện vẫn trả overall thresholdsMet=false do check guard thử nghiệm không enforced; chỉ các content checks của bản đính chính đạt. Review đã sửa một câu nhận xét sai về guard bằng đối chiếu event 88–89, giữ lại đính chính reviewer.
- [Gián đoạn thật và resume](content-search-audit-trials/resume-0140/README.md): SIGKILL ở cursor 500/1200; cả hai host khôi phục đủ 1200 IDs/snapshots, 31200 checks, giữ nguyên dữ liệu gốc, 0 fully audited và 1200 pending. Không nhầm hoàn thành thu thập với hoàn thành audit.

- [Support và technical controls](content-search-audit-trials/final-matrix-0140/README.md): bốn lượt kết thúc, mỗi host nhận diện 6 lỗi support và 3 lỗi technical; 56 quotes và 222 local links hợp lệ. Claude có đính chính riêng hai dòng support và một ô technical để tách AEO answer-evidence khỏi yêu cầu question set. Unknown applicability chưa được suy thành pass.
- [Public pilot](content-search-audit-trials/final-public-0140/README.md): cả hai thu thập 12/12 URL, giữ 0 audited/12 pending, không còn frontier trong budget nhưng scope chưa exhaustive. 1.329 local links hợp lệ; 13 quotes Claude hợp lệ theo normalization đã khai báo. Có đính chính riêng phạm vi quote verification và tóm tắt AEO; không có public gold để tuyên bố recall.
- [Extraction](content-search-audit-trials/guarded-extraction-0140/README.md): sáu revisions hợp lệ, 9 quotes và 111 local links hợp lệ; mỗi host tìm một lỗi renewal, giữ clean policy, 0 audited/2 pending/1 unsupported. Claude render/PDF thành công; Codex giữ đúng lỗi capability Chrome/OCR. Lời nhắc xin quyền OCR thừa được đính chính riêng, không xóa kết quả unsupported gốc.

## Rủi ro phải được quyết định rõ

1. **Chất lượng nhận định cần review.** Findings đúng không bảo đảm mọi câu giải thích hoặc rule status đều đúng. Lỗi AEO question-set vẫn xuất hiện trong một số báo cáo Claude; sửa bản giao hàng sau review không chứng minh native first pass đã đạt. Các bảng kết quả phải phân biệt hai loại bằng chứng này.
2. **Guard là thử nghiệm của bộ đánh giá.** Guard không nằm trong gói khách hàng. Các lượt Claude dùng bản sao qua `/var` trước khi sửa bị bỏ qua do alias `/private/var`; được ghi nhận là không enforced. [Đính chính và proof sau sửa](content-search-audit-command-guard/PATH-ALIAS-CORRECTION.md). Guard mới chỉ kiểm tra cú pháp Bash, không kiểm soát chương trình con hay thay thế sandbox. Không quảng bá skill tự bảo đảm mọi lệnh đều dùng RTK.
3. **Năng lực phụ thuộc host.** Browser/PDF/OCR có thể không khả dụng trong sandbox. Khi thiếu năng lực, phải giữ unknown/unsupported và chỉ rõ dữ liệu cần bổ sung; không biến thiếu capture thành lỗi của website.
4. **Giới hạn bằng chứng.** Đây là tập thử nhỏ, không phải độ chính xác tổng quát hoặc cam kết ranking/citation. Public pilot không có gold toàn bộ nên không công bố public recall. Dữ liệu crawl và semantic completeness là hai trạng thái khác nhau.
5. **Không có quyền tự sửa nội dung khách hàng.** Báo cáo và backlog là đề xuất; thay đổi nội dung, truy cập mới và publication vẫn theo phạm vi được cấp quyền.

## Trạng thái triển khai

Website production hiện có deployment được xác minh trong [biên bản](../releases/site-production-2026-11-18.md), vẫn công bố 0.1.32 evaluation candidate. Việc deploy website không đồng nghĩa nghiệm thu skill. PR 3 chưa merge; 0.1.40 chưa là commercial release. Chỉ cập nhật catalog, version official và production sau khi bộ bằng chứng hoàn tất và quyết định rủi ro cuối được ghi nhận chính xác.

## Quyết định sản phẩm còn cần chủ sở hữu

Không thể gọi nguyên archive 0.1.40 là commercial release: manifest của nó còn ghi Evaluation candidate và gate native chưa đạt toàn bộ ở Claude. Phương án có thể duyệt là **bản phát hành mới cho quy trình audit có review độc lập bắt buộc trước khi dùng kết luận**, công khai các giới hạn trên; không quảng bá audit tự động không cần review hoặc guard mặc định. Quyết định này phải nói rõ chấp nhận assisted delivery làm phạm vi sản phẩm, không phải đổi các kết quả native thất bại thành đạt.

Sau quyết định đó mới đổi manifest/outcome và catalog, tạo version/archive mới với cùng component đã đánh giá nếu không sửa package, kiểm tra cài archive cả hai host, cập nhật website, merge/push và xác minh deployment. Nếu chọn tiếp tục yêu cầu native first pass đạt toàn bộ, giữ candidate và chưa phát hành chính thức. Chưa có lựa chọn nào được AI tự điền.
