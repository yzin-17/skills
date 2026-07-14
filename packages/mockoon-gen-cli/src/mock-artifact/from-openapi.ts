import type { LoadedOpenApi, OpenApiOperation } from "@yzin/openapi-reader";
import type { MockGenConfig } from "../config-v2/types.js";
import type { MockArtifact, MockEndpoint } from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export function mockArtifactFromOpenApi(openapi: LoadedOpenApi, options: { origin: "generated" | "imported" | "manual"; reviewed: boolean; config: MockGenConfig }): MockArtifact {
  const endpoints: MockEndpoint[] = [];
  for (const [path, pathItem] of Object.entries(openapi.document.paths)) for (const method of HTTP_METHODS) { const operation = pathItem[method]; if (operation) endpoints.push(endpoint(method.toUpperCase() as MockEndpoint["method"], path, operation)); }
  return { schemaVersion: "0.3.0", openapi: { file: openapi.file, sha256: openapi.sha256, origin: options.origin, reviewStatus: options.reviewed ? "confirmed" : "unreviewed" }, reviewItems: [], policies: structuredClone(options.config.mockPolicy), endpoints, outputs: { whistle: { groupName: options.config.whistleGroupName, routes: endpoints.map((value) => ({ endpointId: value.id, apiHost: null })) }, mockoon: { port: options.config.mockoonPort, defaultHeaders: { "Content-Type": "application/json; charset=utf-8" } } } };
}

function endpoint(method: MockEndpoint["method"], path: string, operation: OpenApiOperation): MockEndpoint {
  const operationId = operation.operationId ?? `${method.toLowerCase()}${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
  return { id: `ep-${kebab(operationId)}`, operationId, method, path, summary: operation.summary, mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios: [{ name: "success-default", statusCode: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: "{}", origin: "generated", enabled: true }, { name: "success-empty", statusCode: 200, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: "{}", origin: "generated", enabled: true }, { name: "error-default", statusCode: 500, headers: { "Content-Type": "application/json; charset=utf-8" }, bodyTemplate: '{\n  "code": "MOCK_ERROR"\n}', origin: "generated", enabled: true }] } };
}
function kebab(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
