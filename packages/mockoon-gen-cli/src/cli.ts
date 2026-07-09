#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
    .description("Export whistle.json, whistle.js, or mockoon.json.")
    .argument("<target>", "whistle, whistle-cli, or mockoon")
    .requiredOption("--from <artifact>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (target: string, options: { from: string; cwd: string }) => {
      const artifact = await readArtifact(resolveFromCwd(options.cwd, options.from));

      if (target === "whistle") {
        const outputFile = artifact.outputs.whistle.file || defaultConfig.whistleFile;
        assertWhistleFileSuffix(target, outputFile);
        await writeTextFile(
          join(options.cwd, outputFile),
          generateWhistleRules(artifact.outputs.whistle.routes, artifact.outputs.whistle.groupName)
        );
        return;
      }

      if (target === "whistle-cli") {
        const outputFile = artifact.outputs.whistle.file || defaultConfig.whistleFile;
        assertWhistleFileSuffix(target, outputFile);
        await writeTextFile(
          join(options.cwd, outputFile),
          generateWhistleCliModule(artifact.outputs.whistle.routes, artifact.outputs.whistle.groupName)
        );
        return;
      }

      if (target === "mockoon") {
        await writeTextFile(
          join(options.cwd, artifact.outputs.mockoon.file || defaultConfig.mockoonFile),
          prettyJson(generateMockoonEnvironment(artifact))
        );
        return;
      }

      throw new Error(`Unknown export target: ${target}`);
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
    whistleFile: config.whistleFile === defaultConfig.whistleFile ? joinPortable(artifactDir, "whistle.json") : config.whistleFile,
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

  if (target === "whistle-cli" && !file.endsWith(".js")) {
    throw new Error(`Cannot export whistle-cli JS to ${file}. Set whistleFile to a whistle.js path or run export whistle.`);
  }
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
