import { loadOpenApi } from "@yzin/openapi-reader";
import type { LoadedOpenApi, OpenApiSchema } from "@yzin/openapi-reader";
import { describe, expect, it } from "vitest";
import { mockArtifactFromOpenApi } from "../../src/artifact/from-openapi.js";
import { runMockPreflight } from "../../src/preflight/run-preflight.js";

describe("mockArtifactFromOpenApi", () => {
  it("freezes config policy and provenance without selecting a Whistle format", async () => {
    const openapi = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = mockArtifactFromOpenApi(openapi, { origin: "imported", reviewed: false, config: { mockoonPort: 3100, whistleGroupName: "User mock", mockPolicy: { listScenario: { enabled: true, itemCount: 10 } } } });
    expect(artifact.openapi.reviewStatus).toBe("unreviewed");
    expect(artifact.policies.listScenario.itemCount).toBe(10);
    expect(artifact.outputs.whistle.routes[0]).toEqual({ endpointId: "ep-get-user", apiHost: null });
    expect(artifact).not.toHaveProperty("outputs.whistle.file");
  });

  it("为本地和嵌套引用生成随机成功响应模板", () => {
    const artifact = mockArtifactFromOpenApi(openapi({
      $ref: "#/components/schemas/User"
    }, {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          active: { type: "boolean" },
          profile: { $ref: "#/components/schemas/Profile" }
        }
      },
      Profile: {
        type: "object",
        properties: {
          score: { type: "integer" }
        }
      }
    }), options());

    const body = artifact.endpoints[0]?.mock.scenarios.find((scenario) => scenario.name === "success-default")?.bodyTemplate;
    expect(body).toContain('"id": "{{faker \'string.sample\'}}"');
    expect(body).toContain('"active": {{faker \'datatype.boolean\'}}');
    expect(body).toContain('"score": {{faker \'number.int\'}}');
    expect(artifact.reviewItems).toEqual([]);
  });

  it("为顶层基本类型生成非空随机模板", () => {
    for (const [schema, expected] of [
      [{ type: "string" }, '"{{faker \'string.sample\'}}"'],
      [{ type: "number" }, "{{faker 'number.int'}}"],
      [{ type: "integer" }, "{{faker 'number.int'}}"],
      [{ type: "boolean" }, "{{faker 'datatype.boolean'}}"],
      [{ enum: ["ready", "done"] }, '"ready"']
    ] satisfies Array<[OpenApiSchema, string]>) {
      const artifact = mockArtifactFromOpenApi(openapi(schema), options());
      expect(artifact.endpoints[0]?.mock.scenarios.find((scenario) => scenario.name === "success-default")?.bodyTemplate).toBe(expected);
      expect(artifact.reviewItems).toEqual([]);
    }
  });

  it("为顶层和对象包裹列表同时生成单条与多条成功场景", () => {
    for (const schema of [
      { type: "array", items: { $ref: "#/components/schemas/User" } },
      { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/User" } } } }
    ] satisfies OpenApiSchema[]) {
      const artifact = mockArtifactFromOpenApi(openapi(schema, { User: { type: "object", properties: { id: { type: "string" } } } }), options({ itemCount: 3 }));
      const scenarios = artifact.endpoints[0]?.mock.scenarios ?? [];
      const single = scenarios.find((scenario) => scenario.name === "success-default");
      const multiple = scenarios.find((scenario) => scenario.name === "success-list-3");
      expect(single?.bodyTemplate).toContain("{{faker");
      expect(multiple?.bodyTemplate).toContain("{{#repeat 3}}");
      expect(artifact.reviewItems).toEqual([]);
    }
  });

  it("为无法可靠推断的成功响应创建开放审阅项", () => {
    for (const [schema, schemas] of [
      [undefined, {}],
      [{ $ref: "https://example.test/User.yaml" }, {}],
      [{ allOf: [{ type: "string" }] }, {}],
      [{ $ref: "#/components/schemas/User" }, { User: { $ref: "#/components/schemas/User" } }]
    ] as Array<[OpenApiSchema | undefined, Record<string, OpenApiSchema>]>) {
      const artifact = mockArtifactFromOpenApi(openapi(schema, schemas), options());
      expect(artifact.reviewItems).toEqual(expect.arrayContaining([
        expect.objectContaining({ severity: "needsReview", scope: "endpoint", resolutionStatus: "open" })
      ]));
      expect(artifact.endpoints[0]?.mock.scenarios.find((scenario) => scenario.name === "success-default")?.bodyTemplate).not.toBe("{}");
      expect(runMockPreflight(artifact, { currentOpenApiSha256: "test-sha256", target: "mockoon" }).ready).toBe(false);
    }
  });
});

function options(overrides: { itemCount?: number } = {}) {
  return {
    origin: "imported" as const,
    reviewed: true,
    config: {
      mockoonPort: 3100,
      whistleGroupName: "User mock",
      mockPolicy: { listScenario: { enabled: true, itemCount: overrides.itemCount ?? 20 } }
    }
  };
}

function openapi(schema: OpenApiSchema | undefined, schemas: Record<string, OpenApiSchema> = {}): LoadedOpenApi {
  return {
    file: "/tmp/openapi.yaml",
    sha256: "test-sha256",
    document: {
      openapi: "3.0.3",
      paths: {
        "/users": {
          get: {
            operationId: "getUsers",
            responses: {
              "200": schema === undefined ? { description: "OK" } : { description: "OK", content: { "application/json": { schema } } }
            }
          }
        }
      },
      components: { schemas }
    }
  } as LoadedOpenApi;
}
