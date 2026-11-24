# Cài và chạy Content Search Audit

Bạn chỉ cần một URL hoặc domain để bắt đầu audit SEO, AIO, AEO và GEO bằng Codex hoặc Claude Code. Dữ liệu GA4, Search Console, Bing và dữ liệu nội bộ là tùy chọn. Skill dùng bằng chứng công khai có thể thu thập và ghi rõ các mục chưa xác minh.

## Chọn gói

- **Bản chính thức `0.2.0`.** Cài theo [hồ sơ phát hành và checksum](https://github.com/KhucHieuNghi/agents-skills/blob/content-search-audit-v0.2.0/docs/releases/content-search-audit-0.2.0.md). Bản này xuất Markdown, HTML, CSV và các tệp dữ liệu audit.
- **Pilot song ngữ `0.3.49`.** Dùng bản build từ source để chọn giao diện HTML tiếng Việt hoặc tiếng Anh.
- **Gói ZIP thử `0.3.46`.** Dùng các bước dưới đây để thử luồng chỉ nhập URL hoặc domain và xuất bộ ba JSON, Markdown, HTML. Gói này dành cho pilot trong khi nghiệm thu chất lượng phát hiện trên hai host còn mở.

## Build pilot song ngữ từ source

Từ một checkout NKSkills có ứng viên `0.3.49`, chạy các lệnh sau với Node.js 22 trở lên:

```sh
npm ci
npm run build
node dist/cli.js build-solution content-search-audit \
  --catalog catalog.content-search-audit-candidate.yaml \
  --output build/content-search-audit-0.3.49

node dist/cli.js install-solution \
  --release build/content-search-audit-0.3.49 \
  --digest PASTE_DIGEST_FROM_BUILD_OUTPUT \
  --project /absolute/path/to/empty-project \
  --target codex
```

Dùng giá trị `digest` do lệnh build in ra. Đổi `--target codex` thành
`--target claude-code` nếu bạn dùng Claude Code.

## Cài gói ZIP 0.3.46

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

Bản thử nghiệm mới hỗ trợ yêu cầu bằng tiếng Việt, tiếng Anh hoặc trộn cả hai.
Ghi rõ “Viết báo cáo bằng tiếng Việt” hoặc “Write the report in English” nếu
muốn chọn ngôn ngữ cụ thể. Với gói cài hỗ trợ `reportLocale`, các nhãn chính
trong HTML đi theo lựa chọn đó. Bằng chứng được giữ nguyên ngôn ngữ nguồn.

**Codex**

```text
$content-search-audit Audit https://example.com/ về SEO, AIO, AEO và GEO.
Chỉ dùng bằng chứng công khai và trả đường dẫn report.json, report.md, report.html.
Viết báo cáo bằng tiếng Việt.
```

**Claude Code**

```text
/content-search-audit Audit https://example.com/ for SEO, AIO, AEO and GEO.
Use public evidence only. Return report.json, report.md and report.html in English.
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

## Kết nối OpenSEO tùy chọn

**Chưa có tài khoản OpenSEO?** Bạn có thể dùng [prompt audit từ URL](#chạy-audit)
ngay sau khi cài Content Search Audit. Nếu bạn đã có tệp export GA4 hoặc Search
Console tương thích, cung cấp trực tiếp khi audit. Các số liệu chưa có nguồn
được ghi là **chưa xác minh**.

### Tạo tài khoản và kết nối lần đầu

Dùng các bước này khi muốn bổ sung dữ liệu OpenSEO vào bản thử nghiệm 0.3.49.

1. Mở [OpenSEO](https://app.openseo.so/), đăng ký hoặc đăng nhập. Trong workspace
   của bạn hoặc tổ chức, tạo một project với đúng domain website. OpenSEO có
   gói miễn phí và cho phép đăng ký không cần thẻ. Lượt đọc Search Console và
   GA4 không dùng credits. [Gói và credits](https://openseo.so/docs/billing)
2. Kết nối OpenSEO MCP trên host nơi bạn đã cài Content Search Audit. Làm theo
   mục **MCP only** trong hướng dẫn [Codex](https://openseo.so/docs/codex-plugin)
   hoặc [Claude Code](https://openseo.so/docs/claude-code-plugin), rồi đăng nhập
   OpenSEO khi host yêu cầu. Content Search Audit dùng được với kết nối MCP.
3. Nếu đã có số liệu Google, mở **Project settings → Integrations** trong project
   OpenSEO. Kết nối từng nguồn bạn muốn dùng và chọn đúng site Search Console
   hoặc GA4 property. Chủ sở hữu hoặc quản trị viên OpenSEO có thể thiết lập
   kết nối và dữ liệu tích hợp hiển thị cho thành viên tổ chức. [Hướng dẫn GA4 và Search Console](https://openseo.so/docs/google-integrations)
4. Mở một phiên audit mới trong host và gửi prompt dưới đây. Nếu project xuất
   hiện dưới nhiều workspace, chọn project bạn muốn dùng. Nếu thiếu quyền đọc
   hoặc chưa cài Google Analytics, vẫn có thể dùng kết quả công khai và bổ sung
   số liệu sau.

```text
Audit https://example.com/ bằng Content Search Audit. Dùng OpenSEO chỉ đọc nếu đã kết nối đúng project. Nếu thiếu quyền hoặc thiếu số liệu, tiếp tục với dữ liệu công khai. Viết báo cáo bằng tiếng Việt.
```

```text
Audit https://example.com/ with Content Search Audit. Use read-only OpenSEO data if the correct project is connected. Continue with public evidence for any unavailable sources. Write the report in English.
```

Pilot nhận Search Console theo trang, tổng hợp GA4 Organic Search ở cấp property
và các trang trong một crawl đã lưu. Báo cáo ghi rõ nguồn còn thiếu, số liệu bị
giới hạn và kỳ dữ liệu. Giữ báo cáo có dữ liệu OpenSEO trong phạm vi riêng tư.
