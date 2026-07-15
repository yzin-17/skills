import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertMockoonGenPath, resolveMockProjectPath } from "../../src/utils/paths.js";

describe("mock path boundaries", () => {
  it("requires files directly under a visible mockoon-gen directory", () => {
    expect(() => assertMockoonGenPath("src/page/mockoon-gen/mock-artifact.json")).not.toThrow();
    expect(() => assertMockoonGenPath("src/page/.mockoon-gen/mock-artifact.json")).toThrow();
    expect(() => assertMockoonGenPath("src/page/mocks/mock-artifact.json")).toThrow();
  });

  it("rejects traversal and symlink escapes", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const outside = await mkdtemp(join(tmpdir(), "mockoon-gen-outside-"));
    try {
      await expect(resolveMockProjectPath(cwd, "../outside.json")).rejects.toThrow("OUTPUT_PATH_OUTSIDE_PROJECT");
      await mkdir(join(cwd, "src"));
      await symlink(outside, join(cwd, "src/link"));
      await expect(resolveMockProjectPath(cwd, "src/link/mockoon-gen/mockoon.json")).rejects.toThrow("OUTPUT_PATH_OUTSIDE_PROJECT");
    } finally { await rm(cwd, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
  });
});
