import { loadOpenApi } from "@yzin/openapi-reader";
import type { LoadedOpenApi, OpenApiSchema } from "@yzin/openapi-reader";
import { describe, expect, it } from "vitest";
import { mockArtifactFromOpenApi, refreshMockArtifactTemplates } from "../../src/artifact/from-openapi.js";
import { mockArtifactSchema } from "../../src/artifact/schema.js";
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

  it("优先使用 format，并应用模型填写的中英文语义映射", () => {
    const source = openapi({
      type: "object",
      properties: {
        id: { type: "string", format: "email" },
        productName: { type: "string" },
        商品名称: { type: "string" }
      }
    });
    const artifact = mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [
      { path: "id", faker: "string.uuid" },
      { path: "productName", faker: "commerce.productName" },
      { path: "商品名称", faker: "commerce.productName" }
    ]]]) });
    const body = artifact.endpoints[0]!.mock.scenarios[0]!.bodyTemplate;

    expect(body).toContain('"id": "{{faker \'internet.email\'}}"');
    expect(body).toContain('"productName": "{{faker \'commerce.productName\'}}"');
    expect(body).toContain('"商品名称": "{{faker \'commerce.productName\'}}"');
  });

  it("刷新模板时保留非自动成功场景，并同步嵌套列表映射", () => {
    const source = openapi({
      type: "object",
      properties: { items: { type: "array", items: { type: "object", properties: { 商品名称: { type: "string" } } } } }
    });
    const artifact = mockArtifactFromOpenApi(source, options({ itemCount: 3 }));
    const endpoint = artifact.endpoints[0]!;
    endpoint.mock.semanticMappings = [{ path: "items[].商品名称", faker: "commerce.productName" }];
    endpoint.mock.scenarios.push({ name: "success-custom", statusCode: 200, headers: {}, bodyTemplate: '{"manual": true}', origin: "manual", enabled: true });

    const refreshed = refreshMockArtifactTemplates(artifact, source);
    const scenarios = refreshed.endpoints[0]!.mock.scenarios;
    expect(scenarios.find((scenario) => scenario.name === "success-default")?.bodyTemplate).toContain("commerce.productName");
    expect(scenarios.find((scenario) => scenario.name === "success-list-3")?.bodyTemplate).toContain("commerce.productName");
    expect(scenarios.find((scenario) => scenario.name === "success-custom")?.bodyTemplate).toBe('{"manual": true}');
  });

  it("拒绝不指向字符串字段的语义映射", () => {
    const source = openapi({ type: "object", properties: { count: { type: "integer" } } });
    expect(() => mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [{ path: "count", faker: "commerce.productName" }]]]) })).toThrow("SEMANTIC_MAPPING_INVALID_PATH: count");
  });

  it("未映射时回退，并允许显式通用字符串映射", () => {
    const source = openapi({ type: "object", properties: { note: { type: "string" } } });
    const fallback = mockArtifactFromOpenApi(source, options());
    const explicit = mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [{ path: "note", faker: "string.sample" }]]]) });

    expect(fallback.endpoints[0]!.mock.scenarios[0]!.bodyTemplate).toContain("string.sample");
    expect(explicit.endpoints[0]!.mock.scenarios[0]!.bodyTemplate).toContain("string.sample");
  });

  it("拒绝不安全 Faker 方法和重复路径", () => {
    const artifact = mockArtifactFromOpenApi(openapi({ type: "string" }), options());
    artifact.endpoints[0]!.mock.semanticMappings = [{ path: "value", faker: "string.sample'; malicious" }];
    expect(() => mockArtifactSchema.parse(artifact)).toThrow("faker must use module.method syntax");
    artifact.endpoints[0]!.mock.semanticMappings = [{ path: "value", faker: "string.sample" }, { path: "value", faker: "commerce.productName" }];
    expect(() => mockArtifactSchema.parse(artifact)).toThrow("semantic mapping path must be unique");
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
