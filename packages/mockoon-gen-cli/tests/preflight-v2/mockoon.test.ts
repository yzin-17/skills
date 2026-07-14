import { describe, expect, it } from "vitest";
import { mockoonDiagnostics } from "../../src/preflight-v2/mockoon.js";
import type { MockArtifact } from "../../src/mock-artifact/types.js";

const artifact = { schemaVersion: "0.3.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], policies: { listScenario: { enabled: false, itemCount: 20 } }, endpoints: [{ id: "ep-user", operationId: "getUser", method: "GET", path: "/users", mock: { selection: { mode: "query", defaultScenario: "success-default" }, scenarios: [] } }], outputs: { whistle: { groupName: null, routes: [] }, mockoon: { port: null, defaultHeaders: {} } } } as MockArtifact;
describe("mockoonDiagnostics", () => { it("requires a port and base scenarios", () => { expect(mockoonDiagnostics(artifact).map((item) => item.code)).toEqual(expect.arrayContaining(["MOCKOON_PORT_REQUIRED", "MOCK_SCENARIO_REQUIRED"])); }); });
