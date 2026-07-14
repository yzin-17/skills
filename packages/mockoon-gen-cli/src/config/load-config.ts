import { readFile } from "node:fs/promises";
import { z } from "zod";
import { defaultMockConfig, type MockGenConfig } from "./types.js";
const schema = z.object({ mockoonPort: z.number().int().min(1).max(65535).nullable().default(null), whistleGroupName: z.string().min(1).nullable().default(null), mockPolicy: z.object({ listScenario: z.object({ enabled: z.boolean().default(true), itemCount: z.number().int().min(2).max(1000).default(20) }).strict().default({ enabled: true, itemCount: 20 }) }).strict().default({ listScenario: { enabled: true, itemCount: 20 } }) }).strict();
export async function loadMockConfig(file: string): Promise<MockGenConfig> { try { return schema.parse(JSON.parse(await readFile(file, "utf8"))); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(defaultMockConfig); throw error; } }
