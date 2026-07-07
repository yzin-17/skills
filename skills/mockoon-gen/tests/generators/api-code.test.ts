import { describe, expect, it } from "vitest";
import type { ApiArtifact, ArtifactEndpoint, MapperStep, VoField } from "../../src/artifact/types.js";
import { generateApiCode } from "../../src/generators/api-code.js";

const defaultField: VoField = {
  name: "userName",
  type: "string",
  sources: [{ path: "response.body.user_name", role: "userName" }],
  confidence: "medium",
  origin: "inferred",
  reviewStatus: "confirmed"
};

const defaultStep: MapperStep = {
  id: "step-001",
  order: 1,
  operation: "rename",
  inputs: ["response.body.user_name"],
  output: "vo.userName",
  params: {},
  confidence: "medium",
  reviewStatus: "confirmed"
};

function createEndpoint(overrides: Partial<ArtifactEndpoint> = {}): ArtifactEndpoint {
  return {
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
      fields: [defaultField]
    },
    mapper: {
      name: "toGetUserVO",
      enabled: true,
      origin: "inferred",
      reviewStatus: "confirmed",
      steps: [defaultStep]
    },
    mock: {
      origin: "generated",
      reviewStatus: "confirmed",
      selection: { mode: "query", key: "scenario", defaultScenario: "success-default" },
      scenarios: []
    },
    reviewItems: [],
    ...overrides
  };
}

function createArtifact(overrides: Partial<ApiArtifact> = {}): ApiArtifact {
  return {
    schemaVersion: "0.2.0",
    sources: [],
    openapi: { file: ".mockoon-gen/openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" },
    reviewItems: [],
    endpoints: [createEndpoint()],
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
    },
    ...overrides
  };
}

describe("generateApiCode", () => {
  it("generates DTO, VO, mapper, and VO-returning request function", () => {
    const code = generateApiCode(createArtifact());
    expect(code).toContain("export interface GetUserResponseDTO");
    expect(code).toContain("export interface GetUserVO");
    expect(code).toContain("export function toGetUserVO");
    expect(code).toContain("export async function getUser");
    expect(code).toContain("return toGetUserVO(dto);");
  });

  it("generates nested DTO object shapes and quotes non-identifier keys", () => {
    const code = generateApiCode(
      createArtifact({
        endpoints: [
          createEndpoint({
            vo: {
              name: "GetUserVO",
              owner: "api-skill",
              origin: "inferred",
              reviewStatus: "confirmed",
              fields: [
                {
                  ...defaultField,
                  name: "displayName",
                  sources: [{ path: "response.body.user.profile.display-name", role: "displayName" }]
                },
                {
                  ...defaultField,
                  name: "isPrimary",
                  type: "boolean",
                  sources: [{ path: "response.body.meta.primary_flag", role: "isPrimary" }]
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
                  ...defaultStep,
                  output: "vo.displayName",
                  inputs: ["response.body.user.profile.display-name"]
                },
                {
                  ...defaultStep,
                  id: "step-002",
                  order: 2,
                  output: "vo.isPrimary",
                  inputs: ["response.body.meta.primary_flag"]
                }
              ]
            }
          })
        ]
      })
    );

    expect(code).toContain("user: {");
    expect(code).toContain("profile: {");
    expect(code).toContain('"display-name": string;');
    expect(code).toContain("meta: {");
    expect(code).toContain("primary_flag: boolean;");
    expect(code).toContain('vo.displayName = dto.user.profile["display-name"];');
  });

  it("accepts path parameters and encodes them in generated requests", () => {
    const code = generateApiCode(createArtifact());

    expect(code).toContain("export async function getUser(id: string | number): Promise<GetUserVO> {");
    expect(code).toContain('const path = `/api/users/${encodeURIComponent(String(id))}`;');
    expect(code).toContain('const dto = await request<GetUserResponseDTO>(path, { method: "GET" });');
  });

  it("throws explicit needsReview errors for unsupported mapper operations", () => {
    const code = generateApiCode(
      createArtifact({
        endpoints: [
          createEndpoint({
            mapper: {
              name: "toGetUserVO",
              enabled: true,
              origin: "inferred",
              reviewStatus: "confirmed",
              steps: [
                {
                  ...defaultStep,
                  operation: "concat",
                  inputs: ["response.body.first_name", "response.body.last_name"],
                  params: { separator: " " }
                }
              ]
            }
          })
        ]
      })
    );

    expect(code).toContain('throw new Error("mockoon-gen needsReview: Unsupported mapper operation concat in toGetUserVO");');
  });

  it("emits mapper steps in order", () => {
    const code = generateApiCode(
      createArtifact({
        endpoints: [
          createEndpoint({
            vo: {
              name: "GetUserVO",
              owner: "api-skill",
              origin: "inferred",
              reviewStatus: "confirmed",
              fields: [
                { ...defaultField, name: "firstName", sources: [{ path: "response.body.first_name", role: "firstName" }] },
                { ...defaultField, name: "displayName", sources: [{ path: "response.body.display_name", role: "displayName" }] }
              ]
            },
            mapper: {
              name: "toGetUserVO",
              enabled: true,
              origin: "inferred",
              reviewStatus: "confirmed",
              steps: [
                {
                  ...defaultStep,
                  id: "step-002",
                  order: 2,
                  inputs: ["response.body.display_name"],
                  output: "vo.displayName"
                },
                {
                  ...defaultStep,
                  id: "step-001",
                  order: 1,
                  inputs: ["response.body.first_name"],
                  output: "vo.firstName"
                }
              ]
            }
          })
        ]
      })
    );

    expect(code.indexOf("vo.firstName = dto.first_name;")).toBeLessThan(code.indexOf("vo.displayName = dto.display_name;"));
  });

  it("returns DTO directly when transformResponse is false", () => {
    const baseArtifact = createArtifact();
    const code = generateApiCode({
      ...baseArtifact,
      outputs: {
        ...baseArtifact.outputs,
        apiCode: { ...baseArtifact.outputs.apiCode, transformResponse: false }
      }
    });
    expect(code).toContain("export async function getUser(id: string | number): Promise<GetUserResponseDTO> {");
    expect(code).toContain('const path = `/api/users/${encodeURIComponent(String(id))}`;');
    expect(code).toContain("return request<GetUserResponseDTO>(path, { method: \"GET\" });");
  });
});
