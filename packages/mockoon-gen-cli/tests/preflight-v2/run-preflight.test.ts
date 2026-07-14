import { describe, expect, it } from "vitest";
import type { MockArtifact } from "../../src/mock-artifact/types.js";
import { runMockPreflight } from "../../src/preflight-v2/run-preflight.js";

function artifact(): MockArtifact { return { schemaVersion: "0.3.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], policies: { listScenario: { enabled: false, itemCount: 20 } }, endpoints: [{ id: "ep-user", operationId: "getUser", method: "GET", path: "/users/{id}", mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios: [{ name: "success-default", statusCode: 200, headers: {}, bodyTemplate: "{}", origin: "generated", enabled: true }, { name: "success-empty", statusCode: 200, headers: {}, bodyTemplate: "{}", origin: "generated", enabled: true }, { name: "error-default", statusCode: 500, headers: {}, bodyTemplate: "{}", origin: "generated", enabled: true }] } }], outputs: { whistle: { groupName: "User mock", routes: [{ endpointId: "ep-user", apiHost: "api.example.test" }] }, mockoon: { port: 3100, defaultHeaders: {} } } }; }

describe("runMockPreflight", () => {
  it("checks shared OpenAPI state and target-specific review items", () => {
    const value = artifact();
    value.openapi.reviewStatus = "unreviewed";
    value.reviewItems.push({ id: "review-1", severity: "needsReview", scope: "output", path: "outputs.whistle", message: "Confirm host", resolutionStatus: "open" });
    const mockoon = runMockPreflight(value, { currentOpenApiSha256: "changed", target: "mockoon" });
    const whistle = runMockPreflight(value, { currentOpenApiSha256: "changed", target: "whistle" });
    expect(mockoon.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["OPENAPI_UNREVIEWED", "OPENAPI_HASH_MISMATCH"]));
    expect(mockoon.diagnostics.map((item) => item.code)).not.toContain("REVIEW_ITEM_OPEN");
    expect(whistle.diagnostics.map((item) => item.code)).toContain("REVIEW_ITEM_OPEN");
  });
});
