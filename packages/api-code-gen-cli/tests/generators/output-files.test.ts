import { describe, expect, it } from "vitest";
import type { ApiCodeArtifact, ApiEndpoint } from "../../src/artifact/types.js";
import { generateOutputFiles } from "../../src/generators/output-files.js";

function endpoint(id: string, operationId: string): ApiEndpoint {
  return { id, operationId, method: "GET", path: `/${operationId}`, dto: { response: `${operationId}DTO` }, vo: { name: `${operationId}VO`, fields: [] }, mapper: { name: `to${operationId}VO`, enabled: true, steps: [] } };
}

function artifact(output: ApiCodeArtifact["output"]): ApiCodeArtifact {
  return { schemaVersion: "0.1.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], endpoints: [endpoint("ep-one", "getOne"), endpoint("ep-two", "getTwo")], output };
}

describe("generateOutputFiles", () => {
  it("creates a single file for single-file output", () => {
    const files = generateOutputFiles(artifact({ splitApiOutput: false, file: "src/api.ts", transformResponse: true, reviewStatus: "confirmed" }));
    expect([...files.keys()]).toEqual(["src/api.ts"]);
    expect(files.get("src/api.ts")?.match(/declare function request/g)).toHaveLength(1);
  });

  it("groups endpoints in declared order and writes an optional index", () => {
    const files = generateOutputFiles(artifact({ splitApiOutput: true, directory: "src/api", files: [{ file: "second.ts", endpointIds: ["ep-two"] }, { file: "first.ts", endpointIds: ["ep-one"] }], indexFile: "index.ts", transformResponse: true, reviewStatus: "confirmed" }));
    expect([...files.keys()]).toEqual(["src/api/second.ts", "src/api/first.ts", "src/api/index.ts"]);
    expect(files.get("src/api/second.ts")).toContain("getTwo");
    expect(files.get("src/api/index.ts")).toBe('export * from "./second.js";\nexport * from "./first.js";\n');
  });

  it("rejects incomplete, duplicate, and unknown endpoint assignment", () => {
    const base = { splitApiOutput: true as const, directory: "src/api", indexFile: null, transformResponse: true, reviewStatus: "confirmed" as const };
    expect(() => generateOutputFiles(artifact({ ...base, files: [{ file: "one.ts", endpointIds: ["ep-one"] }] }))).toThrow("assigned exactly once");
    expect(() => generateOutputFiles(artifact({ ...base, files: [{ file: "one.ts", endpointIds: ["ep-one", "ep-one"] }, { file: "two.ts", endpointIds: ["ep-two"] }] }))).toThrow("assigned exactly once");
    expect(() => generateOutputFiles(artifact({ ...base, files: [{ file: "one.ts", endpointIds: ["missing"] }, { file: "two.ts", endpointIds: ["ep-two"] }] }))).toThrow("unknown endpoint");
  });
});
