#!/usr/bin/env node
import { Command } from "commander";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

export function shouldRunCli(importMetaUrl: string, argv: readonly string[] | undefined = process.argv): boolean {
  const entryFile = argv?.[1];
  if (!entryFile) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(entryFile);
  } catch {
    return false;
  }
}

if (shouldRunCli(import.meta.url)) {
  void createProgram().parseAsync();
}
