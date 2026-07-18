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
    expect(body).toContain('"id": "{{faker \'string.sample\' \'{min: 0, max: 20}\'}}"');
    expect(body).toContain('"active": {{faker \'datatype.boolean\'}}');
    expect(body).toContain('"score": {{faker \'number.int\' min=-9007199254740991 max=9007199254740991}}');
    expect(artifact.reviewItems).toEqual([]);
  });

  it("为顶层基本类型生成非空随机模板", () => {
    for (const [schema, expected] of [
      [{ type: "string" }, '"{{faker \'string.sample\' \'{min: 0, max: 20}\'}}"'],
      [{ type: "number" }, "{{faker 'number.int' min=-9007199254740991 max=9007199254740991}}"],
      [{ type: "integer" }, "{{faker 'number.int' min=-9007199254740991 max=9007199254740991}}"],
      [{ type: "boolean" }, "{{faker 'datatype.boolean'}}"],
      [{ enum: ["ready", "done"] }, '"ready"']
    ] satisfies Array<[OpenApiSchema, string]>) {
      const artifact = mockArtifactFromOpenApi(openapi(schema), options());
      expect(artifact.endpoints[0]?.mock.scenarios.find((scenario) => scenario.name === "success-default")?.bodyTemplate).toBe(expected);
      expect(artifact.reviewItems).toEqual([]);
    }
  });

  it("遵守字符串和整数的边界，并让未声明长度的字符串覆盖空串到二十位", () => {
    const source = openapi({
      type: "object",
      properties: {
        defaultValue: { type: "string" },
        limitedValue: { type: "string", minLength: 1, maxLength: 20 },
        orderNo: { type: "string" },
        count: { type: "integer", minimum: -10, maximum: 0 },
        maximumSafe: { type: "integer", minimum: Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER }
      }
    });
    const artifact = mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [{ path: "orderNo", faker: "string.alphanumeric" }]]]) });
    const body = artifact.endpoints[0]!.mock.scenarios[0]!.bodyTemplate;

    expect(body).toContain("string.sample' '{min: 0, max: 20}'");
    expect(body).toContain("string.sample' '{min: 1, max: 20}'");
    expect(body).toContain("string.alphanumeric' '{length: { min: 0, max: 20}}'");
    expect(body).toContain("number.int' min=-10 max=0");
    expect(body).toContain(`number.int' min=${Number.MAX_SAFE_INTEGER} max=${Number.MAX_SAFE_INTEGER}`);
  });

  it("在独立随机空数据场景中为所有类型加入空态分支，并保持默认场景正常", () => {
    const artifact = mockArtifactFromOpenApi(openapi({
      type: "object",
      properties: {
        title: { type: "string" },
        quantity: { type: "integer" },
        active: { type: "boolean" },
        items: { type: "array", items: { type: "string" } },
        detail: { type: "object", properties: { id: { type: "string" } } }
      }
    }), { ...options(), randomEmptyData: true });
    const scenarios = artifact.endpoints[0]!.mock.scenarios;
    const normalBody = scenarios.find((scenario) => scenario.name === "success-default")!.bodyTemplate;
    const body = scenarios.find((scenario) => scenario.name === "success-random-empty")!.bodyTemplate;

    expect(artifact.policies.randomEmptyData).toBe(true);
    expect(normalBody).not.toContain("null");
    expect(normalBody).not.toContain("{{#if (boolean)}}");
    expect(body).toContain("null");
    expect(body).toContain('""');
    expect(body).toContain("[]");
    expect(body).toContain("{}");
    expect(body).toContain("{{#if (boolean)}}");
  });

  it("关闭随机空数据模式时不生成专用场景", () => {
    const artifact = mockArtifactFromOpenApi(openapi({ type: "string" }), options());
    expect(artifact.endpoints[0]!.mock.scenarios.map((scenario) => scenario.name)).not.toContain("success-random-empty");
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

  it("渲染模板时保留非自动成功场景，并同步嵌套列表映射", () => {
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

  it("拒绝不指向基础类型字段或与字段类型不匹配的语义映射", () => {
    const source = openapi({ type: "object", properties: { count: { type: "integer" }, detail: { type: "object", properties: {} } } });
    expect(() => mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [{ path: "detail", faker: "commerce.productName" }]]]) })).toThrow("SEMANTIC_MAPPING_INVALID_PATH: detail");
    expect(() => mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [{ path: "count", faker: "commerce.productName" }]]]) })).toThrow("SEMANTIC_MAPPING_TYPE_MISMATCH: count");
  });

  it("为数值型时间戳应用语义映射参数，并在所有成功场景中保持数值类型", () => {
    const source = openapi({ type: "object", properties: { batches: { type: "array", items: { type: "object", properties: { batchDate: { type: "integer" } } } } } });
    const mapping = { path: "batches[].batchDate", faker: "number.int", args: { min: 0, max: 1893456000000 } };
    const artifact = mockArtifactFromOpenApi(source, { ...options({ itemCount: 3 }), semanticMappingsByEndpoint: new Map([["ep-get-users", [mapping]]]) });

    expect(artifact.endpoints[0]!.mock.semanticMappings).toEqual([mapping]);
    for (const scenario of artifact.endpoints[0]!.mock.scenarios.filter((scenario) => scenario.name === "success-default" || scenario.name.startsWith("success-list-"))) {
      expect(scenario.bodyTemplate).toContain("{{faker 'number.int' min=0 max=1893456000000}}");
      expect(scenario.bodyTemplate).not.toContain('"{{faker \'number.int\'');
    }
    expect(artifact.reviewItems).toEqual([]);
  });

  it("为未约束的数值型日期字段创建 warning，并在 OpenAPI 或映射提供范围时消除 warning", () => {
    const unconstrained = mockArtifactFromOpenApi(openapi({ type: "object", properties: { createdAt: { type: "integer" } } }), options());
    expect(unconstrained.reviewItems).toEqual(expect.arrayContaining([expect.objectContaining({ severity: "warning", message: "createdAt appears to be a timestamp but has no realistic minimum/maximum range." })]));

    const constrained = mockArtifactFromOpenApi(openapi({ type: "object", properties: { createdAt: { type: "integer", minimum: 0, maximum: 1893456000000 } } }), options());
    expect(constrained.reviewItems).toEqual([]);
  });

  it("不允许语义映射放宽 OpenAPI 数值边界", () => {
    const source = openapi({ type: "object", properties: { batchDate: { type: "integer", minimum: 0, maximum: 100 } } });
    expect(() => mockArtifactFromOpenApi(source, { ...options(), semanticMappingsByEndpoint: new Map([["ep-get-users", [{ path: "batchDate", faker: "number.int", args: { min: 101 } }]]]) })).toThrow("SEMANTIC_MAPPING_CONFLICTS_WITH_OPENAPI_BOUNDS");
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
