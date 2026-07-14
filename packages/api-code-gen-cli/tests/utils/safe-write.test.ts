import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeGeneratedFiles } from "../../src/utils/safe-write.js";

describe("writeGeneratedFiles", () => {
  it("writes absent output, skips identical output, and refuses clobber without force", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "api-code-gen-"));
    const file = join(cwd, "src/api.ts");
    try {
      await writeGeneratedFiles(new Map([[file, "one\n"]]));
      expect(await readFile(file, "utf8")).toBe("one\n");
      await writeGeneratedFiles(new Map([[file, "one\n"]]));
      await expect(writeGeneratedFiles(new Map([[file, "two\n"]]))).rejects.toThrow("OUTPUT_EXISTS_DIFFERENT");
      await writeGeneratedFiles(new Map([[file, "two\n"]]), { force: true });
      expect(await readFile(file, "utf8")).toBe("two\n");
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});
