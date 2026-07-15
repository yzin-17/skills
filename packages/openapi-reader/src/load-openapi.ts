import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import { sha256 } from "./hash.js";
import type { LoadedOpenApi, OpenApiDocument } from "./types.js";

export async function loadOpenApi(file: string): Promise<LoadedOpenApi> {
  const normalizedFile = resolve(file);
  const raw = await readFile(normalizedFile);
  const document = YAML.parse(raw.toString("utf8")) as OpenApiDocument;

  if (
    !isPlainObject(document) ||
    typeof document.openapi !== "string" ||
    !isPlainObject(document.paths)
  ) {
    throw new Error(`Invalid OpenAPI document: ${normalizedFile}`);
  }

  for (const pathItem of Object.values(document.paths)) {
    if (!isPlainObject(pathItem)) {
      throw new Error(`Invalid OpenAPI document: ${normalizedFile}`);
    }
  }

  return {
    file: normalizedFile,
    sha256: sha256(raw),
    document
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
