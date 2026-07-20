#!/usr/bin/env node
import { Command } from "commander";
import { redactSourceError } from "./source.js";
import { runApply } from "./commands/apply.js";
import { runCatalog } from "./commands/catalog.js";
import { runDoctor } from "./commands/doctor.js";
import { runPull } from "./commands/pull.js";
import { runValidate } from "./commands/validate.js";

const program = new Command();

program
  .name("agent-skills")
  .description("Apply private Agent Skills without exposing their source")
  .showHelpAfterError();

program
  .command("catalog")
  .requiredOption("--source <source>")
  .action(runCatalog);
program.command("pull").argument("<source>").action(runPull);
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
program.command("doctor").option("--source <source>").action(runDoctor);

program.parseAsync().catch((error: unknown) => {
  console.error(
    redactSourceError(error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
});
