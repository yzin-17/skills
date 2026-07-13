#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Command } from "commander";
import { artifactFromOpenApi } from "./artifact/from-openapi.js";
import { artifactSchema } from "./artifact/schema.js";
import type { ApiArtifact } from "./artifact/types.js";
import { validateArtifact } from "./artifact/validate.js";
import { loadConfig } from "./config/load-config.js";
import { defaultConfig } from "./config/types.js";
import { generateApiCode } from "./generators/api-code.js";
import { generateMockoonEnvironment } from "./generators/mockoon.js";
import { generateWhistleCliModule, generateWhistleRules } from "./generators/whistle.js";
import { MOCKGEN_VERSION } from "./index.js";
import { loadOpenApi } from "./openapi/load-openapi.js";
import { prettyJson, writeTextFile } from "./utils/fs.js";

const execFile = promisify(execFileCallback);

let validateCommandSetExitCode = false;

export function createProgram(): Command {
  const program = new Command();

  program
    .name("mockoon-gen")
    .description("Generate frontend API contracts and mock files from reviewed OpenAPI artifacts.")
    .version(MOCKGEN_VERSION);

  program
    .command("init")
    .description("Create default mockoon-gen config.")
    .option("--page-dir <dir>", "Page, route, view, or feature directory for generated mock files")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (options: { pageDir?: string; cwd: string }) => {
      await writeTextFile(
        configFilePath(options.cwd, options.pageDir),
        prettyJson(configWithPageDir(defaultConfig, options.pageDir, options.cwd))
      );
    });

  program
    .command("from-openapi")
    .description("Create api-artifact.json from reviewed OpenAPI.")
    .argument("<file>")
    .option("--page-dir <dir>", "Page, route, view, or feature directory for generated mock files")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (file: string, options: { pageDir?: string; cwd: string }) => {
      const config = configWithPageDir(
        await loadConfig(resolveConfigPath(options.cwd, options.pageDir)),
        options.pageDir,
        options.cwd
      );
      assertWhistleImportModeConfirmed(config.whistleFile);
      const openapi = await loadOpenApi(resolveFromCwd(options.cwd, file));
      const artifact = artifactFromOpenApi(openapi, {
        artifactDir: config.artifactDir,
        apiOutput: config.apiOutput,
        generateApiCode: config.generateApiCode,
        mockoonPort: config.mockoonPort,
        whistleFile: config.whistleFile,
        whistleGroupName: config.whistleGroupName
      });

      await writeTextFile(join(options.cwd, config.artifactDir, "api-artifact.json"), prettyJson(artifact));
    });

  program
    .command("generate")
    .description("Generate TypeScript API code from artifact.")
    .requiredOption("--from <artifact>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (options: { from: string; cwd: string }) => {
      const config = await loadConfig(resolveConfigPath(options.cwd));
      const artifact = await readArtifact(resolveFromCwd(options.cwd, options.from));
      if (!artifact.outputs.apiCode.enabled) {
        return;
      }
      const targetFile = artifact.outputs.apiCode.suggestedFile || config.apiOutput;

      await writeTextFile(join(options.cwd, targetFile), generateApiCode(artifact));
    });

  program
    .command("export")
    .description("Export whistle.json, whistle.cjs, or mockoon.json.")
    .argument("<target>", "whistle, whistle-cli, or mockoon")
    .requiredOption("--from <artifact>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (target: string, options: { from: string; cwd: string }) => {
      const artifactFile = resolveFromCwd(options.cwd, options.from);
      const artifact = await readArtifact(artifactFile);

      if (target === "whistle") {
        const outputFile = artifact.outputs.whistle.file || defaultConfig.whistleFile;
        assertWhistleImportModeConfirmed(outputFile);
        assertVisibleMockOutputPath(outputFile, "Whistle");
        assertWhistleFileSuffix(target, outputFile);
        await writeTextFile(
          join(options.cwd, outputFile),
          generateWhistleRules(artifact.outputs.whistle.routes, artifact.outputs.whistle.groupName)
        );
        return;
      }

      if (target === "whistle-cli") {
        const outputFile = artifact.outputs.whistle.file || defaultConfig.whistleFile;
        assertWhistleImportModeConfirmed(outputFile);
        assertVisibleMockOutputPath(outputFile, "Whistle");
        assertWhistleFileSuffix(target, outputFile);
        await writeTextFile(
          join(options.cwd, outputFile),
          generateWhistleCliModule(artifact.outputs.whistle.routes, artifact.outputs.whistle.groupName)
        );
        printCliImportCommands(options.cwd, artifact, outputFile);
        return;
      }

      if (target === "mockoon") {
        const outputFile = artifact.outputs.mockoon.file || defaultConfig.mockoonFile;
        assertVisibleMockOutputPath(outputFile, "Mockoon");
        await writeTextFile(join(options.cwd, outputFile), prettyJson(generateMockoonEnvironment(artifact)));
        return;
      }

      throw new Error(`Unknown export target: ${target}`);
    });

  program
    .command("guard")
    .description("Snapshot or check Git changes for a mock-only workflow.")
    .argument("<action>", "begin or check")
    .requiredOption("--from <artifact>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (action: string, options: { from: string; cwd: string }) => {
      const artifactFile = resolveFromCwd(options.cwd, options.from);
      const artifact = await readArtifact(artifactFile);
      if (artifact.outputs.apiCode.enabled) {
        return;
      }

      if (action === "begin") {
        await beginMockOnlyGuard(options.cwd, artifact);
        return;
      }

      if (action === "check") {
        await checkMockOnlyGuard(options.cwd, artifact);
        return;
      }

      throw new Error(`Unknown guard action: ${action}`);
    });

  program
    .command("validate")
    .description("Validate artifact review gates.")
    .requiredOption("--from <artifact>")
    .option("--openapi <file>")
    .option("--strict", "Fail on needsReview")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (options: { from: string; openapi?: string; strict?: boolean; cwd: string }) => {
      if (validateCommandSetExitCode && process.exitCode === 1) {
        process.exitCode = undefined;
      }
      validateCommandSetExitCode = false;

      const artifact = await readArtifact(resolveFromCwd(options.cwd, options.from));
      const openapiPath = options.openapi ?? artifact.openapi.file;
      const openapi = await loadOpenApi(resolveFromCwd(options.cwd, openapiPath));
      const result = validateArtifact(artifact, {
        strict: Boolean(options.strict),
        currentOpenApiSha256: openapi.sha256
      });

      console.log(prettyJson(result));

      if (result.fatal.length > 0 || (options.strict && result.needsReview.length > 0)) {
        process.exitCode = 1;
        validateCommandSetExitCode = true;
      }
    });

  const parseAsync = program.parseAsync.bind(program);
  program.parseAsync = ((argv?: readonly string[], parseOptions?: Parameters<Command["parseAsync"]>[1]) =>
    parseAsync(normalizeArgv(argv, parseOptions), parseOptions)) as Command["parseAsync"];

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

