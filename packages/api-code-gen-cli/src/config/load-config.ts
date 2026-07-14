import { readFile } from "node:fs/promises";
import { z } from "zod";
import { defaultConfig, type ApiCodeGenConfig } from "./types.js";

const configSchema = z.object({ apiOutput: z.string().min(1).nullable().default(null), splitApiOutput: z.boolean().default(false), transformResponse: z.boolean().default(true) }).strict();

export async function loadConfig(file: string): Promise<ApiCodeGenConfig> {
  try {
    return configSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...defaultConfig };
    throw error;
  }
}
