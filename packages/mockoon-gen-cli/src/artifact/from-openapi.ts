import type { LoadedOpenApi, OpenApiDocument, OpenApiOperation, OpenApiSchema } from "@yzin/openapi-reader";
import type { MockGenConfig } from "../config/types.js";
import type { MockArtifact, MockEndpoint, MockReviewItem } from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type Template = { body: string; issues: string[] };

export function mockArtifactFromOpenApi(openapi: LoadedOpenApi, options: { origin: "generated" | "imported" | "manual"; reviewed: boolean; config: MockGenConfig }): MockArtifact {
  const endpoints: MockEndpoint[] = [];
  const reviewItems: MockReviewItem[] = [];
  for (const [path, pathItem] of Object.entries(openapi.document.paths)) for (const method of HTTP_METHODS) {
    const operation = pathItem[method];
    if (!operation) continue;
    const built = endpoint(method.toUpperCase() as MockEndpoint["method"], path, operation, options.config, openapi.document);
    endpoints.push(built.endpoint);
    reviewItems.push(...built.issues.map((message, index) => ({ id: `review-${built.endpoint.id}-schema-${index + 1}`, severity: "needsReview" as const, scope: "endpoint" as const, path: `paths.${path}.${method}.responses`, message, resolutionStatus: "open" as const })));
  }
  return { schemaVersion: "0.3.0", openapi: { file: openapi.file, sha256: openapi.sha256, origin: options.origin, reviewStatus: options.reviewed ? "confirmed" : "unreviewed" }, reviewItems, policies: structuredClone(options.config.mockPolicy), endpoints, outputs: { whistle: { groupName: options.config.whistleGroupName, routes: endpoints.map((value) => ({ endpointId: value.id, apiHost: null })) }, mockoon: { port: options.config.mockoonPort, defaultHeaders: { "Content-Type": "application/json; charset=utf-8" } } } };
}

