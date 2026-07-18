import type { LoadedOpenApi, OpenApiDocument, OpenApiOperation, OpenApiSchema } from "@yzin/openapi-reader";
import type { MockGenConfig } from "../config/types.js";
import type { MockArtifact, MockEndpoint, MockReviewItem, MockSemanticMapping, MockScenario } from "./types.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type Template = { body: string; issues: string[] };
type Issue = { message: string; severity: "needsReview" | "warning" };

export function mockArtifactFromOpenApi(openapi: LoadedOpenApi, options: { origin: "generated" | "imported" | "manual"; reviewed: boolean; randomEmptyData?: boolean; config: MockGenConfig; semanticMappingsByEndpoint?: ReadonlyMap<string, readonly MockSemanticMapping[]> }): MockArtifact {
  const endpoints: MockEndpoint[] = [];
  const reviewItems: MockReviewItem[] = [];
  for (const [path, pathItem] of Object.entries(openapi.document.paths)) for (const method of HTTP_METHODS) {
    const operation = pathItem[method];
    if (!operation) continue;
    const id = endpointId(method.toUpperCase() as MockEndpoint["method"], path, operation);
    const built = endpoint(method.toUpperCase() as MockEndpoint["method"], path, operation, options.config, openapi.document, options.semanticMappingsByEndpoint?.get(id) ?? [], Boolean(options.randomEmptyData));
    endpoints.push(built.endpoint);
    reviewItems.push(...built.issues.map((issue, index) => ({ id: `review-${built.endpoint.id}-schema-${index + 1}`, severity: issue.severity, scope: "endpoint" as const, path: `paths.${path}.${method}.responses`, message: issue.message, resolutionStatus: "open" as const })));
  }
  return { schemaVersion: "0.3.0", openapi: { file: openapi.file, sha256: openapi.sha256, origin: options.origin, reviewStatus: options.reviewed ? "confirmed" : "unreviewed" }, reviewItems, policies: { ...structuredClone(options.config.mockPolicy), randomEmptyData: Boolean(options.randomEmptyData) }, endpoints, outputs: { whistle: { groupName: options.config.whistleGroupName, routes: endpoints.map((value) => ({ endpointId: value.id, apiHost: null })) }, mockoon: { port: options.config.mockoonPort, defaultHeaders: { "Content-Type": "application/json; charset=utf-8" } } } };
}

function endpointId(method: MockEndpoint["method"], path: string, operation: OpenApiOperation): string { return `ep-${kebab(operation.operationId ?? `${method.toLowerCase()}${path.replace(/[^A-Za-z0-9]+/g, "-")}`)}`; }

