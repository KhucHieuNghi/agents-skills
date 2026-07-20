export type SourceReference = { kind: "path" | "git"; value: string };

export type Target = "opencode" | "codex" | "claude-code" | "eve";
