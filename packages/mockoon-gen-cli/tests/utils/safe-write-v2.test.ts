import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeMockOutput } from "../../src/utils/safe-write-v2.js";

describe("writeMockOutput", () => {
  it("writes absent content, skips identical content, and requires force to replace", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mockoon-gen-"));
    const file = join(cwd, "mockoon-gen/mockoon.json");
    try {
      await writeMockOutput(file, "one\n");
      expect(await readFile(file, "utf8")).toBe("one\n");
      await writeMockOutput(file, "one\n");
      await expect(writeMockOutput(file, "two\n")).rejects.toThrow("OUTPUT_EXISTS_DIFFERENT");
      await writeMockOutput(file, "two\n", { force: true });
      expect(await readFile(file, "utf8")).toBe("two\n");
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});
