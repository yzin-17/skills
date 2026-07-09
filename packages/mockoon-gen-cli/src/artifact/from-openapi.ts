import type { ApiArtifact, ArtifactEndpoint, MapperStep, MockScenario, WhistleRoute } from "./types.js";
import type { LoadedOpenApi, OpenApiOperation, OpenApiSchema } from "../openapi/types.js";

interface FromOpenApiOptions {
  artifactDir: string;
  apiOutput: string;
  generateApiCode?: boolean;
  mockoonPort: number | null;
  whistleFile?: string;
  whistleGroupName?: string | null;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export function artifactFromOpenApi(openapi: LoadedOpenApi, options: FromOpenApiOptions): ApiArtifact {
  const endpoints: ArtifactEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(openapi.document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      endpoints.push(endpointFromOperation(method.toUpperCase() as ArtifactEndpoint["method"], path, operation));
    }
  }

  const routes: WhistleRoute[] = endpoints.map((endpoint) => ({
    endpointId: endpoint.id,
    operationId: endpoint.operationId,
    method: endpoint.method,
    apiHost: "pending-confirmation",
    sourcePath: endpoint.path,
    sourcePattern: endpoint.path.replace(/\{[^}]+\}/g, "*"),
    targetPort: options.mockoonPort,
    targetPath: endpoint.path.replace(/\{([^}]+)\}/g, ":$1"),
    origin: "generated",
    reviewStatus: options.mockoonPort ? "needs-change" : "unreviewed"
  }));

  return {
    schemaVersion: "0.2.0",
    sources: [
      {
        id: "src-openapi-001",
        type: "file",
        uri: openapi.file,
        title: openapi.document.info?.title,
        sha256: openapi.sha256,
        origin: "imported",
        reviewStatus: "confirmed"
      }
    ],
    openapi: {
      file: openapi.file,
      sha256: openapi.sha256,
      origin: "imported",
      reviewStatus: "confirmed"
    },
    reviewItems: [],
    endpoints,
    outputs: {
      apiCode: {
        enabled: options.generateApiCode ?? true,
        suggestedFile: options.apiOutput,
        placement: "pending-confirmation",
        integrationMode: "standalone",
        transformResponse: true,
        lastGeneratedSha256: null,
        origin: "generated",
        reviewStatus: "unreviewed"
      },
      whistle: {
        file: options.whistleFile ?? `${options.artifactDir}/whistle.json`,
        groupName: options.whistleGroupName ?? null,
        routes
      },
      mockoon: {
        file: `${options.artifactDir}/mockoon.json`,
        port: options.mockoonPort,
        defaultHeaders: {
          "Content-Type": "application/json; charset=utf-8"
        },
        origin: "generated",
        reviewStatus: options.mockoonPort ? "needs-change" : "unreviewed"
      }
    }
  };
}

function endpointFromOperation(
  method: ArtifactEndpoint["method"],
  path: string,
  operation: OpenApiOperation
): ArtifactEndpoint {
  const operationId = operation.operationId ?? operationIdFrom(method, path);
  const responseSchema = operation.responses?.["200"]?.content?.["application/json"]?.schema;
  const fieldNames = Object.keys(responseSchema?.properties ?? {});
  const fieldIdentifiers = createFieldIdentifiers(fieldNames);
  const dtoResponse = `${pascal(operationId)}ResponseDTO`;
  const voName = `${pascal(operationId)}VO`;
  const mapperName = `to${pascal(operationId)}VO`;

  const steps: MapperStep[] = fieldNames.map((field, index) => {
    const fieldIdentifier = fieldIdentifiers.get(field) ?? `field${index + 1}`;
    return {
      id: `step-${String(index + 1).padStart(3, "0")}`,
      order: index + 1,
      operation: "rename",
      inputs: [responseBodyPath(field)],
      output: `vo.${fieldIdentifier}`,
      params: {},
      description: `Map ${field} to ${fieldIdentifier}`,
      confidence: "medium",
      reviewStatus: "unreviewed"
    };
  });

  const scenarios: MockScenario[] = [
    {
      name: "success-default",
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      bodyTemplate: mockBodyTemplate(responseSchema),
      origin: "generated",
      reviewStatus: "unreviewed",
      enabled: true
    },
    ...listScenarios(responseSchema),
    {
      name: "success-empty",
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      bodyTemplate: emptyBodyTemplate(responseSchema),
      origin: "generated",
      reviewStatus: "unreviewed",
      enabled: true
    },
    {
      name: "error-default",
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      bodyTemplate: '{\n  "code": "MOCK_ERROR",\n  "message": "{{faker \'lorem.sentence\'}}"\n}',
      origin: "generated",
      reviewStatus: "unreviewed",
      enabled: true
    }
  ];

  return {
    id: `ep-${kebab(operationId)}`,
    operationId,
    method,
    path,
    summary: operation.summary,
    origin: "generated",
    reviewStatus: "unreviewed",
    dto: {
      response: dtoResponse
    },
    vo: {
      name: voName,
      owner: "api-skill",
      origin: "inferred",
      reviewStatus: "unreviewed",
      fields: fieldNames.map((field, index) => {
        const fieldIdentifier = fieldIdentifiers.get(field) ?? `field${index + 1}`;
        return {
          name: fieldIdentifier,
          type: tsType(responseSchema?.properties?.[field]),
          sources: [{ path: responseBodyPath(field), role: fieldIdentifier }],
          confidence: "medium",
          origin: "inferred",
          reviewStatus: "unreviewed",
          description: operation.summary,
          reason: `Generated from response field ${field}`
        };
      })
    },
    mapper: {
      name: mapperName,
      enabled: true,
      origin: "inferred",
      reviewStatus: "unreviewed",
      steps
    },
    mock: {
      origin: "generated",
      reviewStatus: "unreviewed",
      selection: {
        mode: "query",
        key: "scenario",
        defaultScenario: "success-default"
      },
      scenarios
    },
    reviewItems: []
  };
}

