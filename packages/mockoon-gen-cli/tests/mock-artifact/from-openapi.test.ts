import { loadOpenApi } from "@yzin/openapi-reader";
import { describe, expect, it } from "vitest";
import { mockArtifactFromOpenApi } from "../../src/mock-artifact/from-openapi.js";

describe("mockArtifactFromOpenApi", () => {
  it("freezes config policy and provenance without selecting a Whistle format", async () => {
    const openapi = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = mockArtifactFromOpenApi(openapi, { origin: "imported", reviewed: false, config: { mockoonPort: 3100, whistleGroupName: "User mock", mockPolicy: { listScenario: { enabled: true, itemCount: 10 } } } });
    expect(artifact.openapi.reviewStatus).toBe("unreviewed");
    expect(artifact.policies.listScenario.itemCount).toBe(10);
    expect(artifact.outputs.whistle.routes[0]).toEqual({ endpointId: "ep-get-user", apiHost: null });
    expect(artifact).not.toHaveProperty("outputs.whistle.file");
  });
});
