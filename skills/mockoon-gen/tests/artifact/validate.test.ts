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
        suggestedFile: "src/api/generated/api.generated.ts",
        placement: "pending-confirmation",
        integrationMode: "standalone",
        transformResponse: true,
        lastGeneratedSha256: null,
        origin: "generated",
        reviewStatus: "unreviewed"
      },
      whistle: {
        file: ".mockoon-gen/whistle.txt",
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
            file: ".mockoon-gen/whistle.txt",
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
});
