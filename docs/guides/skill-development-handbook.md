# Skill Development Handbook

Tài liệu hướng dẫn toàn diện cho engineer mới: hiểu kiến trúc, tạo skill mới,
sử dụng bundled skills, và tuân thủ policy của hệ thống Agent Skills.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc một Skill Package](#2-kiến-trúc-một-skill-package)
3. [Quy tắc đặt tên và Validation](#3-quy-tắc-đặt-tên-và-validation)
4. [Hướng dẫn tạo Skill mới từ đầu](#4-hướng-dẫn-tạo-skill-mới-từ-đầu)
5. [Catalog và Profile System](#5-catalog-và-profile-system)
6. [Agent Configs (targets)](#6-agent-configs-targets)
7. [Bundled Skills hiện tại](#7-bundled-skills-hiện-tại)
8. [Security và Safety Policy](#8-security-và-safety-policy)
9. [Evaluation và Quality Gates](#9-evaluation-và-quality-gates)
10. [CLI Commands Reference](#10-cli-commands-reference)
11. [Workflow thực tế: Dùng AI để tạo Skill](#11-workflow-thực-tế-dùng-ai-để-tạo-skill)
12. [Checklist trước khi publish](#12-checklist-trước-khi-publish)

---

## 1. Tổng quan hệ thống

### Agent Skills là gì?

Agent Skills CLI là công cụ discover, validate, và install các "skill packages"
vào hai AI coding agents được hỗ trợ (Codex và Claude Code). Mỗi skill là một tập
hợp instructions + references + assets + scripts mà agent đọc để thực hiện một
nhiệm vụ phức tạp theo đúng contract đã định.

### Mô hình hoạt động

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ catalog.yaml│────▶│  CLI validate│────▶│ Install to agent │
│ (registry)  │     │  & stage     │     │ (skills backend) │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                                          │
       ▼                                          ▼
┌─────────────┐                          ┌─────────────────┐
│ Git source  │                          │ .agents/skills/  │
│ or local    │                          │ in target project│
└─────────────┘                          └─────────────────┘
```

1. **Catalog** định nghĩa skills + sources + profiles.
2. **CLI** validate package shape, stage source, rồi install.
3. **Agent** đọc SKILL.md + references khi user invoke skill.
4. **Scripts** chạy verification sau khi agent tạo artifacts.

### Prerequisites

- Node.js 20+
- Git (cho Git-backed sources)
- Agents: Codex hoặc Claude Code

---

## 2. Kiến trúc một Skill Package

### Cấu trúc thư mục bắt buộc

```text
skills/<skill-name>/
├── SKILL.md                    # [BẮT BUỘC] Định nghĩa skill + frontmatter
├── references/                 # [TÙY CHỌN] Contracts và rules chi tiết
│   ├── <contract-name>.md
│   └── ...
├── assets/                     # [TÙY CHỌN] Templates, CSS, HTML
│   ├── <template>.md
│   ├── <template>.yaml
│   └── <template>.html
├── scripts/                    # [TÙY CHỌN] Verification & automation scripts
│   ├── <verify-xxx>.mjs
│   └── lib/                    # Shared modules cho scripts
│       └── <module>.mjs
└── agents/                     # [TÙY CHỌN] Agent-specific configs
    ├── claude-code.yaml
    └── openai.yaml
```

### Vai trò từng thành phần

| Thành phần        | Vai trò                                                               | Ai đọc                  |
| ----------------- | --------------------------------------------------------------------- | ----------------------- |
| `SKILL.md`        | Entry point, mô tả khi nào dùng, preconditions, workflow tổng quát    | Agent + CLI validator   |
| `references/*.md` | Contracts chi tiết cho từng domain (evidence, routing, evaluation...) | Agent khi thực thi      |
| `assets/*`        | Templates chuẩn cho outputs (MD, YAML, HTML)                          | Agent khi tạo artifacts |
| `scripts/*.mjs`   | Verification scripts chạy post-generation                             | Agent gọi via shell     |
| `agents/*.yaml`   | Metadata hiển thị cho từng agent target                               | Agent UI/registry       |

### SKILL.md — Anatomy

```markdown
---
name: my-skill-name
description: Use when <trigger condition mô tả khi nào agent nên dùng skill này>.
---

# Tiêu đề Skill

<Mô tả ngắn gọn mục đích skill — 1-3 câu.>

## Preconditions

<Kiểm tra tools/state cần thiết trước khi bắt đầu.>

## Required contracts

<Liệt kê references/ cần đọc trước khi hành động.>

## Workflow

<Mô tả bước chính — agent follow theo thứ tự này.>

## Artifact generation

<Quy tắc tạo output: dùng assets nào, verify bằng scripts nào.>

## Completion report

<Agent báo cáo gì khi hoàn thành.>
```

**Quy tắc SKILL.md:**

- PHẢI bắt đầu bằng YAML frontmatter với `name` và `description`.
- `name` phải match tên thư mục chứa nó.
- `description` bắt đầu bằng "Use when..." để agent biết khi nào activate.
- Body mô tả workflow theo thứ tự agent thực hiện.
- Reference các files bằng relative path: `references/xxx.md`, `scripts/xxx.mjs`.