async function readArtifact(file: string): Promise<ApiArtifact> {
  return artifactSchema.parse(JSON.parse(await readFile(file, "utf8"))) as unknown as ApiArtifact;
}

function resolveFromCwd(cwd: string, file: string): string {
  return isAbsolute(file) ? file : resolve(cwd, file);
}

function configWithPageDir<T extends typeof defaultConfig>(config: T, pageDir: string | undefined, cwd: string): T {
  if (!pageDir) {
    return config;
  }

  const normalizedPageDir = normalizePageDir(pageDir, cwd);
  const artifactDir = joinPortable(normalizedPageDir, defaultConfig.artifactDir);

  return {
    ...config,
    artifactDir: config.artifactDir === defaultConfig.artifactDir ? artifactDir : config.artifactDir,
    openapiFile:
      config.openapiFile === defaultConfig.openapiFile ? joinPortable(artifactDir, "openapi.yaml") : config.openapiFile,
    mockoonFile: config.mockoonFile === defaultConfig.mockoonFile ? joinPortable(artifactDir, "mockoon.json") : config.mockoonFile,
    whistleFile: pageLocalWhistleFile(config.whistleFile, artifactDir),
    apiOutput: config.apiOutput === defaultConfig.apiOutput ? joinPortable(normalizedPageDir, "api.generated.ts") : config.apiOutput
  };
}

