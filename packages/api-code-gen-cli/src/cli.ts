#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { artifactFromOpenApi } from "./artifact/from-openapi.js";
import { readArtifact } from "./artifact/read-artifact.js";
import { loadConfig } from "./config/load-config.js";
import { defaultConfig } from "./config/types.js";
import { generateOutputFiles } from "./generators/output-files.js";
import { API_CODE_GEN_VERSION } from "./index.js";
import { loadOpenApi } from "@yzin/openapi-reader";
import { runPreflight } from "./preflight/run-preflight.js";
import { prettyJson } from "./utils/fs.js";
import { resolveProjectPath } from "./utils/paths.js";
import { writeGeneratedFiles } from "./utils/safe-write.js";

export function createProgram(): Command {
  const program = new Command().name("api-code-gen").description("Generate reviewed TypeScript API code from OpenAPI.").version(API_CODE_GEN_VERSION);

  program.command("init").requiredOption("--page-dir <dir>").option("--force").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (options: { pageDir: string; force?: boolean; cwd: string }) => {
    const file = configPath(options.cwd, options.pageDir);
    await safeSingleWrite(file, prettyJson(defaultConfig), options.force);
  });

  program.command("from-openapi").argument("<file>").requiredOption("--origin <origin>").requiredOption("--reviewed").requiredOption("--page-dir <dir>").option("--force").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (file: string, options: { origin: "imported" | "manual"; reviewed: boolean; pageDir: string; force?: boolean; cwd: string }) => {
    if (options.origin !== "imported" && options.origin !== "manual") throw new Error("--origin must be imported or manual");
    if (!options.reviewed) throw new Error("--reviewed is required for api-code-gen");
    const openapi = await loadOpenApi(resolveInput(options.cwd, file));
    const artifactFile = artifactPath(options.cwd, options.pageDir);
    if (existsSync(artifactFile)) {
      const existing = await readArtifact(artifactFile);
      if (existing.openapi.sha256 === openapi.sha256) return;
      if (!options.force) throw new Error("ARTIFACT_EXISTS_DIFFERENT: OpenAPI hash changed; use --force to replace the artifact.");
    }
    const config = await loadConfig(configPath(options.cwd, options.pageDir));
    await safeSingleWrite(artifactFile, prettyJson(artifactFromOpenApi(openapi, { origin: options.origin, reviewed: true, config })), options.force);
  });

  program.command("validate").requiredOption("--from <artifact>").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (options: { from: string; cwd: string }) => {
    const artifact = await readArtifact(resolveInput(options.cwd, options.from));
    const openapi = await loadOpenApi(resolveInput(options.cwd, artifact.openapi.file));
    const result = runPreflight(artifact, { currentOpenApiSha256: openapi.sha256, projectDir: options.cwd, openapiDocument: openapi.document });
    console.log(prettyJson(result));
    if (!result.ready) throw new Error("API code artifact is not ready.");
  });

  program.command("generate").requiredOption("--from <artifact>").option("--force").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (options: { from: string; force?: boolean; cwd: string }) => {
    const artifact = await readArtifact(resolveInput(options.cwd, options.from));
    const openapi = await loadOpenApi(resolveInput(options.cwd, artifact.openapi.file));
    const result = runPreflight(artifact, { currentOpenApiSha256: openapi.sha256, projectDir: options.cwd, openapiDocument: openapi.document });
    if (!result.ready) { console.log(prettyJson(result)); throw new Error("API code artifact is not ready."); }
    const files = generateOutputFiles(artifact);
    const absoluteFiles = new Map<string, string>();
    for (const [file, contents] of files) absoluteFiles.set(await resolveProjectPath(options.cwd, file), contents);
    await writeGeneratedFiles(absoluteFiles, { force: options.force });
  });

  const parseAsync = program.parseAsync.bind(program);
  program.parseAsync = ((argv?: readonly string[], parseOptions?: Parameters<Command["parseAsync"]>[1]) =>
    parseAsync(normalizeArgv(argv, parseOptions), parseOptions)) as Command["parseAsync"];
  return program;
}

export function shouldRunCli(importMetaUrl: string, argv: readonly string[] | undefined = process.argv): boolean {
  const entryFile = argv?.[1];
  if (!entryFile) return false;
  try { return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(entryFile); } catch { return false; }
}

function configPath(cwd: string, pageDir: string): string { return apiDirectory(cwd, pageDir, "api-code-gen.config.json"); }
function artifactPath(cwd: string, pageDir: string): string { return apiDirectory(cwd, pageDir, "api-code-artifact.json"); }
function apiDirectory(cwd: string, pageDir: string, file: string): string {
  const base = resolve(cwd); const page = isAbsolute(pageDir) ? resolve(pageDir) : resolve(base, pageDir); const path = relative(base, page);
  if (path.startsWith("..") || isAbsolute(path)) throw new Error("OUTPUT_PATH_OUTSIDE_PROJECT: page-dir");
  return join(page, "api-code-gen", file);
}
function resolveInput(cwd: string, file: string): string { return isAbsolute(file) ? file : resolve(cwd, file); }
async function safeSingleWrite(file: string, content: string, force?: boolean): Promise<void> { await writeGeneratedFiles(new Map([[file, content]]), { force }); }
function normalizeArgv(argv: readonly string[] | undefined, parseOptions?: Parameters<Command["parseAsync"]>[1]): readonly string[] | undefined {
  return parseOptions?.from === "user" && argv?.[0] === "node" && argv[1] === "api-code-gen" ? argv.slice(2) : argv;
}

if (shouldRunCli(import.meta.url)) void createProgram().parseAsync();
