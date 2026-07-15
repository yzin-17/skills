import { describe, expect, it } from "vitest";
import { artifactSchema } from "../../src/artifact/schema.js";

const endpoint = {
  id: "ep-get-user",
  operationId: "getUser",
  method: "GET",
  path: "/api/users/{id}",
  dto: { response: "GetUserResponseDTO" },
  vo: { name: "GetUserVO", fields: [] },
  mapper: { name: "toGetUserVO", enabled: true, steps: [] }
};

const artifact = {
  schemaVersion: "0.1.0",
  openapi: {
    file: "src/pages/user/openapi.yaml",
    sha256: "abc123",
    origin: "imported",
    reviewStatus: "confirmed"
  },
  reviewItems: [],
  endpoints: [endpoint],
  output: {
    splitApiOutput: false,
    file: "src/pages/user/api.generated.ts",
    transformResponse: true,
    reviewStatus: "confirmed"
  }
};

describe("API code artifact schema", () => {
  it("accepts the 0.1.0 single-file model", () => {
    expect(artifactSchema.parse(artifact).schemaVersion).toBe("0.1.0");
  });

  it("accepts a split model with an optional index", () => {
    expect(() =>
      artifactSchema.parse({
        ...artifact,
        output: {
          splitApiOutput: true,
          directory: "src/pages/user/api",
          files: [{ file: "user-query.ts", endpointIds: ["ep-get-user"] }],
          indexFile: null,
          transformResponse: true,
          reviewStatus: "confirmed"
        }
      })
    ).not.toThrow();
  });

  it("rejects mock-only fields and endpoint-local review state", () => {
    expect(() => artifactSchema.parse({ ...artifact, mock: {} })).toThrow();
    expect(() => artifactSchema.parse({ ...artifact, outputs: {} })).toThrow();
    expect(() => artifactSchema.parse({ ...artifact, endpoints: [{ ...endpoint, reviewItems: [] }] })).toThrow();
    expect(() => artifactSchema.parse({ ...artifact, lastGeneratedSha256: "abc" })).toThrow();
  });

  it("rejects duplicate or empty split member files", () => {
    const output = {
      splitApiOutput: true,
      directory: "src/pages/user/api",
      files: [
        { file: "user.ts", endpointIds: ["ep-get-user"] },
        { file: "user.ts", endpointIds: ["ep-other"] }
      ],
      indexFile: "index.ts",
      transformResponse: true,
      reviewStatus: "confirmed"
    };
    expect(() => artifactSchema.parse({ ...artifact, output })).toThrow();
    expect(() => artifactSchema.parse({ ...artifact, output: { ...output, files: [{ file: "empty.ts", endpointIds: [] }] } })).toThrow();
  });
});