function endpoint(method: MockEndpoint["method"], path: string, operation: OpenApiOperation, config: MockGenConfig, document: OpenApiDocument, semanticMappings: readonly MockSemanticMapping[], randomEmptyData: boolean): { endpoint: MockEndpoint; issues: Issue[] } {
  const operationId = operation.operationId ?? `${method.toLowerCase()}${path.replace(/[^A-Za-z0-9]+/g, "-")}`;
  const schema = successSchema(operation);
  const mappings = new Map(semanticMappings.map((mapping) => [mapping.path, mapping]));
  const primitivePaths = new Map<string, OpenApiSchema>();
  const success = render(schema, document, false, new Set(), "", mappings, primitivePaths, false);
  const empty = render(schema, document, true, new Set(), "", mappings, primitivePaths, false);
  const randomEmpty = randomEmptyData ? render(schema, document, false, new Set(), "", mappings, primitivePaths, true) : undefined;
  const list = findList(schema, document);
  const timestampWarnings = [...primitivePaths.entries()].flatMap(([fieldPath, fieldSchema]) => isDateLikePath(fieldPath) && isNumeric(fieldSchema) && lacksNumericBounds(fieldSchema, mappings.get(fieldPath)) ? [`${fieldPath} appears to be a timestamp but has no realistic minimum/maximum range.`] : []);
  const issues = [
    ...unique([...success.issues, ...empty.issues, ...list.issues]).map((message) => ({ message, severity: "needsReview" as const })),
    ...unique(timestampWarnings).map((message) => ({ message, severity: "warning" as const }))
  ];
  const invalidMappings = semanticMappings.filter((mapping) => !primitivePaths.has(mapping.path));
  if (invalidMappings.length) throw new Error(`SEMANTIC_MAPPING_INVALID_PATH: ${invalidMappings.map((mapping) => mapping.path).join(", ")}`);
  for (const mapping of semanticMappings) validateMapping(mapping, primitivePaths.get(mapping.path)!);
  const scenarios: MockScenario[] = [
    { name: "success-default", statusCode: 200, headers: jsonHeaders(), bodyTemplate: success.body, origin: "generated", enabled: true },
    { name: "success-empty", statusCode: 200, headers: jsonHeaders(), bodyTemplate: empty.body, origin: "generated", enabled: true },
    { name: "error-default", statusCode: 500, headers: jsonHeaders(), bodyTemplate: '{\n  "code": "MOCK_ERROR"\n}', origin: "generated", enabled: true }
  ];
  if (randomEmpty) scenarios.splice(1, 0, { name: "success-random-empty", statusCode: 200, headers: jsonHeaders(), bodyTemplate: randomEmpty.body, origin: "generated", enabled: true });
  if (config.mockPolicy.listScenario.enabled && list.location) {
    if (config.mockPolicy.listScenario.itemCount > 1) scenarios.splice(1, 0, { name: `success-list-${config.mockPolicy.listScenario.itemCount}`, statusCode: 200, headers: jsonHeaders(), bodyTemplate: renderList(schema, document, list.location, config.mockPolicy.listScenario.itemCount, mappings, primitivePaths, false), origin: "generated", enabled: true });
    else issues.push({ message: "列表多条成功场景的 itemCount 必须大于 1。", severity: "needsReview" });
  }
  return { endpoint: { id: endpointId(method, path, operation), operationId, method, path, summary: operation.summary, mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, semanticMappings: [...semanticMappings], scenarios } }, issues };
}

