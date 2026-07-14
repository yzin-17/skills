import type { ApiArtifact, ArtifactEndpoint, MapperStep } from "../artifact/types.js";

interface DtoFieldNode {
  children: Map<string, DtoFieldNode>;
  type?: string;
}

const RESPONSE_BODY_PREFIX = "response.body";
const TYPESCRIPT_RESERVED_WORDS = new Set([
  "abstract",
  "any",
  "as",
  "asserts",
  "async",
  "await",
  "bigint",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "module",
  "namespace",
  "never",
  "new",
  "null",
  "number",
  "object",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "require",
  "global",
  "return",
  "set",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "unique",
  "unknown",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);

export function generateApiCode(artifact: ApiArtifact): string {
  const body = [
    "declare function request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T>;",
    "",
    ...artifact.endpoints.flatMap((endpoint) => generateEndpoint(endpoint, artifact.outputs.apiCode.transformResponse))
  ].join("\n");

  return `${body}\n`;
}

function generateEndpoint(endpoint: ArtifactEndpoint, transformResponse: boolean): string[] {
  const dto = endpoint.dto.response;
  const vo = endpoint.vo.name;
  const mapper = endpoint.mapper.name;
  const responseType = transformResponse ? vo : dto;
  const dtoShape = buildDtoShape(endpoint);
  const pathParams = extractPathParams(endpoint.path);
  const pathParamNames = generatePathParamNames(pathParams);
  const requestPath = generateRequestPath(endpoint.path, pathParamNames);

  return [
    `export interface ${dto} {`,
    ...generateDtoShapeLines(dtoShape, 1),
    "}",
    "",
    `export interface ${vo} {`,
    ...endpoint.vo.fields.map((field) => `  ${field.name}: ${field.type};`),
    "}",
    "",
    `export function ${mapper}(dto: ${dto}): ${vo} {`,
    `  const vo = {} as ${vo};`,
    ...endpoint.mapper.steps.slice().sort((left, right) => left.order - right.order).map((step) => generateMapperStep(step, mapper)),
    "  return vo;",
    "}",
    "",
    `export async function ${endpoint.operationId}(${generatePathParamSignature(pathParamNames)}): Promise<${responseType}> {`,
    requestPath ? `  const path = ${requestPath};` : "",
    transformResponse
      ? `  const dto = await request<${dto}>(${requestPath ? "path" : `"${endpoint.path}"`}, { method: "${endpoint.method}" });`
      : `  return request<${dto}>(${requestPath ? "path" : `"${endpoint.path}"`}, { method: "${endpoint.method}" });`,
    transformResponse ? `  return ${mapper}(dto);` : "",
    "}",
    ""
  ].filter((line) => line !== "");
}

function generateMapperStep(step: MapperStep, mapperName: string): string {
  if (step.operation === "rename" || step.operation === "assign") {
    return `  ${step.output} = ${sourcePathToAccessor(step.inputs[0]) ?? "undefined"};`;
  }

  return `  throw new Error("mockoon-gen needsReview: Unsupported mapper operation ${step.operation} in ${mapperName}");`;
}

function buildDtoShape(endpoint: ArtifactEndpoint): DtoFieldNode {
  const root: DtoFieldNode = { children: new Map() };

  for (const field of endpoint.vo.fields) {
    const sourcePath = field.sources[0]?.path;
    const segments = parseResponseBodyPath(sourcePath);
    if (!segments) {
      continue;
    }

    if (segments.length === 0) {
      continue;
    }

    let current = root;
    for (const segment of segments) {
      let child = current.children.get(segment);
      if (!child) {
        child = { children: new Map() };
        current.children.set(segment, child);
      }
      current = child;
    }
    current.type = field.type;
  }

  return root;
}

function generateDtoShapeLines(node: DtoFieldNode, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  for (const [key, child] of node.children) {
    if (child.children.size > 0) {
      lines.push(`${indent}${formatPropertyKey(key)}: {`);
      lines.push(...generateDtoShapeLines(child, depth + 1));
      lines.push(`${indent}};`);
      continue;
    }

    lines.push(`${indent}${formatPropertyKey(key)}: ${child.type ?? "unknown"};`);
  }

  return lines;
}

function formatPropertyKey(key: string): string {
  return isIdentifier(key) ? key : JSON.stringify(key);
}

function sourcePathToAccessor(path?: string): string | null {
  const segments = parseResponseBodyPath(path);
  if (!segments) {
    return null;
  }

  if (segments.length === 0) {
    return "dto";
  }

  return `dto${segments.map((segment) => (isIdentifier(segment) ? `.${segment}` : `[${JSON.stringify(segment)}]`)).join("")}`;
}

function extractPathParams(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? "").filter((segment) => segment.length > 0);
}

