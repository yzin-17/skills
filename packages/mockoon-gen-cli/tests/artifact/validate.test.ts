import { describe, expect, it } from "vitest";
import type { ApiArtifact } from "../../src/artifact/types.js";
import { validateArtifact } from "../../src/artifact/validate.js";

function artifact(overrides: Partial<ApiArtifact> = {}): ApiArtifact {
  return {
    schemaVersion: "0.2.0",
    sources: [],
    openapi: {
      file: ".mockoon-gen/openapi.yaml",
      sha256: "abc",
      origin: "generated",
      reviewStatus: "confirmed"
    },
    reviewItems: [],
    endpoints: [],
    outputs: {
      apiCode: {
        enabled: true,
        suggestedFile: "src/api/generated/api.generated.ts",
        placement: "pending-confirmation",
        integrationMode: "standalone",
        transformResponse: true,
        lastGeneratedSha256: null,
        origin: "generated",
        reviewStatus: "unreviewed"
      },
      whistle: {
        file: ".mockoon-gen/whistle.json",
        groupName: null,
        routes: []
      },
      mockoon: {
        file: ".mockoon-gen/mockoon.json",
        port: null,
        defaultHeaders: {},
        origin: "generated",
        reviewStatus: "unreviewed"
      }
    },
    ...overrides
  };
}

function endpoint(overrides: Partial<ApiArtifact["endpoints"][number]> = {}): ApiArtifact["endpoints"][number] {
  return {
    id: "ep-get-user",
    operationId: "getUser",
    method: "GET",
    path: "/api/users/{id}",
    origin: "generated",
    reviewStatus: "unreviewed",
    dto: {
      response: "GetUserResponseDTO"
    },
    vo: {
      name: "GetUserVO",
      owner: "api-skill",
      origin: "inferred",
      reviewStatus: "unreviewed",
      fields: [
        {
          name: "id",
          type: "string",
          sources: [{ path: "response.body.id", role: "id" }],
          confidence: "medium",
          origin: "inferred",
          reviewStatus: "unreviewed",
          description: "User id",
          reason: "Generated from response field id"
        }
      ]
    },
    mapper: {
      name: "toGetUserVO",
      enabled: true,
      origin: "inferred",
      reviewStatus: "unreviewed",
      steps: [
        {
          id: "step-001",
          order: 1,
          operation: "rename",
          inputs: ["response.body.id"],
          output: "vo.id",
          params: {},
          description: "Map id to id",
          confidence: "medium",
          reviewStatus: "unreviewed"
        }
      ]
    },
    mock: {
      origin: "generated",
      reviewStatus: "unreviewed",
      selection: {
        mode: "query",
        key: "scenario",
        defaultScenario: "success-default"
      },
      scenarios: []
    },
    reviewItems: [],
    ...overrides
  };
}

