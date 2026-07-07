import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { sha256 } from "../generators/hash.js";
import type { LoadedOpenApi, OpenApiDocument } from "./types.js";

export async function loadOpenApi(file: string): Promise<LoadedOpenApi> {
  const raw = await readFile(file, "utf8");
  const document = YAML.parse(raw) as OpenApiDocument;

  if (
    !isPlainObject(document) ||
    typeof document.openapi !== "string" ||
    !isPlainObject(document.paths)
  ) {
    throw new Error(`Invalid OpenAPI document: ${file}`);
  }

  return {
    file,
    sha256: sha256(raw),
    document
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
