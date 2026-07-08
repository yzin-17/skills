import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { artifactFromOpenApi } from "../../src/artifact/from-openapi.js";
import { createProgram } from "../../src/cli.js";
import { loadOpenApi } from "../../src/openapi/load-openapi.js";

describe("createProgram", () => {
  it("registers core commands", () => {
    const program = createProgram();
    expect(program.commands.map((command) => command.name())).toEqual([
      "init",
      "from-openapi",
      "generate",
      "export",
      "validate"
    ]);
  });

  it("init writes mockoon-gen.config.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const program = createProgram();
    await program.parseAsync(["node", "mockoon-gen", "init", "--cwd", dir], { from: "user" });
    const config = JSON.parse(await readFile(join(dir, "mockoon-gen.config.json"), "utf8"));
    expect(config.artifactDir).toBe(".mockoon-gen");
  });

  it("from-openapi uses config defaults when drafting an artifact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const openapiFile = join(dir, "openapi.yaml");
    const program = createProgram();

    await writeFile(
      join(dir, "mockoon-gen.config.json"),
      JSON.stringify(
        {
          artifactDir: ".drafts",
          apiOutput: "src/generated/custom-api.ts",
          mockoonPort: 4100
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

    const artifact = JSON.parse(await readFile(join(dir, ".drafts", "api-artifact.json"), "utf8"));
    expect(artifact.outputs.apiCode.suggestedFile).toBe("src/generated/custom-api.ts");
    expect(artifact.outputs.whistle.file).toBe(".drafts/whistle.txt");
    expect(artifact.outputs.mockoon.file).toBe(".drafts/mockoon.json");
    expect(artifact.outputs.mockoon.port).toBe(4100);
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
      artifactDir: ".mockoon-gen",
      apiOutput: "src/api/generated/from-config.ts",
      mockoonPort: 3100
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
});
