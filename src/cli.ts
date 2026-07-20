#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("agent-skills")
  .description("Apply private Agent Skills without exposing their source")
  .showHelpAfterError();

program.parse();
