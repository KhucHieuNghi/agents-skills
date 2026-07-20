export type SourceReference = { kind: "path" | "git"; value: string };

export interface CommandRunner {
  run(command: string, arguments_: string[], cwd?: string): Promise<void>;
}

export type Target = "opencode" | "codex" | "claude-code" | "eve";

export type InstallScope = "project" | "global";