function endpoint(method: MockEndpoint["method"], path: string, operation: OpenApiOperation, config: MockGenConfig, document: OpenApiDocument): { endpoint: MockEndpoint; issues: string[] } {
  const operationId = operation.operationId ?? `${method.toLowerCase()}${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
  const schema = successSchema(operation);
  const success = render(schema, document);
  const empty = render(schema, document, true);
  const list = findList(schema, document);
  const issues = unique([...success.issues, ...empty.issues, ...list.issues]);
  const scenarios = [
    { name: "success-default", statusCode: 200, headers: jsonHeaders(), bodyTemplate: success.body, origin: "generated" as const, enabled: true },
    { name: "success-empty", statusCode: 200, headers: jsonHeaders(), bodyTemplate: empty.body, origin: "generated" as const, enabled: true },
    { name: "error-default", statusCode: 500, headers: jsonHeaders(), bodyTemplate: '{\n  "code": "MOCK_ERROR"\n}', origin: "generated" as const, enabled: true }
  ];
  if (config.mockPolicy.listScenario.enabled && list.location) {
    if (config.mockPolicy.listScenario.itemCount > 1) scenarios.splice(1, 0, { name: `success-list-${config.mockPolicy.listScenario.itemCount}`, statusCode: 200, headers: jsonHeaders(), bodyTemplate: renderList(schema, document, list.location, config.mockPolicy.listScenario.itemCount), origin: "generated", enabled: true });
    else issues.push("列表多条成功场景的 itemCount 必须大于 1。");
  }
  return { endpoint: { id: `ep-${kebab(operationId)}`, operationId, method, path, summary: operation.summary, mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios } }, issues: unique(issues) };
}

function jsonHeaders(): Record<string, string> { return { "Content-Type": "application/json; charset=utf-8" }; }
function kebab(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
function successSchema(operation: OpenApiOperation): OpenApiSchema | undefined { const response = Object.entries(operation.responses ?? {}).filter(([code]) => /^2\d\d$/.test(code)).sort(([left], [right]) => Number(left) - Number(right))[0]?.[1]; return response?.content?.["application/json"]?.schema; }

function render(input: OpenApiSchema | undefined, document: OpenApiDocument, emptyArray = false, seen = new Set<string>()): Template {
  const resolved = resolve(input, document, seen);
  if (!resolved.schema) return { body: "null", issues: resolved.issues };
  const schema = resolved.schema;
  if (schema.allOf || schema.anyOf || schema.oneOf) return { body: "null", issues: [...resolved.issues, "组合 schema（allOf、anyOf、oneOf）无法可靠推断。"] };
  if (schema.enum?.length) return { body: JSON.stringify(schema.enum[0]), issues: resolved.issues };
  if (schema.type === "array") {
    if (emptyArray) return { body: "[]", issues: resolved.issues };
    const item = render(schema.items, document, false, seen);
    return { body: `[${item.body}]`, issues: [...resolved.issues, ...item.issues] };
  }
  if (schema.type === "object" || schema.properties) {
    const properties = Object.entries(schema.properties ?? {});
    if (properties.length === 0) return { body: "{}", issues: resolved.issues };
    const values = properties.map(([name, value]) => { const rendered = render(value, document, emptyArray, seen); return { name, ...rendered }; });
    return { body: `{\n  ${values.map((value) => `${JSON.stringify(value.name)}: ${value.body}`).join(",\n  ")}\n}`, issues: [...resolved.issues, ...values.flatMap((value) => value.issues)] };
  }
  if (schema.type === "integer" || schema.type === "number") return { body: "{{faker 'number.int'}}", issues: resolved.issues };
  if (schema.type === "boolean") return { body: "{{faker 'datatype.boolean'}}", issues: resolved.issues };
  if (schema.type === "string") return { body: JSON.stringify("{{faker 'string.sample'}}"), issues: resolved.issues };
  return { body: "null", issues: [...resolved.issues, "成功响应缺少可推断的 schema 类型。"] };
}

function resolve(input: OpenApiSchema | undefined, document: OpenApiDocument, seen: Set<string>): { schema?: OpenApiSchema; issues: string[] } {
  if (!input) return { issues: ["成功响应缺少 application/json schema。"] };
  if (!input.$ref) return { schema: input, issues: [] };
  const match = input.$ref.match(/^#\/components\/schemas\/([^/]+)$/);
  if (!match) return { issues: [`无法解析非本地 schema 引用：${input.$ref}`] };
  const name = match[1]!;
  if (seen.has(name)) return { issues: [`检测到循环 schema 引用：${name}`] };
  const schema = document.components?.schemas?.[name];
  if (!schema) return { issues: [`找不到本地 schema 引用：${name}`] };
  const next = new Set(seen); next.add(name);
  return resolve(schema, document, next);
}

function findList(input: OpenApiSchema | undefined, document: OpenApiDocument): { location?: string; issues: string[] } {
  const resolved = resolve(input, document, new Set());
  if (!resolved.schema) return { issues: resolved.issues };
  if (resolved.schema.type === "array") return { location: "root", issues: resolved.issues };
  const arrays = Object.entries(resolved.schema.properties ?? {}).flatMap(([name, value]) => resolve(value, document, new Set()).schema?.type === "array" ? [name] : []);
  return arrays.length === 1 ? { location: arrays[0], issues: resolved.issues } : arrays.length > 1 ? { issues: [...resolved.issues, "成功响应包含多个列表属性，无法确定多条数据场景。"] } : { issues: resolved.issues };
}

function renderList(input: OpenApiSchema | undefined, document: OpenApiDocument, location: string, count: number): string {
  const resolved = resolve(input, document, new Set()).schema;
  if (!resolved) return "null";
  const listSchema = location === "root" ? resolved : resolve(resolved.properties?.[location], document, new Set()).schema;
  const item = listSchema?.items;
  const rendered = render(item, document);
  const repeated = `[{{#repeat ${count}}}${rendered.body}{{/repeat}}]`;
  if (location === "root") return repeated;
  const values = Object.entries(resolved.properties ?? {}).map(([name, value]) => `${JSON.stringify(name)}: ${name === location ? repeated : render(value, document).body}`);
  return `{\n  ${values.join(",\n  ")}\n}`;
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
