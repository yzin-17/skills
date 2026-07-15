import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load-config.js";

describe("loadConfig", () => {
  it("returns strict defaults when config is absent", async () => {
    expect(await loadConfig(join(tmpdir(), "missing-api-code-gen-config.json"))).toEqual({
      apiOutput: null,
      splitApiOutput: false,
      transformResponse: true
    });
  });

  it("rejects unknown and malformed config fields", async () => {
    const dir = await mkdtemp(join(tmpdir(), "api-code-gen-"));
    const file = join(dir, "api-code-gen.config.json");
    try {
      await writeFile(file, JSON.stringify({ apiOutput: 42 }), "utf8");
      await expect(loadConfig(file)).rejects.toThrow();
      await writeFile(file, JSON.stringify({ unknown: true }), "utf8");
      await expect(loadConfig(file)).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