function jsonHeaders(): Record<string, string> { return { "Content-Type": "application/json; charset=utf-8" }; }
function kebab(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
function successSchema(operation: OpenApiOperation): OpenApiSchema | undefined { const response = Object.entries(operation.responses ?? {}).filter(([code]) => /^2\d\d$/.test(code)).sort(([left], [right]) => Number(left) - Number(right))[0]?.[1]; return response?.content?.["application/json"]?.schema; }

function render(input: OpenApiSchema | undefined, document: OpenApiDocument, emptyArray = false, seen = new Set<string>(), path = "", mappings = new Map<string, MockSemanticMapping>(), primitivePaths = new Map<string, OpenApiSchema>(), randomEmptyData = false): Template {
  const resolved = resolve(input, document, seen);
  if (!resolved.schema) return { body: "null", issues: resolved.issues };
  const schema = resolved.schema;
  if (schema.allOf || schema.anyOf || schema.oneOf) return { body: "null", issues: [...resolved.issues, "组合 schema（allOf、anyOf、oneOf）无法可靠推断。"] };
  if (schema.enum?.length) return { body: randomEmptyData ? nullable(JSON.stringify(schema.enum[0])) : JSON.stringify(schema.enum[0]), issues: resolved.issues };
  if (schema.type === "array") {
    if (emptyArray) return { body: "[]", issues: resolved.issues };
    const item = render(schema.items, document, false, seen, `${path}[]`, mappings, primitivePaths, randomEmptyData);
    const body = `[${item.body}]`;
    return { body: randomEmptyData ? nullableOrEmpty(body, "[]") : body, issues: [...resolved.issues, ...item.issues] };
  }
  if (schema.type === "object" || schema.properties) {
    const properties = Object.entries(schema.properties ?? {});
    if (properties.length === 0) return { body: "{}", issues: resolved.issues };
    const values = properties.map(([name, value]) => ({ name, ...render(value, document, emptyArray, seen, path ? `${path}.${name}` : name, mappings, primitivePaths, randomEmptyData) }));
    const body = `{\n  ${values.map((value) => `${JSON.stringify(value.name)}: ${value.body}`).join(",\n  ")}\n}`;
    return { body: randomEmptyData ? nullableOrEmpty(body, "{}") : body, issues: [...resolved.issues, ...values.flatMap((value) => value.issues)] };
  }
  if (schema.type === "integer" || schema.type === "number") {
    if (path) primitivePaths.set(path, schema);
    const body = numericTemplate(schema, mappings.get(path));
    return { body: randomEmptyData ? nullable(body) : body, issues: resolved.issues };
  }
  if (schema.type === "boolean") {
    if (path) primitivePaths.set(path, schema);
    const faker = mappings.get(path)?.faker ?? "datatype.boolean";
    const body = `{{faker '${faker}'}}`;
    return { body: randomEmptyData ? nullable(body) : body, issues: resolved.issues };
  }
  if (schema.type === "string") {
    if (path) primitivePaths.set(path, schema);
    const body = JSON.stringify(stringTemplate(formatFaker(schema.format) ?? mappings.get(path)?.faker ?? "string.sample", schema));
    return { body: randomEmptyData ? nullableOrEmptyString(body) : body, issues: resolved.issues };
  }
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

function renderList(input: OpenApiSchema | undefined, document: OpenApiDocument, location: string, count: number, mappings: Map<string, MockSemanticMapping>, primitivePaths: Map<string, OpenApiSchema>, randomEmptyData: boolean): string {
  const resolved = resolve(input, document, new Set()).schema;
  if (!resolved) return "null";
  const listSchema = location === "root" ? resolved : resolve(resolved.properties?.[location], document, new Set()).schema;
  const rendered = render(listSchema?.items, document, false, new Set(), location === "root" ? "[]" : `${location}[]`, mappings, primitivePaths, randomEmptyData);
  const repeated = `[{{#repeat ${count}}}${rendered.body}{{/repeat}}]`;
  if (location === "root") return repeated;
  const values = Object.entries(resolved.properties ?? {}).map(([name, value]) => `${JSON.stringify(name)}: ${name === location ? repeated : render(value, document, false, new Set(), name, mappings, primitivePaths, randomEmptyData).body}`);
  return `{\n  ${values.join(",\n  ")}\n}`;
}

function numericTemplate(schema: OpenApiSchema, mapping: MockSemanticMapping | undefined): string {
  const schemaMinimum = integerBound(schema.minimum, Number.MIN_SAFE_INTEGER, Math.ceil);
  const schemaMaximum = integerBound(schema.maximum, Number.MAX_SAFE_INTEGER, Math.floor);
  const mappedMinimum = integerBound(mapping?.args?.min, schemaMinimum, Math.ceil);
  const mappedMaximum = integerBound(mapping?.args?.max, schemaMaximum, Math.floor);
  const min = Math.max(schemaMinimum, mappedMinimum);
  const max = Math.min(schemaMaximum, mappedMaximum);
  if (min > max) throw new Error("SEMANTIC_MAPPING_CONFLICTS_WITH_OPENAPI_BOUNDS");
  return `{{faker '${mapping?.faker ?? "number.int"}' min=${min} max=${max}}}`;
}

function integerBound(value: unknown, fallback: number, round: (value: number) => number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(Number.MIN_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, round(value))) : fallback;
}

function stringTemplate(faker: string, schema: OpenApiSchema): string {
  const { min, max } = stringLengthBounds(schema);
  if (["string.alpha", "string.alphanumeric", "string.numeric"].includes(faker)) return `{{faker '${faker}' '{length: { min: ${min}, max: ${max}}}'}}`;
  if (["string.sample", "string.symbol", "string.nanoid"].includes(faker)) return `{{faker '${faker}' '{min: ${min}, max: ${max}}'}}`;
  return `{{faker '${faker}'}}`;
}

function stringLengthBounds(schema: OpenApiSchema): { min: number; max: number } {
  const minimum = nonNegativeInteger(schema.minLength, 0);
  const maximum = nonNegativeInteger(schema.maxLength, 20);
  return minimum <= maximum ? { min: minimum, max: maximum } : { min: maximum, max: minimum };
}

function nonNegativeInteger(value: unknown, fallback: number): number { return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback; }
function nullable(value: string): string { return `{{#if (boolean)}}null{{else}}${value}{{/if}}`; }
function nullableOrEmptyString(value: string): string { return `{{#if (boolean)}}null{{else}}{{#if (boolean)}}""{{else}}${value}{{/if}}{{/if}}`; }
function nullableOrEmpty(value: string, empty: "[]" | "{}"): string { return `{{#if (boolean)}}null{{else}}{{#if (boolean)}}${empty}{{else}}${value}{{/if}}{{/if}}`; }

function formatFaker(format: string | undefined): string | undefined {
  switch (format?.toLowerCase()) {
    case "uuid": return "string.uuid";
    case "email": return "internet.email";
    case "date": return "date.past";
    case "date-time": return "date.recent";
    case "uri":
    case "url": return "internet.url";
    case "ipv4": return "internet.ipv4";
    case "ipv6": return "internet.ipv6";
    case "hostname": return "internet.domainName";
    case "password": return "internet.password";
    case "binary": return "string.binary";
    default: return undefined;
  }
}

function isNumeric(schema: OpenApiSchema): boolean { return schema.type === "integer" || schema.type === "number"; }

function lacksNumericBounds(schema: OpenApiSchema, mapping: MockSemanticMapping | undefined): boolean {
  return typeof schema.minimum !== "number" && typeof schema.maximum !== "number" && typeof mapping?.args?.min !== "number" && typeof mapping?.args?.max !== "number";
}

function isDateLikePath(path: string): boolean {
  const name = path.split(".").at(-1)?.replace(/\[\]/g, "") ?? path;
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/);
  return words.some((word) => ["date", "time", "timestamp", "created", "updated", "expires", "expiry", "issued"].includes(word));
}

