import type { LoadedOpenApi, OpenApiOperation, OpenApiSchema } from "@yzin/openapi-reader";
import type { ApiCodeGenConfig } from "../config/types.js";
import type { ApiCodeArtifact, ApiEndpoint, MapperStep } from "./types.js";

export interface FromOpenApiOptions {
  origin: "imported" | "manual";
  reviewed: boolean;
  config: ApiCodeGenConfig;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export function artifactFromOpenApi(openapi: LoadedOpenApi, options: FromOpenApiOptions): ApiCodeArtifact {
  const endpoints: ApiEndpoint[] = [];
  for (const [path, pathItem] of Object.entries(openapi.document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) endpoints.push(endpointFromOperation(method.toUpperCase() as ApiEndpoint["method"], path, operation));
    }
  }

  return {
    schemaVersion: "0.1.0",
    openapi: { file: openapi.file, sha256: openapi.sha256, origin: options.origin, reviewStatus: options.reviewed ? "confirmed" : "unreviewed" },
    reviewItems: [],
    endpoints,
    output: options.config.splitApiOutput
      ? { splitApiOutput: true, directory: options.config.apiOutput, files: [], indexFile: null, transformResponse: options.config.transformResponse, reviewStatus: "unreviewed" }
      : { splitApiOutput: false, file: options.config.apiOutput, transformResponse: options.config.transformResponse, reviewStatus: "unreviewed" }
  };
}

function endpointFromOperation(method: ApiEndpoint["method"], path: string, operation: OpenApiOperation): ApiEndpoint {
  const operationId = operation.operationId ?? operationIdFrom(method, path);
  const responseSchema = operation.responses?.["200"]?.content?.["application/json"]?.schema;
  const fieldNames = Object.keys(responseSchema?.properties ?? {});
  const identifiers = createFieldIdentifiers(fieldNames);
  const pascalName = pascal(operationId);
  const steps: MapperStep[] = fieldNames.map((field, index) => {
    const name = identifiers.get(field) ?? `field${index + 1}`;
    return { id: `step-${String(index + 1).padStart(3, "0")}`, order: index + 1, operation: "rename", inputs: [responseBodyPath(field)], output: `vo.${name}`, params: {}, description: `Map ${field} to ${name}`, confidence: "medium" };
  });

  return {
    id: `ep-${kebab(operationId)}`, operationId, method, path, summary: operation.summary,
    dto: { response: `${pascalName}ResponseDTO` },
    vo: { name: `${pascalName}VO`, fields: fieldNames.map((field, index) => {
      const name = identifiers.get(field) ?? `field${index + 1}`;
      return { name, type: tsType(responseSchema?.properties?.[field]), sources: [{ path: responseBodyPath(field), role: name }], confidence: "medium", origin: "inferred", description: operation.summary, reason: `Generated from response field ${field}` };
    }) },
    mapper: { name: `to${pascalName}VO`, enabled: true, steps }
  };
}

function responseBodyPath(field: string): string { return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(field) ? `response.body.${field}` : `response.body[${JSON.stringify(field)}]`; }
function createFieldIdentifiers(fields: string[]): Map<string, string> { const result = new Map<string, string>(); const used = new Set<string>(); for (const [index, field] of fields.entries()) { const base = sanitizeIdentifier(field, `field${index + 1}`); let candidate = base; let suffix = 2; while (used.has(candidate)) candidate = `${base}${suffix++}`; used.add(candidate); result.set(field, candidate); } return result; }
function sanitizeIdentifier(value: string, fallback: string): string { const normalized = camel(value.replace(/[^A-Za-z0-9_$]+/g, "_")); const candidate = normalized || fallback; return /^[A-Za-z_$]/.test(candidate) ? candidate : `_${candidate}`; }
function camel(value: string): string { return value.replace(/[_-]+(.)?/g, (_, next: string | undefined) => next ? next.toUpperCase() : ""); }
function pascal(value: string): string { const normalized = camel(value); return normalized ? normalized[0]!.toUpperCase() + normalized.slice(1) : "Endpoint"; }
function kebab(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
function operationIdFrom(method: string, path: string): string { return `${method.toLowerCase()}${path.split("/").filter(Boolean).map((part) => part.startsWith("{") ? "By" + pascal(part.slice(1, -1)) : pascal(part)).join("")}`; }
function tsType(schema: OpenApiSchema | undefined): string { if (schema?.enum?.length) return schema.enum.map((value) => JSON.stringify(value)).join(" | "); if (schema?.type === "integer" || schema?.type === "number") return "number"; if (schema?.type === "boolean") return "boolean"; if (schema?.type === "array") return `${tsType(schema.items)}[]`; return "string"; }
