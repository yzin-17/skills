import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadMockConfig } from "../../src/config-v2/load-config.js";

describe("loadMockConfig", () => {
  it("returns reduced defaults when missing", async () => {
    await expect(loadMockConfig(join(tmpdir(), "missing-mock-config.json"))).resolves.toEqual({
      mockoonPort: null,
      whistleGroupName: null,
      mockPolicy: { listScenario: { enabled: true, itemCount: 20 } }
    });
  });

  it("rejects unknown legacy fields and invalid policies", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const file = join(dir, "mockoon-gen.config.json");
    try {
      await writeFile(file, JSON.stringify({ artifactDir: "mockoon-gen" }), "utf8");
      await expect(loadMockConfig(file)).rejects.toThrow();
      await writeFile(file, JSON.stringify({ mockPolicy: { listScenario: { enabled: true, itemCount: 0 } } }), "utf8");
      await expect(loadMockConfig(file)).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
