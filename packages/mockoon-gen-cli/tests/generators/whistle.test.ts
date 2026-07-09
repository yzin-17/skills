import { describe, expect, it } from "vitest";
import type { WhistleRoute } from "../../src/artifact/types.js";
import { generateWhistleCliModule, generateWhistleRules } from "../../src/generators/whistle.js";

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
  it("generates Whistle import JSON without Default rules", () => {
    const exported = JSON.parse(generateWhistleRules([route], "User Detail Mock")) as Record<string, unknown>;

    expect(exported).toEqual({
      "User Detail Mock": "^api.example.com/api/users/* http://127.0.0.1:3100/api/users/$1\n",
      "": ["User Detail Mock"]
    });
    expect(exported).not.toHaveProperty("Default");
  });

  it("generates a Whistle CLI module for w2 add filepath", () => {
    expect(generateWhistleCliModule([route], "User Detail Mock")).toBe(`exports.groupName = "User Detail Mock";
exports.name = "User Detail Mock";
exports.rules = \`^api.example.com/api/users/* http://127.0.0.1:3100/api/users/$1
\`;
`);
  });

  it("keeps static routes as plain URL matchers", () => {
    const staticRoute: WhistleRoute = {
      ...route,
      sourcePath: "/api/profile",
      sourcePattern: "/api/profile",
      targetPath: "/api/profile"
    };

    const exported = JSON.parse(generateWhistleRules([staticRoute], "User Detail Mock")) as Record<string, unknown>;

    expect(exported["User Detail Mock"]).toBe("api.example.com/api/profile http://127.0.0.1:3100/api/profile\n");
  });

  it("throws when groupName is missing", () => {
    expect(() => generateWhistleRules([route], null)).toThrow("groupName");
    expect(() => generateWhistleCliModule([route], null)).toThrow("groupName");
  });

  it("throws when apiHost is pending", () => {
    expect(() => generateWhistleRules([{ ...route, apiHost: "pending-confirmation" }], "User Detail Mock")).toThrow("apiHost");
    expect(() => generateWhistleCliModule([{ ...route, apiHost: "pending-confirmation" }], "User Detail Mock")).toThrow("apiHost");
  });

  it("throws when targetPort is missing", () => {
    expect(() => generateWhistleRules([{ ...route, targetPort: null }], "User Detail Mock")).toThrow("targetPort");
    expect(() => generateWhistleCliModule([{ ...route, targetPort: null }], "User Detail Mock")).toThrow("targetPort");
  });
});
