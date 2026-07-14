import { readFile } from "node:fs/promises";
import { artifactSchema } from "./schema.js";
import type { ApiCodeArtifact } from "./types.js";

export async function readArtifact(file: string): Promise<ApiCodeArtifact> {
  return artifactSchema.parse(JSON.parse(await readFile(file, "utf8"))) as ApiCodeArtifact;
}
