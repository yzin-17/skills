import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { artifactFromOpenApi } from "../../src/artifact/from-openapi.js";
import { createProgram, shouldRunCli } from "../../src/cli.js";
import { loadOpenApi } from "@yzin/openapi-reader";

const execFile = promisify(execFileCallback);

describe("createProgram", () => {
  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("registers core commands", () => {
    const program = createProgram();
    expect(program.commands.map((command) => command.name())).toEqual([
      "init",
      "from-openapi",
      "generate",
      "export",
      "guard",
      "validate"
    ]);
  });

  it("init writes mockoon-gen.config.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    await program.parseAsync(["node", "mockoon-gen", "init", "--cwd", dir], { from: "user" });
    const config = JSON.parse(await readFile(join(dir, "mockoon-gen/mockoon-gen.config.json"), "utf8"));
    expect(config.artifactDir).toBe("mockoon-gen");
    expect(config.whistleFile).toBeNull();
  });

  it("rejects hidden or renamed artifact directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");
    const hiddenArtifactDir = [".", "mockoon-gen"].join("");

    await program.parseAsync(["node", "mockoon-gen", "init", "--cwd", dir], { from: "user" });
    await writeFile(
      join(dir, "mockoon-gen", "mockoon-gen.config.json"),
      JSON.stringify({ artifactDir: hiddenArtifactDir, whistleFile: `${hiddenArtifactDir}/whistle.cjs` }),
      "utf8"
    );
    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    await expect(
      program.parseAsync(["node", "mockoon-gen", "from-openapi", "openapi.yaml", "--cwd", dir], { from: "user" })
    ).rejects.toThrow('artifactDir must end with "mockoon-gen"');
  });

  it("init --page-dir writes page-local output defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const pageDir = "src/pages/user-detail";
    const program = createProgram();

    await program.parseAsync(["node", "mockoon-gen", "init", "--page-dir", pageDir, "--cwd", dir], {
      from: "user"
    });

    const config = JSON.parse(await readFile(join(dir, pageDir, "mockoon-gen", "mockoon-gen.config.json"), "utf8"));
    expect(config.artifactDir).toBe("src/pages/user-detail/mockoon-gen");
    expect(config.openapiFile).toBe("src/pages/user-detail/mockoon-gen/openapi.yaml");
    expect(config.whistleFile).toBeNull();
    expect(config.mockoonFile).toBe("src/pages/user-detail/mockoon-gen/mockoon.json");
    expect(config.apiOutput).toBe("src/pages/user-detail/api.generated.ts");
    await expect(stat(join(dir, "mockoon-gen.config.json"))).rejects.toThrow();
  });

  it("from-openapi uses visible mockoon-gen config paths when drafting an artifact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const openapiFile = join(dir, "openapi.yaml");
    const program = createProgram();

    await writeFile(
      join(dir, "mockoon-gen.config.json"),
      JSON.stringify(
        {
          artifactDir: "mockoon-gen",
          apiOutput: "src/generated/custom-api.ts",
          whistleFile: "mockoon-gen/whistle.cjs",
          mockoonPort: 4100,
          whistleGroupName: "User Detail Mock"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    await program.parseAsync(["node", "mockoon-gen", "from-openapi", "openapi.yaml", "--cwd", dir], { from: "user" });

    const artifact = JSON.parse(await readFile(join(dir, "mockoon-gen", "api-artifact.json"), "utf8"));
    expect(artifact.outputs.apiCode.suggestedFile).toBe("src/generated/custom-api.ts");
    expect(artifact.outputs.whistle.file).toBe("mockoon-gen/whistle.cjs");
    expect(artifact.outputs.whistle.groupName).toBe("User Detail Mock");
    expect(artifact.outputs.mockoon.file).toBe("mockoon-gen/mockoon.json");
    expect(artifact.outputs.mockoon.port).toBe(4100);
  });

  it("from-openapi rejects API output inside mockoon-gen", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      join(dir, "mockoon-gen.config.json"),
      JSON.stringify({ apiOutput: "src/pages/user-detail/mockoon-gen/api.generated.ts", whistleFile: "mockoon-gen/whistle.cjs" }),
      "utf8"
    );
    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    await expect(
      program.parseAsync(["node", "mockoon-gen", "from-openapi", "openapi.yaml", "--cwd", dir], { from: "user" })
    ).rejects.toThrow('apiOutput must not be written inside a "mockoon-gen" directory');
  });

  it("from-openapi refuses to run until Whistle import mode is confirmed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const openapiFile = join(dir, "openapi.yaml");
    const program = createProgram();

    await program.parseAsync(["node", "mockoon-gen", "init", "--cwd", dir], { from: "user" });
    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    await expect(
      program.parseAsync(["node", "mockoon-gen", "from-openapi", "openapi.yaml", "--cwd", dir], { from: "user" })
    ).rejects.toThrow("Whistle import mode");
  });

  it("from-openapi --page-dir writes artifact and derived outputs beside the page", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const pageDir = "src/pages/user-detail";
    const openapiFile = join(dir, pageDir, "mockoon-gen", "openapi.yaml");
    const program = createProgram();

    await mkdir(join(dir, pageDir, "mockoon-gen"), { recursive: true });
    await writeFile(
      join(dir, pageDir, "mockoon-gen", "mockoon-gen.config.json"),
      JSON.stringify(
        {
          artifactDir: `${pageDir}/mockoon-gen`,
          apiOutput: `${pageDir}/api.generated.ts`,
          mockoonFile: `${pageDir}/mockoon-gen/mockoon.json`,
          openapiFile: `${pageDir}/mockoon-gen/openapi.yaml`,
          whistleFile: `${pageDir}/mockoon-gen/whistle.cjs`,
          mockoonPort: 3100,
          whistleGroupName: "User Detail Mock"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    await program.parseAsync(
      ["node", "mockoon-gen", "from-openapi", `${pageDir}/mockoon-gen/openapi.yaml`, "--page-dir", pageDir, "--cwd", dir],
      { from: "user" }
    );

    const artifact = JSON.parse(await readFile(join(dir, pageDir, "mockoon-gen", "api-artifact.json"), "utf8"));
    expect(artifact.outputs.apiCode.suggestedFile).toBe("src/pages/user-detail/api.generated.ts");
    expect(artifact.outputs.whistle.file).toBe("src/pages/user-detail/mockoon-gen/whistle.cjs");
    expect(artifact.outputs.whistle.groupName).toBe("User Detail Mock");
    expect(artifact.outputs.mockoon.file).toBe("src/pages/user-detail/mockoon-gen/mockoon.json");
    expect(artifact.outputs.mockoon.port).toBe(3100);
  });

  it("generate writes API code to the artifact output path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.cjs"
    });
    artifact.outputs.apiCode.suggestedFile = "src/api/generated/from-artifact.ts";

    await writeFile(join(dir, "mockoon-gen.config.json"), JSON.stringify({ apiOutput: "src/api/generated/from-config.ts" }), "utf8");
    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await program.parseAsync(["node", "mockoon-gen", "generate", "--from", "artifact.json", "--cwd", dir], {
      from: "user"
    });

    const generated = await readFile(join(dir, "src/api/generated/from-artifact.ts"), "utf8");
    expect(generated).toContain("mockoon-gen-sha256");
    await expect(stat(join(dir, "src/api/generated/from-config.ts"))).rejects.toThrow();
  });

  it("generate rejects artifact API output inside mockoon-gen", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const artifact = artifactFromOpenApi(await loadOpenApi(openapiFile), {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.cjs"
    });
    artifact.outputs.apiCode.suggestedFile = "src/pages/user-detail/mockoon-gen/api.generated.ts";

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await expect(
      program.parseAsync(["node", "mockoon-gen", "generate", "--from", "artifact.json", "--cwd", dir], { from: "user" })
    ).rejects.toThrow('apiOutput must not be written inside a "mockoon-gen" directory');
    await expect(stat(join(dir, "src/pages/user-detail/mockoon-gen/api.generated.ts"))).rejects.toThrow();
  });

  it("generate skips API code when artifact disables it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      generateApiCode: false,
      mockoonPort: 3100
    });

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await program.parseAsync(["node", "mockoon-gen", "generate", "--from", "artifact.json", "--cwd", dir], {
      from: "user"
    });

    await expect(stat(join(dir, "src/api/generated/api.generated.ts"))).rejects.toThrow();
  });

  it("allows mock-only export when unrelated files were already dirty", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "mockoon-gen/openapi.yaml");

    await execFile("git", ["init"], { cwd: dir });
    await mkdir(join(dir, "mockoon-gen"), { recursive: true });
    await mkdir(join(dir, "src/api"), { recursive: true });
    await writeFile(openapiFile, await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"), "utf8");
    await writeFile(join(dir, "src/api/user.ts"), "export const existingApi = true;\n", "utf8");

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      generateApiCode: false,
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.cjs",
      whistleGroupName: "User Detail Mock"
    });
    artifact.outputs.whistle.routes.forEach((route) => {
      route.apiHost = "api.example.com";
    });

    await writeFile(join(dir, "mockoon-gen/api-artifact.json"), JSON.stringify(artifact, null, 2), "utf8");
    await execFile("git", ["add", "."], { cwd: dir });
    await execFile("git", ["commit", "-m", "initial"], {
      cwd: dir,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "mockoon-gen",
        GIT_AUTHOR_EMAIL: "mockoon-gen@example.test",
        GIT_COMMITTER_NAME: "mockoon-gen",
        GIT_COMMITTER_EMAIL: "mockoon-gen@example.test"
      }
    });
    await writeFile(join(dir, "src/api/user.ts"), "export const existingApi = false;\n", "utf8");

    await program.parseAsync(["node", "mockoon-gen", "export", "whistle-cli", "--from", "mockoon-gen/api-artifact.json", "--cwd", dir], {
      from: "user"
    });

    await expect(readFile(join(dir, "mockoon-gen/whistle.cjs"), "utf8")).resolves.toContain(
      "exports.groupName = \"User Detail Mock\";"
    );
  });

  it("checks mock-only changes across a full guarded workflow", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "mockoon-gen/openapi.yaml");

    await execFile("git", ["init"], { cwd: dir });
    await mkdir(join(dir, "mockoon-gen"), { recursive: true });
    await mkdir(join(dir, "src/api"), { recursive: true });
    await writeFile(openapiFile, await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"), "utf8");
    await writeFile(join(dir, "src/api/user.ts"), "export const existingApi = true;\n", "utf8");

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      generateApiCode: false,
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.cjs",
      whistleGroupName: "User Detail Mock"
    });
    artifact.outputs.whistle.routes.forEach((route) => {
      route.apiHost = "api.example.com";
    });

    await writeFile(join(dir, "mockoon-gen/api-artifact.json"), JSON.stringify(artifact, null, 2), "utf8");
    await execFile("git", ["add", "."], { cwd: dir });
    await execFile("git", ["commit", "-m", "initial"], {
      cwd: dir,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "mockoon-gen",
        GIT_AUTHOR_EMAIL: "mockoon-gen@example.test",
        GIT_COMMITTER_NAME: "mockoon-gen",
        GIT_COMMITTER_EMAIL: "mockoon-gen@example.test"
      }
    });

    await program.parseAsync(["node", "mockoon-gen", "guard", "begin", "--from", "mockoon-gen/api-artifact.json", "--cwd", dir], {
      from: "user"
    });
    await program.parseAsync(["node", "mockoon-gen", "export", "whistle-cli", "--from", "mockoon-gen/api-artifact.json", "--cwd", dir], {
      from: "user"
    });
    await writeFile(join(dir, "src/api/user.ts"), "export const existingApi = false;\n", "utf8");
    await program.parseAsync(["node", "mockoon-gen", "export", "mockoon", "--from", "mockoon-gen/api-artifact.json", "--cwd", dir], {
      from: "user"
    });

    await expect(
      program.parseAsync(["node", "mockoon-gen", "guard", "check", "--from", "mockoon-gen/api-artifact.json", "--cwd", dir], {
        from: "user"
      })
    ).rejects.toThrow("Mock-only workflow changed files outside generated mock outputs");
  });

  it("treats symlinked argv[1] as direct CLI execution", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const entryFile = join(dir, "cli-entry.mjs");
    const symlinkFile = join(dir, "mockoon-gen");

    await writeFile(entryFile, "", "utf8");
    await symlink(entryFile, symlinkFile);

    expect(shouldRunCli(pathToFileURL(entryFile).href, ["node", symlinkFile])).toBe(true);
  });

  it("skips CLI execution when argv[1] is missing", () => {
    expect(shouldRunCli(import.meta.url, ["node"])).toBe(false);
  });

  it("export whistle writes the generated rules file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100
    });
    artifact.outputs.whistle.routes.forEach((route) => {
      route.apiHost = "api.example.com";
    });
    artifact.outputs.whistle.groupName = "User Detail Mock";

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await program.parseAsync(["node", "mockoon-gen", "export", "whistle", "--from", "artifact.json", "--cwd", dir], {
      from: "user"
    });

    const exported = await readFile(join(dir, "mockoon-gen/whistle.json"), "utf8");
    const parsed = JSON.parse(exported) as Record<string, unknown>;
    expect(parsed).toEqual({
      "User Detail Mock": "^api.example.com/api/users/* http://127.0.0.1:3100/api/users/$1\n",
      "": ["User Detail Mock"]
    });
    expect(parsed).not.toHaveProperty("Default");
  });

  it("export whistle-cli writes a JS module for w2 add filepath", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100
    });
    artifact.outputs.whistle.routes.forEach((route) => {
      route.apiHost = "api.example.com";
    });
    artifact.outputs.whistle.groupName = "User Detail Mock";
    artifact.outputs.whistle.file = "mockoon-gen/whistle.cjs";

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await program.parseAsync(["node", "mockoon-gen", "export", "whistle-cli", "--from", "artifact.json", "--cwd", dir], {
      from: "user"
    });

    const exported = await readFile(join(dir, "mockoon-gen/whistle.cjs"), "utf8");
    expect(exported).toBe(`exports.groupName = "User Detail Mock";
exports.name = "User Detail Mock";
exports.rules = \`^api.example.com/api/users/* http://127.0.0.1:3100/api/users/$1
\`;
`);
    expect(logSpy.mock.calls.map(([line]) => line)).toEqual([
      `w2 add ${join(dir, "mockoon-gen/whistle.cjs")}`,
      `mockoon-cli start --data ${join(dir, "mockoon-gen/mockoon.json")}`
    ]);
  });

  it("export whistle-cli refuses to write JavaScript into a JSON file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.json",
      whistleGroupName: "User Detail Mock"
    });
    artifact.outputs.whistle.routes.forEach((route) => {
      route.apiHost = "api.example.com";
    });

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await expect(
      program.parseAsync(["node", "mockoon-gen", "export", "whistle-cli", "--from", "artifact.json", "--cwd", dir], {
        from: "user"
      })
    ).rejects.toThrow("whistle.cjs");
  });

  it("validate --strict sets exitCode when review items need confirmation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100
    });
    artifact.endpoints[0]?.vo.fields.splice(0, 1, {
      ...artifact.endpoints[0].vo.fields[0],
      confidence: "low"
    });

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await program.parseAsync(
      ["node", "mockoon-gen", "validate", "--strict", "--from", "artifact.json", "--openapi", "openapi.yaml", "--cwd", dir],
      { from: "user" }
    );

    expect(process.exitCode).toBe(1);
    expect(logSpy).toHaveBeenCalledOnce();
  });

  it("validate clears a stale exitCode after a later successful run in the same process", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    const openapiFile = join(dir, "openapi.yaml");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await writeFile(
      openapiFile,
      await readFile(join(process.cwd(), "tests/fixtures/openapi.user.yaml"), "utf8"),
      "utf8"
    );

    const loaded = await loadOpenApi(openapiFile);
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100
    });
    artifact.endpoints[0]?.vo.fields.splice(0, 1, {
      ...artifact.endpoints[0].vo.fields[0],
      confidence: "low"
    });

    await writeFile(join(dir, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");

    await program.parseAsync(
      ["node", "mockoon-gen", "validate", "--strict", "--from", "artifact.json", "--openapi", "openapi.yaml", "--cwd", dir],
      { from: "user" }
    );
    expect(process.exitCode).toBe(1);

    await createProgram().parseAsync(
      ["node", "mockoon-gen", "validate", "--from", "artifact.json", "--openapi", "openapi.yaml", "--cwd", dir],
      { from: "user" }
    );

    expect(process.exitCode).toBeUndefined();
    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});
