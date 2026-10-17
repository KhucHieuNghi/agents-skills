export type SourceReference =
  | { kind: "path"; value: string }
  | { kind: "git"; value: string; revision?: string };

export interface CommandRunner {
  run(command: string, arguments_: string[], cwd?: string): Promise<void>;
}

export type Target = "codex" | "claude-code";

export type InstallScope = "project" | "global";
