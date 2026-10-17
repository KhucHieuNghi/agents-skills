export type Locale = "en" | "vi";
export type Host = "codex" | "claude-code";

const invocation: Record<Host, string> = {
  codex: "$codebase-onboarding-c4",
  "claude-code": "/codebase-onboarding-c4",
};

const templates: Record<Locale, string> = {
  en: "I want to understand this repository before changing it. Check whether NKSkills codebase-onboarding@1.1.0, codegraph, and rtk are available here, and whether codegraph status reports a valid index at this repository root. If anything is missing, explain the source-build and setup steps from https://github.com/KhucHieuNghi/agents-skills/blob/main/docs/guides/technical-v1.md and stop before installing tools, creating an index, or editing files. If ready, use {SKILL} in Quick mode. Map one primary product journey and C1/C2 architecture with file citations. Distinguish verified facts from inferences. Return findings in chat first; ask before accessing external systems or writing artifacts.",
  vi: "Tôi muốn hiểu repository này trước khi sửa mã. Hãy kiểm tra NKSkills codebase-onboarding@1.1.0, codegraph và rtk đã sẵn sàng chưa, đồng thời xác nhận codegraph status báo index hợp lệ tại thư mục gốc của repository này. Nếu thiếu, hãy giải thích các bước build từ mã nguồn và thiết lập theo https://github.com/KhucHieuNghi/agents-skills/blob/main/docs/guides/technical-v1.md rồi dừng trước khi cài công cụ, tạo index hoặc sửa file. Nếu đã sẵn sàng, dùng {SKILL} ở chế độ Quick. Lập bản đồ một hành trình sản phẩm chính và kiến trúc C1/C2, dẫn chứng bằng đường dẫn file. Phân biệt sự thật đã kiểm tra với suy luận. Trả kết quả trong chat trước; hỏi trước khi truy cập hệ thống bên ngoài hoặc tạo artifact.",
};

export function promptFor(locale: Locale, host: Host): string {
  return templates[locale].replace("{SKILL}", invocation[host]);
}
