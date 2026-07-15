import { describe, expect, it } from "vitest";
import { listScenarioShape, mockTemplate } from "../../src/openapi/mock-support.js";

describe("mock OpenAPI support", () => {
  it("detects root and single-property lists but flags ambiguity", () => {
    expect(listScenarioShape({ type: "array", items: { type: "string" } })).toEqual({ kind: "root" });
    expect(listScenarioShape({ type: "object", properties: { items: { type: "array", items: { type: "string" } } } })).toEqual({ kind: "property", property: "items" });
    expect(listScenarioShape({ type: "object", properties: { items: { type: "array" }, rows: { type: "array" } } })).toEqual({ kind: "ambiguous" });
  });

  it("preserves JSON primitive types in generated templates", () => {
    expect(mockTemplate({ type: "integer" })).toBe("{{faker 'number.int'}}");
    expect(mockTemplate({ type: "boolean" })).toBe("{{faker 'datatype.boolean'}}");
    expect(mockTemplate({ enum: [0, 1] })).toBe("0");
  });
});
