import { describe, expect, it } from "vitest";
import { mockArtifactSchema } from "../../src/mock-artifact/schema.js";

const artifact = {
  schemaVersion: "0.3.0",
  openapi: { file: "mockoon-gen/openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" },
  reviewItems: [],
  policies: { listScenario: { enabled: true, itemCount: 20 } },
  endpoints: [{ id: "ep-get-user", operationId: "getUser", method: "GET", path: "/users/{id}", mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios: [] } }],
  outputs: { whistle: { groupName: null, routes: [{ endpointId: "ep-get-user", apiHost: null }] }, mockoon: { port: null, defaultHeaders: { "Content-Type": "application/json; charset=utf-8" } } }
};

describe("mockArtifactSchema", () => {
  it("accepts schema 0.3.0 with semantic mock outputs", () => {
    expect(mockArtifactSchema.parse(artifact).schemaVersion).toBe("0.3.0");
  });

  it("rejects API code and derived Whistle fields", () => {
    expect(() => mockArtifactSchema.parse({ ...artifact, dto: {} })).toThrow();
    expect(() => mockArtifactSchema.parse({ ...artifact, endpoints: [{ ...artifact.endpoints[0], reviewItems: [] }] })).toThrow();
    expect(() => mockArtifactSchema.parse({ ...artifact, outputs: { ...artifact.outputs, whistle: { ...artifact.outputs.whistle, routes: [{ endpointId: "ep-get-user", apiHost: null, sourcePattern: "/users/*" }] } } })).toThrow();
  });

  it("requires review resolutions for closed items and valid list policy counts", () => {
    expect(() => mockArtifactSchema.parse({ ...artifact, reviewItems: [{ id: "review-1", severity: "fatal", scope: "global", path: "endpoints[0]", message: "Review", resolutionStatus: "resolved" }] })).toThrow();
    expect(() => mockArtifactSchema.parse({ ...artifact, policies: { listScenario: { enabled: true, itemCount: 1001 } } })).toThrow();
  });
});
