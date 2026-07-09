import { readFile } from "node:fs/promises";
import { defaultConfig, type MockoonGenConfig } from "./types.js";

export async function loadConfig(file: string): Promise<MockoonGenConfig> {
  try {
    const raw = await readFile(file, "utf8");
    return { ...defaultConfig, ...(JSON.parse(raw) as Partial<MockoonGenConfig>) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...defaultConfig };
    }

    throw error;
  }
}
