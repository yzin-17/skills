import type { ApiArtifact, ArtifactEndpoint, MapperStep, VoField } from "../artifact/types.js";

interface ParsedProperty {
  name: string;
  type: string;
  path: string[];
}

interface ParsedAssignment {
  field: string;
  source?: string;
}

export function syncApiCodeToArtifact(artifact: ApiArtifact, code: string): ApiArtifact {
  const endpoints = artifact.endpoints.map((endpoint) => syncEndpoint(endpoint, code));

  return {
    ...artifact,
    endpoints,
    outputs: {
      ...artifact.outputs,
      apiCode: {
        ...artifact.outputs.apiCode,
        origin: "manual",
        reviewStatus: "needs-change"
      }
    }
  };
}

function syncEndpoint(endpoint: ArtifactEndpoint, code: string): ArtifactEndpoint {
  const dtoBlock = extractInterface(code, endpoint.dto.response);
  const voBlock = extractInterface(code, endpoint.vo.name);
  const mapperBlock = extractFunction(code, endpoint.mapper.name);

  if (!dtoBlock || !voBlock || !mapperBlock) {
    throw new Error(`Cannot sync ${endpoint.operationId}: generated DTO, VO, or mapper was not found.`);
  }

  parseProperties(dtoBlock);
  const voFields = parseProperties(voBlock).filter((field) => field.path.length === 1);
  const assignments = parseAssignments(mapperBlock);
  const oldFields = new Map(endpoint.vo.fields.map((field) => [field.name, field]));

  const fields: VoField[] = voFields.map((field) => {
    const previous = oldFields.get(field.name);
    const assignment = assignments.find((item) => item.field === field.name);
    const sourcePath = assignment?.source;
    const source = sourcePath ? { path: sourcePath, role: field.name } : undefined;

    return {
      ...(previous ?? {
        name: field.name,
        type: field.type,
        sources: [],
        confidence: "high",
        origin: "manual",
        reviewStatus: "needs-change"
      }),
      name: field.name,
      type: field.type,
      sources: source ? [source] : previous?.sources ?? [],
      origin: "manual",
      reviewStatus: "needs-change"
    };
  });

  const steps: MapperStep[] = assignments.map((assignment, index) => {
    const previous = endpoint.mapper.steps.find((step) => step.output === `vo.${assignment.field}`);
    return {
      ...(previous ?? {
        id: `sync-${endpoint.id}-${index + 1}`,
        order: index + 1,
        operation: "assign",
        inputs: [],
        output: `vo.${assignment.field}`,
        params: {},
        confidence: "high"
      }),
      order: index + 1,
      operation: assignment.source ? "assign" : "custom",
      inputs: assignment.source ? [assignment.source] : [],
      output: `vo.${assignment.field}`,
      reviewStatus: "needs-change"
    };
  });

  return {
    ...endpoint,
    vo: { ...endpoint.vo, fields, origin: "manual", reviewStatus: "needs-change" },
    mapper: { ...endpoint.mapper, steps, origin: "manual", reviewStatus: "needs-change" }
  };
}

function extractInterface(code: string, name: string): string | null {
  const start = code.indexOf(`export interface ${name} {`);
  if (start < 0) return null;
  return extractBalancedBlock(code, code.indexOf("{", start));
}

function extractFunction(code: string, name: string): string | null {
  const start = code.indexOf(`export function ${name}(`);
  if (start < 0) return null;
  return extractBalancedBlock(code, code.indexOf("{", start));
}

function extractBalancedBlock(code: string, openIndex: number): string | null {
  if (openIndex < 0) return null;
  let depth = 0;
  for (let index = openIndex; index < code.length; index += 1) {
    if (code[index] === "{") depth += 1;
    if (code[index] === "}") depth -= 1;
    if (depth === 0) return code.slice(openIndex + 1, index);
  }
  return null;
}

function parseProperties(block: string): ParsedProperty[] {
  const result: ParsedProperty[] = [];
  const stack: Array<{ indent: number; name: string }> = [];

  for (const line of block.split("\n")) {
    const indent = line.search(/\S|$/);
    const nested = line.match(/^\s*(["'][^"']+["']|[$A-Z_a-z][$\w-]*)\??:\s*\{$/);
    if (nested) {
      while (stack.at(-1) && stack.at(-1)!.indent >= indent) stack.pop();
      stack.push({ indent, name: parsePropertyName(nested[1]!) });
      continue;
    }

    const leaf = line.match(/^\s*(["'][^"']+["']|[$A-Z_a-z][$\w-]*)\??:\s*(.+);$/);
    if (leaf) {
      while (stack.at(-1) && stack.at(-1)!.indent >= indent) stack.pop();
      result.push({
        name: parsePropertyName(leaf[1]!),
        type: leaf[2]!.trim(),
        path: [...stack.map((item) => item.name), parsePropertyName(leaf[1]!)]
      });
    }
  }
  return result;
}

function parseAssignments(block: string): ParsedAssignment[] {
  return [...block.matchAll(/^\s*vo\.([$A-Z_a-z][$\w]*)\s*=\s*(.+);$/gm)].map((match) => ({
    field: match[1]!,
    source: typescriptAccessorToResponsePath(match[2]!.trim())
  }));
}

function typescriptAccessorToResponsePath(expression: string): string | undefined {
  if (expression === "undefined") return undefined;
  if (!expression.startsWith("dto")) return undefined;
  const segments = [...expression.matchAll(/\.([A-Za-z_$][\w$]*)|\[(["'])(.*?)\2\]/g)].map(
    (match) => match[1] ?? match[3]
  );
  if (segments.length === 0 || expression.replace(/dto(?:\.[A-Za-z_$][\w$]*|\[["'].*?["']\])*/g, "") !== "") {
    return undefined;
  }
  return `response.body${segments.map((segment) => (/^[A-Za-z_$][\w$]*$/.test(segment!) ? `.${segment}` : `[${JSON.stringify(segment)}]`)).join("")}`;
}

function parsePropertyName(value: string): string {
  return value.startsWith("\"") || value.startsWith("'") ? value.slice(1, -1) : value;
}
