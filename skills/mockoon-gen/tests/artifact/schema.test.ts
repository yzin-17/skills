import { describe, expect, it } from "vitest";
import { artifactSchema } from "../../src/artifact/schema.js";

const minimalArtifact = {
  schemaVersion: "0.2.0",
  sources: [],
  openapi: {
    file: ".mockoon-gen/openapi.yaml",
    sha256: "abc123",
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
      defaultHeaders: {
        "Content-Type": "application/json; charset=utf-8"
      },
      origin: "generated",
      reviewStatus: "unreviewed"
    }
  }
};

describe("artifactSchema", () => {
  it("accepts a minimal 0.2.0 artifact", () => {
    expect(() => artifactSchema.parse(minimalArtifact)).not.toThrow();
  });

  it("rejects old single source shape", () => {
    expect(() =>
      artifactSchema.parse({
        ...minimalArtifact,
        source: { type: "file", file: "docs/api.md" }
      })
    ).toThrow();
  });

  it("rejects generic status fields on reviewable nodes", () => {
    expect(() =>
      artifactSchema.parse({
        ...minimalArtifact,
        openapi: {
          ...minimalArtifact.openapi,
          status: "generated"
        }
      })
    ).toThrow();
  });

  it("accepts whistle routes with unresolved apiHost", () => {
    expect(() =>
      artifactSchema.parse({
        ...minimalArtifact,
        outputs: {
          ...minimalArtifact.outputs,
          whistle: {
            ...minimalArtifact.outputs.whistle,
            routes: [
              {
                endpointId: "endpoint-1",
                operationId: "getThings",
                method: "GET",
                apiHost: "pending-confirmation",
                sourcePath: "/things",
                sourcePattern: "/things",
                targetPort: null,
                targetPath: "/things",
                origin: "generated",
                reviewStatus: "unreviewed"
              }
            ]
          }
        }
      })
    ).not.toThrow();
  });
});
