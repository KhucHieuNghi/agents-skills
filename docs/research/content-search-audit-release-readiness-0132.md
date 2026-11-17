# Content Search Audit 0.1.32: release readiness

Ngày kiểm tra: 2026-11-17. Baseline: `4a623204aa3b53d79f30e13c0623df340d87d3fc`.

**Kết luận: chưa đủ điều kiện release chính thức.** Candidate 0.1.32 bổ sung sửa lỗi có kiểm thử và bằng chứng native mới; không thay thế publication 0.1.31. Không có human acceptance và vẫn có lỗi hành vi quan sát được. Không đổi ngưỡng để biến lượt thử thất bại thành đạt.

## Phần đã hoàn thiện

- Sửa evaluator: một finding hợp nhất có thể khớp nhiều gold units qua `goldIds`; precision vẫn đếm findings, recall đếm gold units. Chặn credit trùng, không có trong gold, unsupported và dùng đồng thời hai trường.
- Thêm lệnh `methods [DIMENSION]` trả về nội dung thật của sáu phương pháp, đường dẫn và SHA-256, độc lập working directory. Không coi việc gọi lệnh là bằng chứng host đã đọc/hiểu.
- Bổ sung hướng dẫn applicability AEO theo từng rule, điều kiện của khuyến nghị và xác minh, historical measurements, phân biệt crawler permission/fetch/canonical và kiểu chuỗi của DOM dataset.
- Sửa README đang mô tả discovery/global review đã triển khai là chưa có; giữ đúng nhãn candidate.
- Cập nhật component lock và provenance; giữ nguyên năm upstream pins. Archive mới được cài sạch và nâng cấp từ 0.1.31 cho Codex, Claude Code và cấu hình cả hai host (sáu chế độ).

## Gate và bằng chứng

| Gate                                                              | Kết quả hiện tại                                                                         | Giới hạn                                                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Package, provenance, reference closure, component/release binding | Đạt kiểm tra kỹ thuật                                                                    | Không chứng minh chất lượng nhận định                                                                   |
| Install/upgrade hai host                                          | Sáu chế độ đạt                                                                           | Xem `installations.json`                                                                                |
| Technical controls và support holdout                             | Primary review: precision/recall 100% từng host/cohort                                   | Không phải human acceptance; Claude còn vi phạm RTK                                                     |
| Expanded semantic cohort                                          | Artifact và quote replay đạt; hai báo cáo đều có năm material findings                   | Chưa hoàn tất độc lập adjudication; Claude còn lỗi summary và conditional verification                  |
| Native HTML/PDF/OCR                                               | Cả hai host exit 0, dữ liệu gốc giữ nguyên; ba revision mỗi host validate                | Codex Chrome exit 134, không giả vờ đã render; Claude bỏ qua nội dung phương pháp khi pipe sang `wc -c` |
| Mất dữ liệu đo lường                                              | Báo cáo giữ unknown/partial ở nhiều trường hợp                                           | Expanded Claude phủ nhận aggregate đã được cung cấp; chưa đạt nhất quán                                 |
| Khôi phục ngắt tiến trình thật                                    | SIGKILL ở cursor 500/1.200; cả hai host khôi phục đủ 1.200 unique items và 31.200 checks | Tất cả checks unknown, kết quả partial; đây là kiểm tra khôi phục, không phải semantic audit            |
| Public pilot                                                      | Claude thu thập 12/12, campaign/global review validate; Codex fresh capture 8/8 lỗi DNS  | Codex gặp DNS lỗi toàn bộ fresh campaign; không tính historical snapshot là fresh crawl thành công      |
| Human precision ≥90%, recall ≥80%, critical 100%                  | **Chưa có**                                                                              | Người dùng đã nhận vai trò reviewer nhưng chưa có verdict từng finding                                  |

Các partial audit có inventory accounting đầy đủ vẫn là kết quả hợp lệ khi thiếu bằng chứng. Không yêu cầu biến unknown thành pass. Cũng không dùng artifact validity hoặc quote match để suy ra báo cáo đúng về mặt ngữ nghĩa.

## Những việc thực sự còn chặn official release

1. Khắc phục và chứng minh bằng lượt thử mới các lỗi còn tái diễn: summary bỏ sót historical aggregate, verification bỏ điều kiện, không đọc method bodies và vi phạm command conventions. Hướng dẫn 0.1.32 đã cải thiện một số ca nhưng **chưa loại bỏ các lỗi này**. Không sửa báo cáo của host sau chạy, không chạy lại đến khi chọn được kết quả đẹp.
2. Hoàn tất adjudication per host/cohort, gồm clean controls, unsupported advice, missing findings, reporting errors và instruction failures. Không gộp các lượt phát triển thành accuracy công bố.
3. Người dùng thực hiện review độc lập trên hồ sơ cố định. Spec yêu cầu human review; không có công cụ nào tự cấp thay verdict này. Các primary-agent adjudications chỉ là đề xuất để đối chiếu.
4. Claude đã có fresh public collection 12/12 và artifact validation; Codex còn 8/8 lỗi DNS. Cần xác nhận giới hạn capture của môi trường Codex và hoàn tất semantic review public pilot. Lỗi DNS không phải bằng chứng website lỗi.
5. Khi các gate đạt: build phiên bản official mới với digest mới, cài lại cả hai host, đồng bộ catalog/tài liệu/site và kiểm chứng CI/deployment. Không đổi nhãn hoặc ghi đè archive 0.1.32.

## Hồ sơ review

[Evidence index](content-search-audit-trials/release-hardening-0132/README.md) liên kết báo cáo, trace, replay và hash manifest. `human-review.pending.json` giữ verdict trống; null nghĩa là chưa review. `observed-blockers.json` ghi lỗi đã quan sát, không tự nhận là exhaustive review.

Bắt đầu bằng báo cáo expanded của Claude và trace extraction của Claude; xác nhận từng lỗi với nguồn gốc trước khi điền adjudication. Sau đó review các báo cáo còn lại với gold tương ứng trong `tests/fixtures/content-audit/`. Tách verdict chất lượng finding khỏi vi phạm workflow; mọi thay đổi tiêu chí nghiệm thu cần quyết định rõ, không được tự diễn giải thành đạt.

## Immutable candidate

- Component: `3a38d900b80989939c27581cecda17a70b94a8082808e09dfcf50524abbbaf5e`.
- Release directory: `8d816f8779a8ae4df394d4d526764b555c4ff6a54a4e80aa7a673d971f38c7cc`.
- Archive SHA-256: `2578ef08ff8a45105e1547a9173a840da40baa1ff1f336c73e1da1a895865730`.

Các frozen review packets cũ được kiểm tra trên baseline checkout, vì chúng khóa cả source-tree files. Không sửa manifest cũ để phù hợp source mới. Receipt: `historical-review-integrity.json`.
