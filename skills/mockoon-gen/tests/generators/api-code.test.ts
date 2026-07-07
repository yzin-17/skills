import { describe, expect, it } from "vitest";
import type { ApiArtifact } from "../../src/artifact/types.js";
import { generateApiCode } from "../../src/generators/api-code.js";

const artifact: ApiArtifact = {
  schemaVersion: "0.2.0",
  sources: [],
  openapi: { file: ".mockoon-gen/openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" },
  reviewItems: [],
  endpoints: [
    {
      id: "ep-get-user",
      operationId: "getUser",
      method: "GET",
      path: "/api/users/{id}",
      origin: "generated",
      reviewStatus: "confirmed",
      dto: { response: "GetUserResponseDTO" },
      vo: {
        name: "GetUserVO",
        owner: "api-skill",
        origin: "inferred",
        reviewStatus: "confirmed",
        fields: [
          {
            name: "userName",
            type: "string",
            sources: [{ path: "response.body.user_name", role: "userName" }],
            confidence: "medium",
            origin: "inferred",
            reviewStatus: "confirmed"
          }
        ]
      },
      mapper: {
        name: "toGetUserVO",
        enabled: true,
        origin: "inferred",
        reviewStatus: "confirmed",
        steps: [
          {
            id: "step-001",
            order: 1,
            operation: "rename",
            inputs: ["response.body.user_name"],
            output: "vo.userName",
            params: {},
            confidence: "medium",
            reviewStatus: "confirmed"
          }
        ]
      },
      mock: {
        origin: "generated",
        reviewStatus: "confirmed",
        selection: { mode: "query", key: "scenario", defaultScenario: "success-default" },
        scenarios: []
      },
      reviewItems: []
    }
  ],
  outputs: {
    apiCode: {
      suggestedFile: "src/api/generated/api.generated.ts",
      placement: "confirmed",
      integrationMode: "standalone",
      transformResponse: true,
      lastGeneratedSha256: null,
      origin: "generated",
      reviewStatus: "confirmed"
    },
    whistle: { file: ".mockoon-gen/whistle.txt", routes: [] },
    mockoon: {
      file: ".mockoon-gen/mockoon.json",
      port: 3100,
      defaultHeaders: {},
      origin: "generated",
      reviewStatus: "confirmed"
    }
  }
};

describe("generateApiCode", () => {
  it("generates DTO, VO, mapper, and VO-returning request function", () => {
    const code = generateApiCode(artifact);
    expect(code).toContain("export interface GetUserResponseDTO");
    expect(code).toContain("export interface GetUserVO");
    expect(code).toContain("export function toGetUserVO");
    expect(code).toContain("export async function getUser");
    expect(code).toContain("return toGetUserVO(dto);");
  });

  it("returns DTO directly when transformResponse is false", () => {
    const code = generateApiCode({
      ...artifact,
      outputs: {
        ...artifact.outputs,
        apiCode: { ...artifact.outputs.apiCode, transformResponse: false }
      }
    });
    expect(code).toContain("Promise<GetUserResponseDTO>");
    expect(code).toContain("return request<GetUserResponseDTO>");
  });
});
