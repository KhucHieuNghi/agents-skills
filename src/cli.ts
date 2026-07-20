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

const program = new Command();

program
  .name("agent-skills")
  .description("Discover, validate, and apply curated public Agent Skills")
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

program.parseAsync().catch((error: unknown) => {
  console.error(
    redactSourceError(error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
});
