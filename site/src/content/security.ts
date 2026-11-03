export const securityUpstreamIds = [
  "security-audit",
  "security-review",
  "security-and-hardening",
  "security-best-practices",
] as const;

export const securityUpstreamCopy = {
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
