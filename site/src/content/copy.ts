import type { Locale, PageKind } from "../lib/routes.js";

type Metadata = { title: string; description: string; heading: string };

export const metadata: Record<Locale, Record<PageKind, Metadata>> = {
  en: {
    home: {
      title:
        "NKSkills | Versioned AI skill workflows for Codex and Claude Code",
      description:
        "Explore traceable Solution Skills for Codex and Claude Code: the codebase-onboarding technical release and the problem-presentation evaluation candidate.",
      heading: "Many skills. One outcome.",
    },
    catalog: {
      title: "Skill catalog | NKSkills",
      description:
        "Explore NKSkills Solution Skills and pinned public Upstream Skills, including sources, versions, licenses, and release status.",
      heading: "The skills behind the workflow.",
    },
    solution: {
      title: "Codebase onboarding | NKSkills Solution Skill 1.1.0",
      description:
        "Explore the released codebase-onboarding workflow, its locked components, prerequisites, evidence gates, and current verification limits.",
      heading: "Understand an unfamiliar codebase with evidence.",
    },
    "codex-guide": {
      title: "Install and use NKSkills in Codex | NKSkills guide",
      description:
        "Build and install NKSkills Solution Skills from GitHub source, then invoke codebase onboarding or the presentation evaluation candidate in Codex.",
      heading: "Install and use NKSkills in Codex.",
    },
    "claude-guide": {
      title: "Install and use NKSkills in Claude Code | NKSkills guide",
      description:
        "Build and install NKSkills Solution Skills from GitHub source, then invoke codebase onboarding or the presentation evaluation candidate in Claude Code.",
      heading: "Install and use NKSkills in Claude Code.",
    },
  },
  vi: {
    home: {
      title:
        "NKSkills | AI skill workflow có phiên bản cho Codex và Claude Code",
      description:
        "Khám phá Solution Skills có thể truy vết nguồn cho Codex và Claude Code: codebase-onboarding bản kỹ thuật và problem-presentation đang đánh giá.",
      heading: "Nhiều skills. Một kết quả.",
    },
    catalog: {
      title: "Danh mục skill | NKSkills",
      description:
        "Khám phá Solution Skills và Upstream Skills đã khóa phiên bản của NKSkills, cùng nguồn, phiên bản, giấy phép và trạng thái phát hành.",
      heading: "Những skill đứng sau workflow.",
    },
    solution: {
      title: "Codebase onboarding có dẫn chứng | NKSkills 1.1.0",
      description:
        "Tìm hiểu workflow codebase-onboarding, các thành phần được khóa phiên bản, điều kiện chạy, kiểm tra dẫn chứng và giới hạn xác minh hiện tại.",
      heading: "Hiểu codebase lạ bằng dẫn chứng kiểm tra được.",
    },
    "codex-guide": {
      title: "Cài và dùng NKSkills trong Codex | Hướng dẫn NKSkills",
      description:
        "Build và cài NKSkills từ mã nguồn GitHub, rồi gọi codebase onboarding hoặc ứng viên problem presentation trong Codex.",
      heading: "Cài và dùng NKSkills trong Codex.",
    },
    "claude-guide": {
      title: "Cài và dùng NKSkills trong Claude Code | Hướng dẫn NKSkills",
      description:
        "Build và cài NKSkills từ mã nguồn GitHub, rồi gọi codebase onboarding hoặc ứng viên problem presentation trong Claude Code.",
      heading: "Cài và dùng NKSkills trong Claude Code.",
    },
  },
};
