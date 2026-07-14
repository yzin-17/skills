import type { LoadedOpenApi, OpenApiOperation, OpenApiSchema } from "@yzin/openapi-reader";
import type { MockGenConfig } from "../config/types.js";
import { listScenarioShape, mockTemplate } from "../openapi/mock-support.js";
import type { MockArtifact, MockEndpoint } from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export function mockArtifactFromOpenApi(openapi: LoadedOpenApi, options: { origin: "generated" | "imported" | "manual"; reviewed: boolean; config: MockGenConfig }): MockArtifact {
  const endpoints: MockEndpoint[] = [];
  for (const [path, pathItem] of Object.entries(openapi.document.paths)) for (const method of HTTP_METHODS) { const operation = pathItem[method]; if (operation) endpoints.push(endpoint(method.toUpperCase() as MockEndpoint["method"], path, operation, options.config)); }
  return { schemaVersion: "0.3.0", openapi: { file: openapi.file, sha256: openapi.sha256, origin: options.origin, reviewStatus: options.reviewed ? "confirmed" : "unreviewed" }, reviewItems: [], policies: structuredClone(options.config.mockPolicy), endpoints, outputs: { whistle: { groupName: options.config.whistleGroupName, routes: endpoints.map((value) => ({ endpointId: value.id, apiHost: null })) }, mockoon: { port: options.config.mockoonPort, defaultHeaders: { "Content-Type": "application/json; charset=utf-8" } } } };
}

function endpoint(method: MockEndpoint["method"], path: string, operation: OpenApiOperation, config: MockGenConfig): MockEndpoint {
  const operationId = operation.operationId ?? `${method.toLowerCase()}${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
  const schema = successSchema(operation);
  const scenarios = [{ name: "success-default", statusCode: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: bodyTemplate(schema), origin: "generated" as const, enabled: true }, { name: "success-empty", statusCode: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: emptyTemplate(schema), origin: "generated" as const, enabled: true }, { name: "error-default", statusCode: 500, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: '{\n  "code": "MOCK_ERROR"\n}', origin: "generated" as const, enabled: true }];
  const list = listScenarioShape(schema);
  if (config.mockPolicy.listScenario.enabled && list.kind !== "none" && list.kind !== "ambiguous") scenarios.splice(1, 0, { name: `success-list-${config.mockPolicy.listScenario.itemCount}`, statusCode: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: listTemplate(schema, list.kind === "property" ? list.property : undefined, config.mockPolicy.listScenario.itemCount), origin: "generated", enabled: true });
  return { id: `ep-${kebab(operationId)}`, operationId, method, path, summary: operation.summary, mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios } };
}
function kebab(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
function successSchema(operation: OpenApiOperation): OpenApiSchema | undefined { const response = Object.entries(operation.responses ?? {}).filter(([code]) => /^2\d\d$/.test(code)).sort(([left], [right]) => Number(left) - Number(right))[0]?.[1]; return response?.content?.["application/json"]?.schema; }
function bodyTemplate(schema: OpenApiSchema | undefined): string { if (schema?.type === "array") return `[${bodyTemplate(schema.items)}]`; if (!schema?.properties) return "{}"; return `{\n  ${Object.entries(schema.properties).map(([name, value]) => `${JSON.stringify(name)}: ${value.type === "array" ? `[${bodyTemplate(value.items)}]` : mockTemplate(value)}`).join(",\n  ")}\n}`; }
function emptyTemplate(schema: OpenApiSchema | undefined): string { if (schema?.type === "array") return "[]"; if (!schema?.properties) return "{}"; return `{\n  ${Object.entries(schema.properties).map(([name, value]) => `${JSON.stringify(name)}: ${value.type === "array" ? "[]" : mockTemplate(value)}`).join(",\n  ")}\n}`; }
function listTemplate(schema: OpenApiSchema | undefined, property: string | undefined, count: number): string { const item = property ? schema?.properties?.[property]?.items : schema?.items; const array = `[{{#repeat ${count}}}${bodyTemplate(item)}{{/repeat}}]`; return property ? `{\n  ${JSON.stringify(property)}: ${array}\n}` : array; }
