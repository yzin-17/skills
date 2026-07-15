import { describe, expect, it } from "vitest";
import type { MockArtifact } from "../../src/artifact/types.js";
import { deriveWhistleRules, serializeWhistle } from "../../src/generators/whistle.js";

function artifact(): MockArtifact {
  return { schemaVersion: "0.3.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], policies: { listScenario: { enabled: true, itemCount: 20 } }, endpoints: [{ id: "ep-sku", operationId: "getSkuWarehouse", method: "GET", path: "/api/skus/{skuId}/warehouses/{warehouseId}", mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios: [] } }, { id: "ep-health", operationId: "health", method: "GET", path: "/health", mock: { selection: { mode: "query", key: "scenario", defaultScenario: "success-default" }, scenarios: [] } }], outputs: { whistle: { groupName: "SKU Mock", routes: [{ endpointId: "ep-sku", apiHost: "api.example.test" }, { endpointId: "ep-health", apiHost: "api.example.test" }] }, mockoon: { port: 3100, defaultHeaders: {} } } };
}

describe("Whistle v3", () => {
  it("derives captures from endpoint paths", () => {
    expect(deriveWhistleRules(artifact())).toEqual([
      "^api.example.test/api/skus/*/warehouses/* http://127.0.0.1:3100/api/skus/$1/warehouses/$2",
      "api.example.test/health http://127.0.0.1:3100/health"
    ]);
  });

  it("serializes JSON and CJS without a Default group", () => {
    const rules = deriveWhistleRules(artifact());
    expect(serializeWhistle("json", "SKU Mock", rules)).not.toContain("Default");
    expect(serializeWhistle("cjs", "SKU Mock", rules)).toContain('exports.groupName = "SKU Mock"');
  });

  it("rejects unknown endpoint route references", () => {
    const value = artifact();
    value.outputs.whistle.routes = [{ endpointId: "missing", apiHost: "api.example.test" }];
    expect(() => deriveWhistleRules(value)).toThrow("WHISTLE_ENDPOINT_UNKNOWN");
  });
});
