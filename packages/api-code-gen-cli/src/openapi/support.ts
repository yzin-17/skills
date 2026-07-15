import type { OpenApiDocument, OpenApiOperation, OpenApiSchema } from "@yzin/openapi-reader";
import type { Diagnostic } from "../preflight/diagnostics.js";

export function unsupportedOpenApiDiagnostics(document: OpenApiDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const operation = pathItem[method];
      if (!operation) continue;
      const location = `paths.${path}.${method}`;
      checkOperation(operation, location, diagnostics);
    }
  }
  return diagnostics;
}

function checkOperation(operation: OpenApiOperation, path: string, diagnostics: Diagnostic[]): void {
  if (operation.requestBody) diagnostics.push(fatal(path, "request bodies are not supported"));
  if (operation.parameters?.some((parameter) => parameter.in === "query" || parameter.in === "header")) diagnostics.push(fatal(path, "query and header parameters are not supported"));
  for (const response of Object.values(operation.responses ?? {})) {
    const schema = response.content?.["application/json"]?.schema;
    if (schema && isUnsupportedSchema(schema)) diagnostics.push(fatal(path, "OpenAPI refs and composition are not supported"));
  }
}

function isUnsupportedSchema(schema: OpenApiSchema): boolean { return Boolean(schema.$ref || schema.allOf || schema.anyOf || schema.oneOf); }
function fatal(path: string, message: string): Diagnostic { return { severity: "fatal", code: "OPENAPI_FEATURE_UNSUPPORTED", path, message }; }
