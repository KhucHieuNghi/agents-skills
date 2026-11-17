# Candidate 0.1.12 upgrade and restore verification

Six isolated projects exercise upgrades from both 0.1.9 and 0.1.11 to 0.1.12,
each with Codex, Claude Code and the combined target set. No customer project is
used. This checks the final candidate bytes rather than extrapolating from the
older 0.1.8 → 0.1.9 trial.

## Reproduce

From the repository root, with the three frozen archives present under build/:

```sh
npm run build
python3 docs/research/content-search-audit-trials/upgrade-0112/verify.py
```

The runner pins and verifies each archive SHA-256 and passes its expected release
digest to the actual install/upgrade CLI. It creates a fresh temporary directory
and prints the path to its receipt. It does not overwrite this retained receipt.

## Observed results

- All six upgrades completed with the expected version, release digest and targets
  in the installation lock.
- Every installed skill file equals the extracted 0.1.12 archive. For combined
  installations both host paths resolve to the expected content.
- Modifying the installed SKILL.md first caused all six upgrades to fail with the
  expected modified-component error. Files, directories and links were unchanged
  by rejection. Restoring the original entrypoint allowed the upgrade.
- Customer-owned notes outside the skill remained byte-identical.
- Restoring each entire isolated project from its pre-upgrade backup reproduced
  its file hashes, directory inventory and symlink targets exactly.
- Original archives and all extracted release trees stayed unchanged.

The [receipt](receipt.json) retains pre/post snapshots, CLI upgrade responses,
installation locks, rejection errors and archive/runner hashes. The temporary
directory path identifies the execution, but the retained evidence does not rely
on that directory remaining available. Reproduction requires the frozen archives.

This is whole-project backup restoration in an isolated fixture. It does not
establish CLI downgrade support, live operational rollback, arbitrary crash
recovery, native host semantic behavior or commercial release acceptance.
