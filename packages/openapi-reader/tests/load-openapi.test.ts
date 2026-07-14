import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadOpenApi, sha256 } from "../src/index.js";

describe("OpenAPI reader", () => {
  it("loads YAML, preserves OpenAPI input features, and normalizes the source path", async () => {
    const loaded = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const operation = loaded.document.paths["/api/users/{id}"]?.get;

    expect(isAbsolute(loaded.file)).toBe(true);
    expect(loaded.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(operation?.operationId).toBe("getUser");
    expect(operation?.parameters?.[0]?.name).toBe("id");
  });

  it("loads JSON and preserves request bodies, refs, and composition keywords", async () => {
    const dir = await mkdtemp(join(tmpdir(), "openapi-reader-"));
    const file = join(dir, "openapi.json");
    const input = {
      openapi: "3.0.3",
      paths: {
        "/users": {
          post: {
            operationId: "createUser",
            requestBody: { $ref: "#/components/requestBodies/User" },
            responses: {
              "201": {
                content: {
                  "application/json": {
                    schema: { allOf: [{ $ref: "#/components/schemas/User" }] }
                  }
                }
              }
            }
          }
        }
      }
    };

    try {
      await writeFile(file, JSON.stringify(input), "utf8");
      const loaded = await loadOpenApi(file);
      const operation = loaded.document.paths["/users"]?.post;

      expect(operation?.requestBody).toEqual({ $ref: "#/components/requestBodies/User" });
      expect(operation?.responses?.["201"]?.content?.["application/json"]?.schema?.allOf).toEqual([
        { $ref: "#/components/schemas/User" }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("hashes raw input bytes deterministically", () => {
    const input = "openapi: 3.0.3\\npaths: {}\\n";
    expect(sha256(input)).toBe(createHash("sha256").update(input).digest("hex"));
  });

  it.each([
    ["paths: {}", "missing openapi"],
    ["openapi: 3.0.3", "missing paths"],
    ["openapi: 3.0.3\npaths:\n  /users: []", "non-object path item"]
  ])("rejects %s", async (source) => {
    const dir = await mkdtemp(join(tmpdir(), "openapi-reader-"));
    const file = join(dir, "invalid.yaml");

    try {
      await writeFile(file, source, "utf8");
      await expect(loadOpenApi(file)).rejects.toThrow("Invalid OpenAPI document");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
