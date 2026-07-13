import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadOpenApi } from "../../src/openapi/load-openapi.js";
import { artifactFromOpenApi } from "../../src/artifact/from-openapi.js";

describe("artifactFromOpenApi", () => {
  it("creates endpoint, route, DTO, VO, mapper, and mock draft", async () => {
    const loaded = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      mockoonPort: 3100
    });

    expect(artifact.schemaVersion).toBe("0.2.0");
    expect(artifact.openapi.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.endpoints[0]?.id).toBe("ep-get-user");
    expect(artifact.endpoints[0]?.dto.response).toBe("GetUserResponseDTO");
    expect(artifact.endpoints[0]?.vo.name).toBe("GetUserVO");
    expect(artifact.endpoints[0]?.mapper.steps[0]?.operation).toBe("rename");
    expect(artifact.endpoints[0]?.mock.selection.defaultScenario).toBe("success-default");
    expect(artifact.endpoints[0]?.mock.scenarios.map((scenario) => scenario.name)).toEqual([
      "success-default",
      "success-empty",
      "error-default"
    ]);
    expect(artifact.endpoints[0]?.mock.scenarios.find((scenario) => scenario.name === "error-default")?.statusCode).toBe(500);
    expect(artifact.outputs.whistle.groupName).toBeNull();
    expect(artifact.outputs.whistle.routes[0]?.endpointId).toBe("ep-get-user");
    expect(artifact.outputs.whistle.routes[0]?.sourcePattern).toBe("/api/users/*");
    expect(artifact.outputs.whistle.routes[0]?.targetPath).toBe("/api/users/$1");
  });

  it("creates a 20 item Faker scenario for list endpoints", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const file = join(dir, "list-openapi.yaml");

    try {
      await writeFile(
        file,
        [
          "openapi: 3.0.3",
          "info:",
          "  title: List API",
          "  version: 1.0.0",
          "paths:",
          "  /api/users:",
          "    get:",
          "      operationId: listUsers",
          "      responses:",
          "        '200':",
          "          description: ok",
          "          content:",
          "            application/json:",
          "              schema:",
          "                type: object",
          "                properties:",
          "                  items:",
          "                    type: array",
          "                    items:",
          "                      type: object",
          "                      properties:",
          "                        id:",
          "                          type: integer",
          "                        name:",
          "                          type: string"
        ].join("\n"),
        "utf8"
      );

      const loaded = await loadOpenApi(file);
      const artifact = artifactFromOpenApi(loaded, {
        artifactDir: "mockoon-gen",
        apiOutput: "src/api/generated/api.generated.ts",
        mockoonPort: 3100
      });

      const listScenario = artifact.endpoints[0]?.mock.scenarios.find((scenario) => scenario.name === "success-list-20");

      expect(listScenario?.statusCode).toBe(200);
      expect(listScenario?.bodyTemplate).toContain("{{#repeat 20}}");
      expect(listScenario?.bodyTemplate).toContain("{{faker 'number.int'}}");
      expect(listScenario?.bodyTemplate).toContain("{{faker 'string.sample'}}");
      expect(listScenario?.bodyTemplate).toContain('"items"');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("copies an LLM or human confirmed whistle group name from options", async () => {
    const loaded = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.json",
      whistleGroupName: "User Detail Mock"
    });

    expect(artifact.outputs.whistle.groupName).toBe("User Detail Mock");
  });

  it("uses the configured whistle file path in artifact outputs", async () => {
    const loaded = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      mockoonPort: 3100,
      whistleFile: "mockoon-gen/whistle.cjs"
    });

    expect(artifact.outputs.whistle.file).toBe("mockoon-gen/whistle.cjs");
  });

  it("marks API code generation disabled when the input already has concrete API code", async () => {
    const loaded = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: "mockoon-gen",
      apiOutput: "src/api/generated/api.generated.ts",
      generateApiCode: false,
      mockoonPort: 3100
    });

    expect(artifact.outputs.apiCode.enabled).toBe(false);
  });

  it("rejects malformed OpenAPI documents with invalid paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const file = join(dir, "invalid-openapi.yaml");

    try {
      await writeFile(
        file,
        [
          "openapi: 3.0.3",
          "info:",
          "  title: Broken API",
          "  version: 1.0.0",
          "paths: []"
        ].join("\n"),
        "utf8"
      );

      await expect(loadOpenApi(file)).rejects.toThrow("Invalid OpenAPI document");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects malformed OpenAPI documents with null path items", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const file = join(dir, "invalid-openapi-null-path-item.yaml");

    try {
      await writeFile(
        file,
        [
          "openapi: 3.0.3",
          "info:",
          "  title: Broken API",
          "  version: 1.0.0",
          "paths:",
          "  /api/users/{id}: null"
        ].join("\n"),
        "utf8"
      );

      await expect(loadOpenApi(file)).rejects.toThrow("Invalid OpenAPI document");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses bracket notation source paths for dotted response property names", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const file = join(dir, "dotted-openapi.yaml");

    try {
      await writeFile(
        file,
        [
          "openapi: 3.0.3",
          "info:",
          "  title: Dotted API",
          "  version: 1.0.0",
          "paths:",
          "  /api/users/{id}:",
          "    get:",
          "      operationId: getUser",
          "      responses:",
          "        '200':",
          "          description: ok",
          "          content:",
          "            application/json:",
          "              schema:",
          "                type: object",
          "                properties:",
          "                  x.y:",
          "                    type: string",
          "                  user_name:",
          "                    type: string"
        ].join("\n"),
        "utf8"
      );

      const loaded = await loadOpenApi(file);
      const artifact = artifactFromOpenApi(loaded, {
        artifactDir: "mockoon-gen",
        apiOutput: "src/api/generated/api.generated.ts",
        mockoonPort: 3100
      });

      expect(artifact.endpoints[0]?.vo.fields[0]?.name).toBe("xY");
      expect(artifact.endpoints[0]?.vo.fields[0]?.sources[0]?.path).toBe('response.body["x.y"]');
      expect(artifact.endpoints[0]?.mapper.steps[0]?.output).toBe("vo.xY");
      expect(artifact.endpoints[0]?.mapper.steps[0]?.inputs[0]).toBe('response.body["x.y"]');
      expect(artifact.endpoints[0]?.vo.fields[1]?.sources[0]?.path).toBe("response.body.user_name");
      expect(artifact.endpoints[0]?.mapper.steps[1]?.inputs[0]).toBe("response.body.user_name");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
