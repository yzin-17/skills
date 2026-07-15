import { describe, expect, it } from "vitest";
import { unsupportedOpenApiDiagnostics } from "../../src/openapi/support.js";

describe("unsupportedOpenApiDiagnostics", () => {
  it("reports inputs the current API generator cannot represent", () => {
    const diagnostics = unsupportedOpenApiDiagnostics({
      openapi: "3.0.3",
      paths: {
        "/users": {
          post: {
            requestBody: {},
            parameters: [{ name: "q", in: "query" }],
            responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } }
          }
        }
      }
    });
    expect(diagnostics.map((item) => item.code)).toEqual(["OPENAPI_FEATURE_UNSUPPORTED", "OPENAPI_FEATURE_UNSUPPORTED", "OPENAPI_FEATURE_UNSUPPORTED"]);
  });
});