function normalizePageDir(pageDir: string, cwd: string): string {
  const relativePageDir = isAbsolute(pageDir) ? relative(cwd, pageDir) : pageDir;
  const normalized = relativePageDir.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized === "" ? "." : normalized;
}

function joinPortable(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/").replace(/^\.\//, "");
}

function pageLocalWhistleFile(file: string | null, artifactDir: string): string | null {
  if (file === null) {
    return null;
  }

  if (file === "mockoon-gen/whistle.json") {
    return joinPortable(artifactDir, "whistle.json");
  }

  if (file === "mockoon-gen/whistle.cjs") {
    return joinPortable(artifactDir, "whistle.cjs");
  }

  return file;
}

function configFilePath(cwd: string, pageDir?: string): string {
  if (!pageDir) {
    return join(cwd, defaultConfig.artifactDir, "mockoon-gen.config.json");
  }

  return join(cwd, normalizePageDir(pageDir, cwd), defaultConfig.artifactDir, "mockoon-gen.config.json");
}

function legacyConfigFilePath(cwd: string, pageDir?: string): string {
  if (!pageDir) {
    return join(cwd, "mockoon-gen.config.json");
  }

  return join(cwd, normalizePageDir(pageDir, cwd), "mockoon-gen.config.json");
}

function resolveConfigPath(cwd: string, pageDir?: string): string {
  const currentPath = configFilePath(cwd, pageDir);
  if (existsSync(currentPath)) {
    return currentPath;
  }

  const legacyPath = legacyConfigFilePath(cwd, pageDir);
  return existsSync(legacyPath) ? legacyPath : currentPath;
}

function assertWhistleFileSuffix(target: "whistle" | "whistle-cli", file: string): void {
  if (target === "whistle" && !file.endsWith(".json")) {
    throw new Error(`Cannot export whistle JSON to ${file}. Set whistleFile to a .json path or run export whistle-cli.`);
  }

  if (target === "whistle-cli" && !file.endsWith(".cjs")) {
    throw new Error(`Cannot export whistle-cli CJS to ${file}. Set whistleFile to a whistle.cjs path or run export whistle.`);
  }
}

function assertVisibleMockOutputPath(file: string, outputName: string): void {
  const normalized = file.replace(/\\/g, "/").replace(/\/+$/, "");
  const parentDirectory = normalized.split("/").at(-2);

  if (parentDirectory !== "mockoon-gen") {
    throw new Error(
      `${outputName} output must be written directly under a visible \"mockoon-gen\" directory; received: ${file}`
    );
  }
}

function assertWhistleImportModeConfirmed(file: string | null): asserts file is string {
  if (!file) {
    throw new Error(
      "Whistle import mode is not confirmed. Ask the user to choose GUI JSON or CLI CJS, then set whistleFile to mockoon-gen/whistle.json or mockoon-gen/whistle.cjs."
    );
  }

  if (!file.endsWith(".json") && !file.endsWith(".cjs")) {
    throw new Error("Whistle import mode is not confirmed. whistleFile must end with .json for GUI import or .cjs for CLI import.");
  }
}

function printCliImportCommands(cwd: string, artifact: ApiArtifact, whistleFile: string): void {
  console.log(`w2 add ${resolveFromCwd(cwd, whistleFile)}`);
  console.log(`mockoon-cli start --data ${resolveFromCwd(cwd, artifact.outputs.mockoon.file || defaultConfig.mockoonFile)}`);
}

async function beginMockOnlyGuard(cwd: string, artifact: ApiArtifact): Promise<void> {
  const before = await captureGitChangedPaths(cwd);
  if (!before) {
    return;
  }

  await writeGuardSnapshot(cwd, {
    changed: [...before],
    allowedOutputs: mockOnlyOutputFiles(cwd, artifact)
  });
}

