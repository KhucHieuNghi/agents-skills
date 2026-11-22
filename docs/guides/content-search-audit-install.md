# Cài và chạy Content Search Audit

Bạn chỉ cần một URL hoặc domain để bắt đầu audit SEO, AIO, AEO và GEO bằng Codex hoặc Claude Code. Dữ liệu GA4, Search Console, Bing và dữ liệu nội bộ là tùy chọn. Skill dùng bằng chứng công khai có thể thu thập và ghi rõ các mục chưa xác minh.

## Chọn gói

- **Bản chính thức `0.2.0`.** Cài theo [hồ sơ phát hành và checksum](https://github.com/KhucHieuNghi/agents-skills/blob/content-search-audit-v0.2.0/docs/releases/content-search-audit-0.2.0.md). Bản này xuất Markdown, HTML, CSV và các tệp dữ liệu audit.
- **Gói tự cài thử `0.3.46`.** Dùng các bước dưới đây để thử luồng chỉ nhập URL hoặc domain và xuất bộ ba JSON, Markdown, HTML. Gói này dành cho pilot trong khi nghiệm thu chất lượng phát hiện trên hai host còn mở.

## Cài gói thử

Cần Node.js 22 trở lên, npm và Codex hoặc Claude Code. Mở terminal tại thư mục vừa giải nén ZIP. Hai archive và `SHA256SUMS.txt` phải ở cùng thư mục. Cài skill vào một project mà bạn có quyền ghi. Có thể dùng project trống, không cần clone repo của chúng tôi.

**1. Kiểm tra hai archive.** Chạy lệnh phù hợp với máy của bạn. Tiếp tục khi cả hai tệp đều báo `OK`.

```sh
# macOS
shasum -a 256 -c SHA256SUMS.txt

# Linux
sha256sum -c SHA256SUMS.txt
```

**2. Chọn host và cài.** Ví dụ dưới đây tạo project `audit-project` trong thư mục hiện tại. Đổi `target_project` nếu muốn cài vào project khác và đặt `target_host` thành `claude-code` nếu bạn dùng Claude Code.

```sh
install_root="$(mktemp -d)"
target_project="$PWD/audit-project"
target_host="codex"

mkdir -p "$target_project" "$install_root/release"
npm install --prefix "$install_root/cli" --offline --no-audit --ignore-scripts "$PWD/agent-skills-cli-1.3.0.tgz"
tar -xzf agent-skills-solution-content-search-audit-0.3.46.tgz -C "$install_root/release"
node "$install_root/cli/node_modules/agent-skills-cli/dist/cli.js" install-solution \
  --release "$install_root/release/package" \
  --digest 6c9c75d497bed8544a25df3e2a0a5c1cfb5658a3feafc08406d3ca0ae0eb5822 \
  --project "$target_project" \
  --target "$target_host"
```

**3. Kiểm tra và mở project.** Tệp `.agent-skills/installed.json` ghi phiên bản `0.3.46` và host đã chọn. Skill nằm ở `.agents/skills/content-search-audit/` trên Codex hoặc `.claude/skills/content-search-audit/` trên Claude Code. Mở chính project vừa cài trong host tương ứng. Nếu installer báo đường dẫn skill đã tồn tại, hãy dùng project trống để thử candidate.

## Chạy audit

**Codex**

```text
$content-search-audit Audit https://example.com/ về SEO, AIO, AEO và GEO.
Chỉ dùng bằng chứng công khai và trả đường dẫn report.json, report.md, report.html.
```

**Claude Code**

```text
/content-search-audit Audit https://example.com/ về SEO, AIO, AEO và GEO.
Chỉ dùng bằng chứng công khai và trả đường dẫn report.json, report.md, report.html.
```

Thay URL mẫu bằng URL của trang cần kiểm tra hoặc domain cần khảo sát. Khi audit domain, báo cáo ghi phạm vi đã khám phá và những URL còn chờ. Nếu host không đọc được website hoặc thiếu dữ liệu đo lường, báo cáo vẫn hữu ích ở phạm vi quan sát được và đánh dấu phần còn thiếu là **chưa xác minh**.

## Đọc và xác minh báo cáo

| Tệp           | Cách dùng                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------- |
| `report.json` | Dữ liệu chuẩn gồm phạm vi, độ phủ, trạng thái, phát hiện, bằng chứng và việc cần làm tiếp.   |
| `report.md`   | Bản để đọc, trao đổi và lưu dấu vết review.                                                  |
| `report.html` | Mở trực tiếp trong trình duyệt để xem URL, hiện trạng, đề xuất ưu tiên và cách kiểm tra lại. |

Giữ cả thư mục báo cáo, gồm `public-report-manifest.json` và bằng chứng. Với báo cáo tổng hợp nhiều trang, giữ thêm thư mục nguồn mà các liên kết bằng chứng tham chiếu. Từ thư mục gốc project, kiểm tra ba tệp bằng lệnh tương ứng:

```sh
# Codex
node .agents/skills/content-search-audit/scripts/audit.mjs public-report-validate /absolute/path/to/report

# Claude Code
node .claude/skills/content-search-audit/scripts/audit.mjs public-report-validate /absolute/path/to/report
```

Kết quả `valid: true` xác nhận ba tệp khớp với checksum trong manifest. Xem trạng thái `Partial` và các mục chưa xác minh trước khi dùng báo cáo. Một reviewer độc lập cần đối chiếu các phát hiện và đề xuất với nguồn trước khi dùng kết luận để ra quyết định. Gói pilot kèm báo cáo mẫu từ một fixture tổng hợp để bạn xem định dạng.
