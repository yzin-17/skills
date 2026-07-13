import { describe, expect, it } from "vitest";
import type { ApiArtifact } from "../../src/artifact/types.js";
import { generateMockoonEnvironment } from "../../src/generators/mockoon.js";

const artifact: ApiArtifact = {
  schemaVersion: "0.2.0",
  sources: [],
  openapi: { file: "mockoon-gen/openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" },
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
      vo: { name: "GetUserVO", owner: "api-skill", origin: "inferred", reviewStatus: "confirmed", fields: [] },
      mapper: { name: "toGetUserVO", enabled: true, origin: "inferred", reviewStatus: "confirmed", steps: [] },
      mock: {
        origin: "generated",
        reviewStatus: "confirmed",
        selection: { mode: "query", key: "scenario", defaultScenario: "success-default" },
        scenarios: [
          {
            name: "success-default",
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            bodyTemplate: "{ \"name\": \"{{faker 'person.firstName'}}\" }",
            origin: "generated",
            reviewStatus: "confirmed",
            enabled: true
          },
          {
            name: "success-secondary",
            statusCode: 200,
            headers: { "X-Scenario": "secondary", "Content-Type": "application/json" },
            bodyTemplate: "{ \"name\": \"{{faker 'person.lastName'}}\" }",
            origin: "generated",
            reviewStatus: "confirmed",
            enabled: true
          },
          {
            name: "disabled",
            statusCode: 500,
            headers: { "X-Disabled": "yes" },
            bodyTemplate: "{ \"name\": \"disabled\" }",
            origin: "generated",
            reviewStatus: "confirmed",
            enabled: false
          }
        ]
      },
      reviewItems: []
    }
  ],
  outputs: {
    apiCode: {
      enabled: true,
      suggestedFile: "src/api/generated/api.generated.ts",
      placement: "confirmed",
      integrationMode: "standalone",
      transformResponse: true,
      lastGeneratedSha256: null,
      origin: "generated",
      reviewStatus: "confirmed"
    },
    whistle: { file: "mockoon-gen/whistle.json", groupName: "User Detail Mock", routes: [] },
    mockoon: {
      file: "mockoon-gen/mockoon.json",
      port: 3100,
      defaultHeaders: { "Content-Type": "application/json; charset=utf-8", "X-Default": "true" },
      origin: "generated",
      reviewStatus: "confirmed"
    }
  }
};

describe("generateMockoonEnvironment", () => {
  it("generates enabled scenario responses with preserved template bodies", () => {
    const env = generateMockoonEnvironment(artifact);

    expect(env.port).toBe(3100);
    expect(env.routes).toHaveLength(1);
    expect(env.routes[0]?.method).toBe("get");
    expect(env.routes[0]?.endpoint).toBe("api/users/:id");
    expect(env.routes[0]?.responses).toHaveLength(2);
    expect(env.routes[0]?.responses[0]?.body).toBe("{ \"name\": \"{{faker 'person.firstName'}}\" }");
    expect(env.routes[0]?.responses[1]?.body).toBe("{ \"name\": \"{{faker 'person.lastName'}}\" }");
    expect(env.routes[0]?.responses[0]?.headers).toEqual([
      { key: "Content-Type", value: "application/json; charset=utf-8" },
      { key: "X-Default", value: "true" }
    ]);
    expect(env.routes[0]?.responses[1]?.headers).toEqual([
      { key: "Content-Type", value: "application/json" },
      { key: "X-Default", value: "true" },
      { key: "X-Scenario", value: "secondary" }
    ]);
  });

  it("throws when port is missing", () => {
    expect(() =>
      generateMockoonEnvironment({
        ...artifact,
        outputs: { ...artifact.outputs, mockoon: { ...artifact.outputs.mockoon, port: null } }
      })
    ).toThrow("Mockoon port");
  });
});
