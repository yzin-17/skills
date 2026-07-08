import { describe, expect, it } from "vitest";
import type { WhistleRoute } from "../../src/artifact/types.js";
import { generateWhistleRules } from "../../src/generators/whistle.js";

const route: WhistleRoute = {
  endpointId: "ep-get-user",
  operationId: "getUser",
  method: "GET",
  apiHost: "api.example.com",
  sourcePath: "/api/users/{id}",
  sourcePattern: "/api/users/*",
  targetPort: 3100,
  targetPath: "/api/users/:id",
  origin: "manual",
  reviewStatus: "confirmed"
};

describe("generateWhistleRules", () => {
  it("generates host plus path forwarding", () => {
    expect(generateWhistleRules([route])).toBe("api.example.com/api/users/* http://127.0.0.1:3100/api/users/:id\n");
  });

  it("throws when apiHost is pending", () => {
    expect(() => generateWhistleRules([{ ...route, apiHost: "pending-confirmation" }])).toThrow("apiHost");
  });

  it("throws when targetPort is missing", () => {
    expect(() => generateWhistleRules([{ ...route, targetPort: null }])).toThrow("targetPort");
  });
});
