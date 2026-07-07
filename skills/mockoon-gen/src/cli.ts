#!/usr/bin/env node
import { Command } from "commander";
import { MOCKGEN_VERSION } from "./index.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("mockoon-gen")
    .description("Generate frontend API contracts and mock files from reviewed OpenAPI artifacts.")
    .version(MOCKGEN_VERSION);

  program.command("init").description("Create default mockoon-gen config.").action(() => {
    console.log("mockoon-gen init is not implemented yet");
  });

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync(process.argv);
}
