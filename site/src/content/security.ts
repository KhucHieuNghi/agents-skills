export const securityUpstreamIds = [
  "security-audit",
  "security-review",
  "security-and-hardening",
  "security-best-practices",
  "codex-security-check-skills",
  "codex-security-scan",
] as const;

export const securityUpstreamCopy = {
  "codex-security-check-skills": {
    provider: "OpenAI",
    role: "SKILL REVIEW",
    en: "Read-only review of skills before installation. Host compatibility and packaging require trials.",
    vi: "Rà soát skill trước khi cài đặt theo chế độ chỉ đọc. Cần thử nghiệm tương thích host và đóng gói.",
  },
  "codex-security-scan": {
    provider: "OpenAI",
    role: "SCAN",
    en: "Repository vulnerability scan workflow requiring Codex Security plugin tools and external references. Tracked for evaluation.",
    vi: "Quy trình quét lỗ hổng cần công cụ plugin Codex Security và tài liệu bên ngoài. Đang theo dõi để đánh giá.",
  },
  "security-audit": {
    provider: "Cloudflare",
    role: "AUDIT",
    en: "A coverage-led codebase audit with independent finding verification. Full runs require isolated agents and a controlled sandbox.",
    vi: "Audit codebase theo phạm vi bao phủ, với bước xác minh độc lập. Chạy đầy đủ cần agent tách biệt và sandbox được kiểm soát.",
  },
  "security-review": {
    provider: "Sentry",
    role: "REVIEW",
    en: "Focused code review for high-confidence, exploitable findings. OWASP-derived references need a license review before bundling.",
    vi: "Rà soát mã trong phạm vi cụ thể, chỉ báo cáo lỗ hổng có độ tin cậy cao. Tài liệu dẫn từ OWASP cần rà soát giấy phép trước khi đóng gói.",
  },
  "security-and-hardening": {
    provider: "Addy Osmani",
    role: "HARDEN",
    en: "Threat modeling and secure web implementation patterns. An external checklist still needs to be included for a standalone package.",
    vi: "Mô hình đe dọa và các mẫu triển khai web an toàn. Checklist nằm ngoài thư mục skill cần được xử lý trước khi đóng gói độc lập.",
  },
  "security-best-practices": {
    provider: "OpenAI",
    role: "GUIDANCE",
    en: "Language and framework security guidance for Python, JavaScript/TypeScript, and Go. Host packaging still needs trials.",
    vi: "Hướng dẫn bảo mật theo ngôn ngữ và framework cho Python, JavaScript/TypeScript và Go. Cách đóng gói trên hai host vẫn cần thử nghiệm.",
  },
} as const;
