import { describe, expect, it } from "vitest";
import type { ApiCodeArtifact } from "../../src/artifact/types.js";
import { runPreflight } from "../../src/preflight/run-preflight.js";

function artifact(overrides: Partial<ApiCodeArtifact> = {}): ApiCodeArtifact {
  return { schemaVersion: "0.1.0", openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" }, reviewItems: [], endpoints: [{ id: "ep-user", operationId: "getUser", method: "GET", path: "/users/{id}", dto: { response: "GetUserDTO" }, vo: { name: "GetUserVO", fields: [] }, mapper: { name: "toGetUserVO", enabled: true, steps: [] } }], output: { splitApiOutput: false, file: "src/api.ts", transformResponse: true, reviewStatus: "confirmed" }, ...overrides };
}

describe("runPreflight", () => {
  it("blocks open review, stale OpenAPI, and an unconfirmed output plan", () => {
    const result = runPreflight(artifact({ openapi: { file: "openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "unreviewed" }, reviewItems: [{ id: "review-1", severity: "needsReview", scope: "global", path: "endpoints[0]", message: "Confirm mapping", resolutionStatus: "open" }], output: { splitApiOutput: false, file: "src/api.ts", transformResponse: true, reviewStatus: "unreviewed" } }), { currentOpenApiSha256: "changed", projectDir: "/project" });
    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["OPENAPI_UNREVIEWED", "OPENAPI_HASH_MISMATCH", "REVIEW_ITEM_OPEN", "OUTPUT_PLAN_UNCONFIRMED"]));
    expect(result.ready).toBe(false);
  });

  it("blocks invalid mapper operations and output paths outside the project", () => {
    const base = artifact();
    const result = runPreflight({ ...base, endpoints: [{ ...base.endpoints[0]!, mapper: { ...base.endpoints[0]!.mapper, steps: [{ id: "step-1", order: 1, operation: "custom", inputs: [], output: "vo.value", params: {}, confidence: "low" }] } }], output: { splitApiOutput: false, file: "../outside.ts", transformResponse: true, reviewStatus: "confirmed" } }, { currentOpenApiSha256: "abc", projectDir: "/project" });
    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(["MAPPER_OPERATION_UNSUPPORTED", "OUTPUT_PATH_OUTSIDE_PROJECT"]));
  });
});
