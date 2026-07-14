import { readFile } from "node:fs/promises";
import { mockArtifactSchema } from "./schema.js";
import type { MockArtifact } from "./types.js";
export async function readMockArtifact(file: string): Promise<MockArtifact> { return mockArtifactSchema.parse(JSON.parse(await readFile(file, "utf8"))) as MockArtifact; }
