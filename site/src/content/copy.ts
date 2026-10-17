import type { Locale, PageKind } from "../lib/routes.js";

type Metadata = { title: string; description: string; heading: string };

export const metadata: Record<Locale, Record<PageKind, Metadata>> = {
  en: {
    home: {
      title:
        "NKSkills | Versioned AI skill workflows for Codex and Claude Code",
      description:
        "Compose source-traceable AI skills into repeatable workflows. Start with evidence-backed codebase onboarding for Codex and Claude Code.",
      heading: "Turn AI skills into repeatable team workflows.",
    },
    solution: {
      title: "Codebase onboarding | NKSkills Solution Skill 1.1.0",
      description:
        "Explore the released codebase-onboarding workflow, its locked components, prerequisites, evidence gates, and current verification limits.",
      heading: "Understand an unfamiliar codebase with evidence.",
    },
    "codex-guide": {
      title: "Use codebase onboarding in Codex | NKSkills guide",
      description:
        "Build and install the NKSkills codebase-onboarding Solution Skill from GitHub source, prepare CodeGraph and rtk, and invoke it in Codex.",
      heading: "Run codebase onboarding in Codex.",
    },
    "claude-guide": {
      title: "Use codebase onboarding in Claude Code | NKSkills guide",
      description:
        "Build and install the NKSkills codebase-onboarding Solution Skill from GitHub source, prepare CodeGraph and rtk, and invoke it in Claude Code.",
      heading: "Run codebase onboarding in Claude Code.",
    },
  },
  vi: {
    home: {
      title:
        "NKSkills | AI skill workflow có phiên bản cho Codex và Claude Code",
      description:
        "Kết hợp AI skills thành workflow có phiên bản và truy vết nguồn. Bắt đầu với codebase onboarding có dẫn chứng cho Codex và Claude Code.",
      heading: "Biến AI skills thành quy trình đáng tin cậy cho đội ngũ.",
    },
    solution: {
      title: "Codebase onboarding có dẫn chứng | NKSkills 1.1.0",
      description:
        "Tìm hiểu workflow codebase-onboarding, các thành phần được khóa phiên bản, điều kiện chạy, kiểm tra dẫn chứng và giới hạn xác minh hiện tại.",
      heading: "Hiểu codebase lạ bằng dẫn chứng kiểm tra được.",
    },
    "codex-guide": {
      title: "Dùng codebase onboarding trong Codex | Hướng dẫn NKSkills",
      description:
        "Build và cài NKSkills codebase-onboarding từ mã nguồn GitHub, chuẩn bị CodeGraph và rtk, rồi gọi skill trong Codex.",
      heading: "Chạy codebase onboarding trong Codex.",
    },
    "claude-guide": {
      title: "Dùng codebase onboarding trong Claude Code | Hướng dẫn NKSkills",
      description:
        "Build và cài NKSkills codebase-onboarding từ mã nguồn GitHub, chuẩn bị CodeGraph và rtk, rồi gọi skill trong Claude Code.",
      heading: "Chạy codebase onboarding trong Claude Code.",
    },
  },
};
