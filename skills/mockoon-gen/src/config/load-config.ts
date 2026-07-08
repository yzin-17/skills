import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultConfig, type MockoonGenConfig } from "./types.js";

export async function loadConfig(cwd: string): Promise<MockoonGenConfig> {
  try {
    const raw = await readFile(join(cwd, "mockoon-gen.config.json"), "utf8");
    return { ...defaultConfig, ...(JSON.parse(raw) as Partial<MockoonGenConfig>) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...defaultConfig };
    }

    throw error;
  }
}
