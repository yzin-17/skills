import { loadOpenApi } from "@yzin/openapi-reader";
import { describe, expect, it } from "vitest";
import { artifactFromOpenApi } from "../../src/artifact/from-openapi.js";

describe("artifactFromOpenApi", () => {
  it("creates an independent reviewed API code draft", async () => {
    const openapi = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(openapi, {
      origin: "imported",
      reviewed: true,
      config: { apiOutput: "src/pages/user/api.generated.ts", splitApiOutput: false, transformResponse: true }
    });

    expect(artifact.openapi.reviewStatus).toBe("confirmed");
    expect(artifact.endpoints[0]?.dto.response).toBe("GetUserResponseDTO");
    expect(artifact.endpoints[0]?.vo.fields[1]?.name).toBe("userName");
    expect(artifact.output).toMatchObject({ splitApiOutput: false, reviewStatus: "unreviewed" });
    expect("mock" in artifact.endpoints[0]!).toBe(false);
  });

  it("creates an incomplete split plan without invented groups", async () => {
    const openapi = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(openapi, {
      origin: "manual",
      reviewed: true,
      config: { apiOutput: "src/pages/user/api", splitApiOutput: true, transformResponse: false }
    });

    expect(artifact.output).toEqual({
      splitApiOutput: true,
      directory: "src/pages/user/api",
      files: [],
      indexFile: null,
      transformResponse: false,
      reviewStatus: "unreviewed"
    });
  });
});
