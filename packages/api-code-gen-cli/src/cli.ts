#!/usr/bin/env node
import { Command } from "commander";
import { API_CODE_GEN_VERSION } from "./index.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("api-code-gen")
    .description("Generate reviewed TypeScript API code from OpenAPI.")
    .version(API_CODE_GEN_VERSION);

  program.command("init").description("Create default api-code-gen config.");
  program.command("from-openapi").description("Create an API code artifact from reviewed OpenAPI.");
  program.command("validate").description("Validate API code artifact readiness.");
  program.command("generate").description("Generate TypeScript API code from an artifact.");

  return program;
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  void createProgram().parseAsync();
}
