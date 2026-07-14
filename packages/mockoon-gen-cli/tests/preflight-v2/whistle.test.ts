import { describe, expect, it } from "vitest";
import type { MockArtifact } from "../../src/mock-artifact/types.js";
import { whistleDiagnostics } from "../../src/preflight-v2/whistle.js";

const artifact = { schemaVersion: "0.3.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], policies: { listScenario: { enabled: false, itemCount: 20 } }, endpoints: [], outputs: { whistle: { groupName: null, routes: [{ endpointId: "missing", apiHost: "https://api.example.test/path" }] }, mockoon: { port: null, defaultHeaders: {} } } } as MockArtifact;
describe("whistleDiagnostics", () => { it("requires semantic group, host, endpoint, and target port", () => { expect(whistleDiagnostics(artifact).map((item) => item.code)).toEqual(expect.arrayContaining(["WHISTLE_GROUP_REQUIRED", "WHISTLE_HOST_INVALID", "WHISTLE_ENDPOINT_UNKNOWN", "MOCKOON_PORT_REQUIRED"])); }); });