async function checkMockOnlyGuard(cwd: string, artifact: ApiArtifact): Promise<void> {
  const before = await readGuardSnapshot(cwd);
  if (!before) {
    return;
  }

  const after = await captureGitChangedPaths(cwd);

  if (!after) {
    return;
  }

  const allowed = new Set(before.allowedOutputs.length > 0 ? before.allowedOutputs : mockOnlyOutputFiles(cwd, artifact));
  const changedByExport = [...after].filter(([file, state]) => before.changed.get(file) !== state).map(([file]) => file);
  const unexpected = changedByExport.filter((file) => !allowed.has(file));

  if (unexpected.length > 0) {
    throw new Error(
      [
        "Mock-only workflow changed files outside generated mock outputs.",
        "When outputs.apiCode.enabled is false, the mockoon-gen workflow may only write Whistle and Mockoon config files.",
        `Allowed output: ${[...allowed].join(", ")}`,
        `Unexpected files: ${unexpected.join(", ")}`
      ].join(" ")
    );
  }

  await removeGuardSnapshot(cwd);
}

async function captureGitChangedPaths(cwd: string): Promise<Map<string, string> | null> {
  const repoRoot = await gitRepoRoot(cwd);
  if (!repoRoot) {
    return null;
  }

  const files = await changedGitPaths(cwd, repoRoot);
  return new Map(await Promise.all(files.map(async (file) => [file, await fileState(file)] as const)));
}

async function gitRepoRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFile("git", ["-C", cwd, "rev-parse", "--show-toplevel"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function changedGitPaths(cwd: string, repoRoot: string): Promise<string[]> {
  const outputs = await Promise.all([
    gitLines(cwd, ["diff", "--name-only", "--"]),
    gitLines(cwd, ["diff", "--cached", "--name-only", "--"]),
    gitLines(cwd, ["ls-files", "--others", "--exclude-standard", "--"])
  ]);

  return [...new Set(outputs.flat().map((file) => normalizeAbsolutePath(resolve(repoRoot, file))))];
}

async function gitLines(cwd: string, args: string[]): Promise<string[]> {
  const { stdout } = await execFile("git", ["-C", cwd, ...args]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fileState(file: string): Promise<string> {
  try {
    return createHash("sha256").update(await readFile(file)).digest("hex");
  } catch {
    return "missing";
  }
}

function normalizeAbsolutePath(file: string): string {
  return resolve(file).replace(/\\/g, "/");
}

function resolveFromRealCwd(cwd: string, file: string): string {
  return isAbsolute(file) ? file : resolve(realpathSync(cwd), file);
}

interface GuardSnapshotFile {
  changed: [string, string][];
  allowedOutputs: string[];
}

interface GuardSnapshot {
  changed: Map<string, string>;
  allowedOutputs: string[];
}

function mockOnlyOutputFiles(cwd: string, artifact: ApiArtifact): string[] {
  return [
    artifact.outputs.whistle.file || defaultConfig.whistleFile,
    artifact.outputs.mockoon.file || defaultConfig.mockoonFile
  ]
    .filter((file): file is string => Boolean(file))
    .map((file) => normalizeAbsolutePath(resolveFromRealCwd(cwd, file)));
}

async function writeGuardSnapshot(cwd: string, snapshot: GuardSnapshotFile): Promise<void> {
  const file = guardSnapshotPath(cwd);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(snapshot), "utf8");
}

async function readGuardSnapshot(cwd: string): Promise<GuardSnapshot | null> {
  try {
    const snapshot = JSON.parse(await readFile(guardSnapshotPath(cwd), "utf8")) as GuardSnapshotFile;
    return {
      changed: new Map(snapshot.changed),
      allowedOutputs: snapshot.allowedOutputs
    };
  } catch {
    return null;
  }
}

async function removeGuardSnapshot(cwd: string): Promise<void> {
  try {
    await unlink(guardSnapshotPath(cwd));
  } catch {
    // Snapshot cleanup is best-effort; a stale snapshot is overwritten by the next begin.
  }
}

function guardSnapshotPath(cwd: string): string {
  const id = createHash("sha256").update(realpathSync(cwd)).digest("hex");
  return join(tmpdir(), "mockoon-gen", `${id}.mock-only-guard.json`);
}

function normalizeArgv(
  argv: readonly string[] | undefined,
  parseOptions?: Parameters<Command["parseAsync"]>[1]
): readonly string[] | undefined {
  if (parseOptions?.from !== "user" || !argv || argv.length < 2) {
    return argv;
  }

  if (argv[0] === "node" && argv[1] === "mockoon-gen") {
    return argv.slice(2);
  }

  return argv;
}

if (shouldRunCli(import.meta.url, process.argv)) {
  await createProgram().parseAsync(process.argv);
}