function responseBodyPath(field: string): string {
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(field) ? `response.body.${field}` : `response.body[${JSON.stringify(field)}]`;
}

function createFieldIdentifiers(fieldNames: string[]): Map<string, string> {
  const identifiers = new Map<string, string>();
  const used = new Set<string>();

  for (const [index, fieldName] of fieldNames.entries()) {
    const base = sanitizeIdentifier(fieldName, `field${index + 1}`);
    let candidate = base;
    let suffix = 2;

    while (used.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }

    used.add(candidate);
    identifiers.set(fieldName, candidate);
  }

  return identifiers;
}

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = camel(value.replace(/[^A-Za-z0-9_$]+/g, "_"));
  const candidate = normalized.length > 0 ? normalized : fallback;
  return /^[A-Za-z_$]/.test(candidate) ? candidate : `_${candidate}`;
}

function mockBodyTemplate(schema: OpenApiSchema | undefined): string {
  if (schema?.type === "array") return arrayBodyTemplate(schema.items, 1);
  if (!schema?.properties) return "{}";
  const entries = Object.entries(schema.properties).map(([name, prop]) => {
    if (prop.type === "array") return `"${name}": ${arrayBodyTemplate(prop.items, 1)}`;
    if (prop.enum?.length) return `"${name}": ${JSON.stringify(prop.enum[0])}`;
    if (prop.type === "integer" || prop.type === "number") return `"${name}": "{{faker 'number.int'}}"`;
    return `"${name}": "{{faker 'string.sample'}}"`;
  });
  return `{\n  ${entries.join(",\n  ")}\n}`;
}

function listScenarios(schema: OpenApiSchema | undefined): MockScenario[] {
  const listTemplate = listBodyTemplate(schema);
  if (!listTemplate) {
    return [];
  }

  return [
    {
      name: "success-list-20",
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      bodyTemplate: listTemplate,
      origin: "generated",
      reviewStatus: "unreviewed",
      enabled: true
    }
  ];
}

function listBodyTemplate(schema: OpenApiSchema | undefined): string | null {
  if (schema?.type === "array") {
    return arrayBodyTemplate(schema.items, 20);
  }

  const listProperty = Object.entries(schema?.properties ?? {}).find(([, prop]) => prop.type === "array");
  if (!listProperty) {
    return null;
  }

  const [name, prop] = listProperty;
  return `{\n  "${name}": ${arrayBodyTemplate(prop.items, 20).replace(/\n/g, "\n  ")}\n}`;
}

function arrayBodyTemplate(itemSchema: OpenApiSchema | undefined, count: number): string {
  return `[\n{{#repeat ${count}}}\n  ${mockItemTemplate(itemSchema)}{{#unless @last}},{{/unless}}\n{{/repeat}}\n]`;
}

function mockItemTemplate(schema: OpenApiSchema | undefined): string {
  if (schema?.type === "object" && schema.properties) {
    const entries = Object.entries(schema.properties).map(([name, prop]) => `    "${name}": ${mockScalarTemplate(prop)}`);
    return `{\n${entries.join(",\n")}\n  }`;
  }

  return mockScalarTemplate(schema);
}

function mockScalarTemplate(schema: OpenApiSchema | undefined): string {
  if (schema?.enum?.length) return JSON.stringify(schema.enum[0]);
  if (schema?.type === "integer" || schema?.type === "number") return `"{{faker 'number.int'}}"`;
  if (schema?.type === "boolean") return `"{{faker 'datatype.boolean'}}"`;
  return `"{{faker 'string.sample'}}"`;
}

function emptyBodyTemplate(schema: OpenApiSchema | undefined): string {
  if (schema?.type === "array") return "[]";
  if (!schema?.properties) return "{}";

  const entries = Object.entries(schema.properties).map(([name, prop]) => {
    if (prop.type === "array") return `"${name}": []`;
    if (prop.type === "object") return `"${name}": {}`;
    return `"${name}": null`;
  });
  return `{\n  ${entries.join(",\n  ")}\n}`;
}

function tsType(schema: OpenApiSchema | undefined): string {
  if (!schema) return "unknown";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") return `${tsType(schema.items)}[]`;
  if (schema.type === "object") return "Record<string, unknown>";
  return "string";
}

function operationIdFrom(method: string, path: string): string {
  return camel(`${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
}

function pascal(value: string): string {
  const c = camel(value);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function camel(value: string): string {
  return value
    .replace(/[_-\s]+(.)?/g, (_, char: string | undefined) => (char ? char.toUpperCase() : ""))
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}
