export type SourceReference = { kind: "path" | "git"; value: string };

export interface CommandRunner {
  run(command: string, arguments_: string[], cwd?: string): Promise<void>;
}

export type Target = "codex" | "claude-code";

export type InstallScope = "project" | "global";
