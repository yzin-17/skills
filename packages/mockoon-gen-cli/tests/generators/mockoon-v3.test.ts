import { describe, expect, it } from "vitest";
import type { MockArtifact } from "../../src/mock-artifact/types.js";
import { generateMockoonV3 } from "../../src/generators/mockoon-v3.js";

function artifact(): MockArtifact {
  return { schemaVersion: "0.3.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], policies: { listScenario: { enabled: true, itemCount: 20 } }, endpoints: [{ id: "ep-users", operationId: "listUsers", method: "GET", path: "/users", mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios: [{ name: "success-default", statusCode: 200, headers: {}, bodyTemplate: "{}", origin: "generated", enabled: true }, { name: "success-empty", statusCode: 200, headers: {}, bodyTemplate: "[]", origin: "generated", enabled: true }, { name: "error-default", statusCode: 500, headers: {}, bodyTemplate: "{}", origin: "generated", enabled: true }, { name: "success-list-20", statusCode: 200, headers: {}, bodyTemplate: "[{}]", origin: "generated", enabled: true }] } }], outputs: { whistle: { groupName: null, routes: [] }, mockoon: { port: 3100, defaultHeaders: { "Content-Type": "application/json" } } } };
}

describe("generateMockoonV3", () => {
  it("exports only enabled semantic mock scenarios", () => {
    const env = generateMockoonV3(artifact());
    expect(env.port).toBe(3100);
    expect(env.routes[0]?.responses.map((response) => response.label)).toEqual(["success-default", "success-empty", "error-default", "success-list-20"]);
  });
});