describe("validateArtifact", () => {
  it("fails strict mode when generated OpenAPI is unreviewed", () => {
    const result = validateArtifact(
      artifact({
        openapi: {
          file: ".mockoon-gen/openapi.yaml",
          sha256: "abc",
          origin: "generated",
          reviewStatus: "unreviewed"
        }
      }),
      { strict: true, currentOpenApiSha256: "abc" }
    );

    expect(result.fatal.map((item) => item.message)).toContain(
      "OpenAPI generated from loose documents has not been reviewed."
    );
  });

  it("reports hash drift as fatal", () => {
    const result = validateArtifact(artifact(), { strict: false, currentOpenApiSha256: "changed" });
    expect(result.fatal[0]?.message).toBe("OpenAPI content hash changed; artifact is stale.");
  });

  it("reports missing whistle host as needsReview", () => {
    const result = validateArtifact(
      artifact({
        outputs: {
          ...artifact().outputs,
          whistle: {
            file: ".mockoon-gen/whistle.json",
            groupName: "User Detail Mock",
            routes: [
              {
                endpointId: "ep-get-user",
                operationId: "getUser",
                method: "GET",
                apiHost: "pending-confirmation",
                sourcePath: "/api/users/{id}",
                sourcePattern: "/api/users/*",
                targetPort: 3100,
                targetPath: "/api/users/:id",
                origin: "generated",
                reviewStatus: "unreviewed"
              }
            ]
          }
        }
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.needsReview[0]?.path).toBe("outputs.whistle.routes[0].apiHost");
  });

  it("reports missing whistle target port as needsReview", () => {
    const result = validateArtifact(
      artifact({
        outputs: {
          ...artifact().outputs,
          whistle: {
            file: ".mockoon-gen/whistle.json",
            groupName: "User Detail Mock",
            routes: [
              {
                endpointId: "ep-get-user",
                operationId: "getUser",
                method: "GET",
                apiHost: "api.example.test",
                sourcePath: "/api/users/{id}",
                sourcePattern: "/api/users/*",
                targetPort: null,
                targetPath: "/api/users/:id",
                origin: "generated",
                reviewStatus: "unreviewed"
              }
            ]
          }
        }
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.needsReview).toContainEqual(
      expect.objectContaining({
        path: "outputs.whistle.routes[0].targetPort",
        message: "Mockoon target port is unconfirmed."
      })
    );
  });

  it("reports whistle path params without capture substitutions as fatal", () => {
    const result = validateArtifact(
      artifact({
        outputs: {
          ...artifact().outputs,
          whistle: {
            file: "mockoon-gen/whistle.json",
            groupName: "User Detail Mock",
            routes: [
              {
                endpointId: "ep-get-user",
                operationId: "getUser",
                method: "GET",
                apiHost: "api.example.test",
                sourcePath: "/api/users/{id}/orgs/{orgId}",
                sourcePattern: "/api/users/*/orgs/*",
                targetPort: 3100,
                targetPath: "/api/users/:id/orgs/:orgId",
                origin: "generated",
                reviewStatus: "unreviewed"
              }
            ]
          }
        }
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.fatal).toContainEqual(
      expect.objectContaining({
        path: "outputs.whistle.routes[0].targetPath",
        message: "Whistle target path must use $1, $2, ... captures for OpenAPI path params."
      })
    );
  });

  it("reports whistle matcher operators in sourcePattern as fatal", () => {
    const result = validateArtifact(
      artifact({
        outputs: {
          ...artifact().outputs,
          whistle: {
            file: "mockoon-gen/whistle.json",
            groupName: "SKU Mock",
            routes: [
              {
                endpointId: "ep-get-available-warehouses",
                operationId: "getAvailableWarehouses",
                method: "GET",
                apiHost: "localhost:3000",
                sourcePath: "/api/skus/{skuId}/available-warehouses",
                sourcePattern: "/api/skus/*/available-warehouses$",
                targetPort: 6000,
                targetPath: "/api/skus/$1/available-warehouses",
                origin: "generated",
                reviewStatus: "unreviewed"
              }
            ]
          }
        }
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.fatal).toContainEqual(
      expect.objectContaining({
        path: "outputs.whistle.routes[0].sourcePattern",
        message: "Whistle sourcePattern must be path-only; do not store matcher operators such as ^ or $ in the artifact."
      })
    );
  });

  it("reports missing whistle group name as needsReview", () => {
    const result = validateArtifact(artifact(), { strict: false, currentOpenApiSha256: "abc" });

    expect(result.needsReview).toContainEqual(
      expect.objectContaining({
        path: "outputs.whistle.groupName",
        message: "Whistle group name is unconfirmed."
      })
    );
  });

  it("reports low-confidence VO fields as needsReview", () => {
    const result = validateArtifact(
      artifact({
        endpoints: [
          endpoint({
            vo: {
              ...endpoint().vo,
              fields: [
                {
                  ...endpoint().vo.fields[0],
                  confidence: "low"
                }
              ]
            }
          })
        ]
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.needsReview).toContainEqual(
      expect.objectContaining({
        path: "endpoints[0].vo.fields[0]",
        message: "VO field id is low confidence."
      })
    );
  });

  it("reports low-confidence mapper steps as needsReview", () => {
    const result = validateArtifact(
      artifact({
        endpoints: [
          endpoint({
            mapper: {
              ...endpoint().mapper,
              steps: [
                {
                  ...endpoint().mapper.steps[0],
                  confidence: "low"
                }
              ]
            }
          })
        ]
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.needsReview).toContainEqual(
      expect.objectContaining({
        path: "endpoints[0].mapper.steps[0]",
        message: "Mapper step step-001 is low confidence."
      })
    );
  });
});
