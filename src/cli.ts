#!/usr/bin/env node
import { Command } from "commander";
import { redactSourceError } from "./source.js";
import { runApply } from "./commands/apply.js";
import { runApplyProfile } from "./commands/apply-profile.js";
import { runCatalog } from "./commands/catalog.js";
import { runDoctor } from "./commands/doctor.js";
import { runPull } from "./commands/pull.js";
import { runRecommend } from "./commands/recommend.js";
import { runValidate } from "./commands/validate.js";
import { runBuildSolution } from "./commands/build-solution.js";
import {
  runInstallSolution,
  runUpgradeSolution,
} from "./commands/install-solution.js";
import { runCheckUpstreams } from "./commands/check-upstreams.js";

const program = new Command();

program
  .name("agent-skills")
  .description(
    "Discover, validate, and install skills for Codex and Claude Code",
  )
  .showHelpAfterError();

program
  .command("catalog")
  .requiredOption("--source <source>")
  .action(runCatalog);
program.command("pull").argument("<source>").action(runPull);
program
  .command("recommend")
  .option("--catalog <file>", "Override the default ./catalog.yaml")
  .requiredOption("--intent <intent>")
  .option("--json", "Print machine-readable recommendations")
  .action(runRecommend);
program
  .command("validate")
  .argument("[skill]")
  .requiredOption("--source <source>")
  .action(runValidate);
program
  .command("apply")
  .argument("<skill>")
  .requiredOption("--source <source>")
  .requiredOption("--target <targets>")
  .option("--scope <scope>", "project")
  .action(runApply);
program
  .command("apply-profile")
  .argument("<profile>")
  .option("--catalog <file>", "Override the default ./catalog.yaml")
  .requiredOption("--target <targets>")
  .option("--scope <scope>", "project")
  .action(runApplyProfile);
program.command("doctor").option("--source <source>").action(runDoctor);
program
  .command("check-upstreams")
  .option("--catalog <file>", "Catalog with pinned upstream records")
  .option(
    "--fail-on-update",
    "Exit with status 2 when a newer upstream HEAD exists",
  )
  .action(runCheckUpstreams);
program
  .command("build-solution")
  .argument("<id>")
  .option("--catalog <file>", "Catalog with indexed solution")
  .requiredOption("--output <directory>", "New release directory")
  .action(runBuildSolution);
program
  .command("install-solution")
  .requiredOption("--release <directory>", "Self-contained solution release")
  .requiredOption("--digest <sha256>", "Expected release fingerprint")
  .option("--project <directory>", "Target project directory")
  .requiredOption("--target <targets>", "codex, claude-code, or both")
  .action(runInstallSolution);
program
  .command("upgrade-solution")
  .requiredOption("--release <directory>", "New solution release")
  .requiredOption("--digest <sha256>", "Expected release fingerprint")
  .option("--project <directory>", "Target project directory")
  .requiredOption("--target <targets>", "Existing Codex/Claude target set")
  .action(runUpgradeSolution);

program.parseAsync().catch((error: unknown) => {
  console.error(
    redactSourceError(error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
});
