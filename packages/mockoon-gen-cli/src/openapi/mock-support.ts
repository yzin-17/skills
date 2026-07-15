import type { OpenApiSchema } from "@yzin/openapi-reader";

export type ListScenarioShape = { kind: "none" } | { kind: "root" } | { kind: "property"; property: string } | { kind: "ambiguous" };
export function listScenarioShape(schema: OpenApiSchema | undefined): ListScenarioShape {
  if (schema?.type === "array") return { kind: "root" };
  const arrays = Object.entries(schema?.properties ?? {}).filter(([, property]) => property.type === "array");
  if (arrays.length === 1) return { kind: "property", property: arrays[0]![0] };
  return arrays.length > 1 ? { kind: "ambiguous" } : { kind: "none" };
}
export function mockTemplate(schema: OpenApiSchema | undefined): string {
  if (schema?.enum?.length) return JSON.stringify(schema.enum[0]);
  if (schema?.type === "integer" || schema?.type === "number") return "{{faker 'number.int'}}";
  if (schema?.type === "boolean") return "{{faker 'datatype.boolean'}}";
  return "{{faker 'string.sample'}}";
}
