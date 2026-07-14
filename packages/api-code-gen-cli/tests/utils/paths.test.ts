import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveProjectPath } from "../../src/utils/paths.js";

describe("resolveProjectPath", () => {
  it("accepts contained project-relative paths and rejects traversal", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "api-code-gen-"));
    try {
      expect(await resolveProjectPath(cwd, "src/api.ts")).toMatch(/\/src\/api\.ts$/);
      await expect(resolveProjectPath(cwd, "../outside.ts")).rejects.toThrow("OUTPUT_PATH_OUTSIDE_PROJECT");
      await expect(resolveProjectPath(cwd, "/tmp/outside.ts")).rejects.toThrow("OUTPUT_PATH_OUTSIDE_PROJECT");
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });

  it("rejects an existing symlink parent escaping the project", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "api-code-gen-"));
    const outside = await mkdtemp(join(tmpdir(), "api-code-gen-outside-"));
    try {
      await mkdir(join(cwd, "src"));
      await symlink(outside, join(cwd, "src", "link"));
      await expect(resolveProjectPath(cwd, "src/link/api.ts")).rejects.toThrow("OUTPUT_PATH_OUTSIDE_PROJECT");
    } finally { await rm(cwd, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
  });
});
