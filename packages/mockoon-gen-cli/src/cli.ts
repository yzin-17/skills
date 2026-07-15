#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { loadOpenApi } from "@yzin/openapi-reader";
import { loadMockConfig } from "./config/load-config.js";
import { defaultMockConfig } from "./config/types.js";
import { generateMockoon } from "./generators/mockoon.js";
import { deriveWhistleRules, serializeWhistle } from "./generators/whistle.js";
import { mockArtifactFromOpenApi, refreshMockArtifactTemplates } from "./artifact/from-openapi.js";
import { readMockArtifact } from "./artifact/read-artifact.js";
import { MOCKGEN_VERSION } from "./index.js";
import { runMockPreflight } from "./preflight/run-preflight.js";
import { assertMockoonGenPath, resolveMockProjectPath } from "./utils/paths.js";
import { writeMockOutput } from "./utils/safe-write.js";

export function createProgram(): Command {
  const program = new Command().name("mockoon-gen").description("Generate Mockoon and Whistle files from reviewed mock artifacts.").version(MOCKGEN_VERSION);
  program.command("init").requiredOption("--page-dir <dir>").option("--force").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (options: { pageDir: string; force?: boolean; cwd: string }) => writeMockOutput(configPath(options.cwd, options.pageDir), pretty(defaultMockConfig), { force: options.force }));
  program.command("from-openapi").argument("<file>").requiredOption("--origin <origin>").option("--reviewed").requiredOption("--page-dir <dir>").option("--force").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (file: string, options: { origin: "generated" | "imported" | "manual"; reviewed?: boolean; pageDir: string; force?: boolean; cwd: string }) => {
    if (!["generated", "imported", "manual"].includes(options.origin)) throw new Error("--origin must be generated, imported, or manual");
    const artifactFile = artifactPath(options.cwd, options.pageDir); const openapi = await loadOpenApi(inputPath(options.cwd, file));
    if (existsSync(artifactFile)) { const existing = await readMockArtifact(artifactFile); if (existing.openapi.sha256 === openapi.sha256) return; if (!options.force) throw new Error("ARTIFACT_EXISTS_DIFFERENT: OpenAPI hash changed; use --force."); }
    const config = await loadMockConfig(configPath(options.cwd, options.pageDir));
    await writeMockOutput(artifactFile, pretty(mockArtifactFromOpenApi(openapi, { origin: options.origin, reviewed: Boolean(options.reviewed), config })), { force: options.force });
  });
  program.command("render-templates").requiredOption("--from <artifact>").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (options: { from: string; cwd: string }) => {
    const artifactFile = inputPath(options.cwd, options.from);
    const artifact = await readMockArtifact(artifactFile);
    const openapi = await loadOpenApi(inputPath(options.cwd, artifact.openapi.file));
    if (openapi.sha256 !== artifact.openapi.sha256) throw new Error("OPENAPI_HASH_MISMATCH: regenerate the artifact from OpenAPI first.");
    await writeMockOutput(artifactFile, pretty(refreshMockArtifactTemplates(artifact, openapi)), { force: true });
  });
  program.command("validate").requiredOption("--from <artifact>").option("--target <target>", "all, mockoon, or whistle", "all").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (options: { from: string; target: "all" | "mockoon" | "whistle"; cwd: string }) => {
    if (!["all", "mockoon", "whistle"].includes(options.target)) throw new Error("--target must be all, mockoon, or whistle");
    const artifact = await readMockArtifact(inputPath(options.cwd, options.from)); const openapi = await loadOpenApi(inputPath(options.cwd, artifact.openapi.file)); const result = runMockPreflight(artifact, { currentOpenApiSha256: openapi.sha256, target: options.target }); console.log(pretty(result)); if (!result.ready) throw new Error("Mock artifact is not ready.");
  });
  const exportCommand = program.command("export").argument("<target>").requiredOption("--from <artifact>").option("--format <format>").option("--force").option("--cwd <cwd>", "Working directory", process.cwd()).action(async (target: string, options: { from: string; format?: "json" | "cjs"; force?: boolean; cwd: string }) => {
    const artifactFile = inputPath(options.cwd, options.from); const artifact = await readMockArtifact(artifactFile); const openapi = await loadOpenApi(inputPath(options.cwd, artifact.openapi.file));
    if (target === "mockoon") { ready(artifact, openapi.sha256, "mockoon"); const file = join(dirname(artifactFile), "mockoon.json"); assertMockoonGenPath(file); await writeMockOutput(await resolveMockProjectPath(options.cwd, file), pretty(generateMockoon(artifact)), { force: options.force }); return; }
    if (target === "whistle") { if (options.format !== "json" && options.format !== "cjs") throw new Error("Whistle export requires --format json or cjs."); ready(artifact, openapi.sha256, "whistle"); const file = join(dirname(artifactFile), options.format === "json" ? "whistle.json" : "whistle.cjs"); assertMockoonGenPath(file); await writeMockOutput(await resolveMockProjectPath(options.cwd, file), serializeWhistle(options.format, artifact.outputs.whistle.groupName, deriveWhistleRules(artifact)), { force: options.force }); return; }
    throw new Error(`Unknown export target: ${target}`);
  });
  void exportCommand;
  const parseAsync = program.parseAsync.bind(program); program.parseAsync = ((argv?: readonly string[], options?: Parameters<Command["parseAsync"]>[1]) => parseAsync(normalizeArgv(argv, options), options)) as Command["parseAsync"];
  return program;
}
function ready(artifact: Awaited<ReturnType<typeof readMockArtifact>>, sha256: string, target: "mockoon" | "whistle"): void { const result = runMockPreflight(artifact, { currentOpenApiSha256: sha256, target }); if (!result.ready) throw new Error(pretty(result)); }
function mockDir(cwd: string, pageDir: string): string { const root = resolve(cwd); const page = isAbsolute(pageDir) ? resolve(pageDir) : resolve(root, pageDir); const path = relative(root, page); if (path.startsWith("..") || isAbsolute(path)) throw new Error("OUTPUT_PATH_OUTSIDE_PROJECT: page-dir"); return join(page, "mockoon-gen"); }
function configPath(cwd: string, pageDir: string): string { return join(mockDir(cwd, pageDir), "mockoon-gen.config.json"); }
function artifactPath(cwd: string, pageDir: string): string { return join(mockDir(cwd, pageDir), "mock-artifact.json"); }
function inputPath(cwd: string, file: string): string { return isAbsolute(file) ? file : resolve(cwd, file); }
function pretty(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }
function normalizeArgv(argv: readonly string[] | undefined, options?: Parameters<Command["parseAsync"]>[1]): readonly string[] | undefined { return options?.from === "user" && argv?.[0] === "node" && argv[1] === "mockoon-gen" ? argv.slice(2) : argv; }
export function shouldRunCli(importMetaUrl: string, argv: readonly string[] | undefined = process.argv): boolean { const entry = argv?.[1]; if (!entry) return false; try { return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(entry); } catch { return false; } }
if (shouldRunCli(import.meta.url)) void createProgram().parseAsync();