function generatePathParamSignature(pathParamNames: string[]): string {
  return pathParamNames.map((pathParamName) => `${pathParamName}: string | number`).join(", ");
}

function generateRequestPath(path: string, pathParamNames: string[]): string | null {
  if (pathParamNames.length === 0) {
    return null;
  }

  let paramIndex = 0;
  const template = path.replace(/\{([^}]+)\}/g, () => {
    const paramName = pathParamNames[paramIndex];
    paramIndex += 1;
    return `\${encodeURIComponent(String(${paramName}))}`;
  });

  return `\`${template}\``;
}

function generatePathParamNames(pathParams: string[]): string[] {
  const usedNames = new Set<string>();

  return pathParams.map((pathParam, index) => {
    const baseName = sanitizePathParamName(pathParam, index);
    let candidate = baseName;
    let suffix = 2;

    while (usedNames.has(candidate) || TYPESCRIPT_RESERVED_WORDS.has(candidate)) {
      candidate = `${baseName}_${suffix}`;
      suffix += 1;
    }

    usedNames.add(candidate);
    return candidate;
  });
}

function sanitizePathParamName(pathParam: string, index: number): string {
  let normalized = pathParam.replace(/[^A-Za-z0-9_$]/g, "_");
  if (!normalized) {
    return `pathParam${index + 1}`;
  }

  if (!/^[$A-Z_]/i.test(normalized)) {
    normalized = `_${normalized}`;
  }

  if (TYPESCRIPT_RESERVED_WORDS.has(normalized)) {
    normalized = `${normalized}_`;
  }

  return isIdentifier(normalized) ? normalized : `pathParam${index + 1}`;
}

function parseResponseBodyPath(path?: string): string[] | null {
  if (!path?.startsWith(RESPONSE_BODY_PREFIX)) {
    return null;
  }

  const remainder = path.slice(RESPONSE_BODY_PREFIX.length);
  if (remainder.length === 0) {
    return [];
  }

  const segments: string[] = [];
  let index = 0;

  while (index < remainder.length) {
    const marker = remainder[index];

    if (marker === ".") {
      const segmentStart = index + 1;
      let segmentEnd = segmentStart;
      while (segmentEnd < remainder.length && remainder[segmentEnd] !== "." && remainder[segmentEnd] !== "[") {
        segmentEnd += 1;
      }

      if (segmentEnd === segmentStart) {
        return null;
      }

      segments.push(remainder.slice(segmentStart, segmentEnd));
      index = segmentEnd;
      continue;
    }

    if (marker === "[") {
      const literalEnd = findBracketLiteralEnd(remainder, index);
      if (literalEnd < 0) {
        return null;
      }

      const literal = remainder.slice(index + 1, literalEnd);
      try {
        segments.push(JSON.parse(literal));
      } catch {
        return null;
      }
      index = literalEnd + 1;
      continue;
    }

    return null;
  }

  return segments;
}

function findBracketLiteralEnd(path: string, bracketStart: number): number {
  let index = bracketStart + 1;
  let inString = false;
  let escaped = false;

  while (index < path.length) {
    const char = path[index];

    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      index += 1;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      index += 1;
      continue;
    }

    if (char === "]" && !inString) {
      return index;
    }

    index += 1;
  }

  return -1;
}

function isIdentifier(value: string): boolean {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(value);
}