function validateMapping(mapping: MockSemanticMapping, schema: OpenApiSchema): void {
  if (isNumeric(schema)) {
    if (mapping.faker !== "number.int") throw new Error(`SEMANTIC_MAPPING_TYPE_MISMATCH: ${mapping.path} must use number.int for a numeric field`);
    for (const key of ["min", "max"] as const) if (mapping.args?.[key] !== undefined && typeof mapping.args[key] !== "number") throw new Error(`SEMANTIC_MAPPING_INVALID_ARGS: ${mapping.path}.${key} must be a number`);
    return;
  }
  if (schema.type === "boolean" && mapping.faker !== "datatype.boolean") throw new Error(`SEMANTIC_MAPPING_TYPE_MISMATCH: ${mapping.path} must use datatype.boolean for a boolean field`);
}

export function refreshMockArtifactTemplates(artifact: MockArtifact, openapi: LoadedOpenApi): MockArtifact {
  const mappings = new Map(artifact.endpoints.map((endpoint) => [endpoint.id, endpoint.mock.semanticMappings ?? []]));
  const regenerated = mockArtifactFromOpenApi(openapi, { origin: artifact.openapi.origin, reviewed: artifact.openapi.reviewStatus === "confirmed", randomEmptyData: artifact.policies.randomEmptyData, config: { mockoonPort: artifact.outputs.mockoon.port, whistleGroupName: artifact.outputs.whistle.groupName, mockPolicy: artifact.policies }, semanticMappingsByEndpoint: mappings });
  if (regenerated.endpoints.length !== artifact.endpoints.length || regenerated.endpoints.some((endpoint) => !mappings.has(endpoint.id))) throw new Error("SEMANTIC_MAPPING_ENDPOINT_MISMATCH: regenerate the artifact from OpenAPI first.");
  const existingById = new Map(artifact.endpoints.map((endpoint) => [endpoint.id, endpoint]));
  return { ...artifact, endpoints: regenerated.endpoints.map((endpoint) => mergeRefreshedEndpoint(existingById.get(endpoint.id)!, endpoint)) };
}

function mergeRefreshedEndpoint(existing: MockEndpoint, regenerated: MockEndpoint): MockEndpoint {
  const replacements = new Map(regenerated.mock.scenarios.filter(isGeneratedSuccess).map((scenario) => [scenario.name, scenario]));
  const scenarios = existing.mock.scenarios.map((scenario) => {
    const replacement = replacements.get(scenario.name);
    if (!replacement || scenario.origin !== "generated") return scenario;
    replacements.delete(scenario.name);
    return { ...scenario, bodyTemplate: replacement.bodyTemplate };
  });
  for (const scenario of replacements.values()) scenarios.push(scenario);
  return { ...existing, mock: { ...existing.mock, semanticMappings: regenerated.mock.semanticMappings, scenarios } };
}

function isGeneratedSuccess(scenario: { name: string; statusCode: number }): boolean { return scenario.statusCode >= 200 && scenario.statusCode < 300 && (scenario.name === "success-default" || scenario.name === "success-empty" || scenario.name === "success-random-empty" || /^success-list-\d+$/.test(scenario.name)); }
function unique(values: string[]): string[] { return [...new Set(values)]; }
