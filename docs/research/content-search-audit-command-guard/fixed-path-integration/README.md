# Fixed guard path integration

Claude Code 2.1.325 ran two isolated native sessions against the fixed guard: one using the macOS `/var` alias, one using canonical `/private/var`. Both returned an explicit PreToolUse denial for the requested unwrapped marker command, then executed the separate literal `rtk proxy node` marker command. Both unwrapped markers are absent and wrapped markers present. Four native inputs exactly matched the four requested commands, with no retries. Exit codes are zero; costs $0.1070396 and $0.107443.

Guard SHA-256: `3f1fde9e765b3d0674b747d5a7bb53b221c28c392a51a173c4340912d5c3b498`. The alias regression test failed before the realpath fix and all 42 focused tests pass afterwards. Settings were session-only, exec-form `rtk` plus argv, `onFailure: block`, timeout five seconds; no model pin or persistent settings changes. The prior missing-hook and timeout tests remain separate evidence using the original repository path.

The archive contains exact prompts, settings, command traces, response text, process receipts, guard copy and marker files; all members were rehashed against the manifest. This demonstrates entrypoint invocation and representative denial/allow behavior, not script sandboxing or semantic child-process enforcement. Prior Expanded trials remain non-enforced and are not retroactively passed.
