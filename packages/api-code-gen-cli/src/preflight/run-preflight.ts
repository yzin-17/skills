import { isAbsolute, relative, resolve } from "node:path";
import type { OpenApiDocument } from "@yzin/openapi-reader";
import type { ApiCodeArtifact } from "../artifact/types.js";
import { unsupportedOpenApiDiagnostics } from "../openapi/support.js";
import type { Diagnostic, PreflightResult } from "./diagnostics.js";

export function runPreflight(artifact: ApiCodeArtifact, options: { currentOpenApiSha256: string; projectDir: string; openapiDocument?: OpenApiDocument }): PreflightResult {
  const diagnostics: Diagnostic[] = [];
  const add = (severity: Diagnostic["severity"], code: string, path: string, message: string) => diagnostics.push({ severity, code, path, message });
  if (artifact.schemaVersion !== "0.1.0") add("fatal", "ARTIFACT_SCHEMA_UNSUPPORTED", "schemaVersion", "Unsupported API code artifact schema.");
  if (artifact.openapi.reviewStatus !== "confirmed") add("fatal", "OPENAPI_UNREVIEWED", "openapi.reviewStatus", "OpenAPI has not been reviewed.");
  if (artifact.openapi.sha256 !== options.currentOpenApiSha256) add("fatal", "OPENAPI_HASH_MISMATCH", "openapi.sha256", "OpenAPI content hash changed; artifact is stale.");
  for (const item of artifact.reviewItems) if (item.resolutionStatus === "open") add(item.severity, "REVIEW_ITEM_OPEN", item.path, item.message);
  if (artifact.output.reviewStatus !== "confirmed") add("needsReview", "OUTPUT_PLAN_UNCONFIRMED", "output.reviewStatus", "API output plan is not confirmed.");

  if (artifact.output.splitApiOutput) {
    if (!artifact.output.directory || artifact.output.files.length === 0) add("needsReview", "OUTPUT_PLAN_INCOMPLETE", "output", "Split API output plan is incomplete.");
    if (artifact.output.directory) checkPath(artifact.output.directory, "output.directory", options.projectDir, add);
  } else {
    if (!artifact.output.file) add("needsReview", "OUTPUT_PLAN_INCOMPLETE", "output.file", "Single API output file is missing.");
    if (artifact.output.file) checkPath(artifact.output.file, "output.file", options.projectDir, add);
  }

  for (const endpoint of artifact.endpoints) {
    for (const step of endpoint.mapper.steps) if (step.operation !== "rename" && step.operation !== "assign") add("fatal", "MAPPER_OPERATION_UNSUPPORTED", `endpoints.${endpoint.id}.mapper.steps.${step.id}`, `Unsupported mapper operation: ${step.operation}.`);
    for (const field of endpoint.vo.fields) if (!/^[$A-Z_][0-9A-Z_$]*$/i.test(field.name)) add("fatal", "TYPESCRIPT_IDENTIFIER_INVALID", `endpoints.${endpoint.id}.vo.fields.${field.name}`, "VO field is not a valid TypeScript identifier.");
  }
  if (options.openapiDocument) diagnostics.push(...unsupportedOpenApiDiagnostics(options.openapiDocument));
  return { diagnostics, ready: !diagnostics.some((item) => item.severity === "fatal" || item.severity === "needsReview") };
}

function checkPath(file: string, path: string, projectDir: string, add: (severity: Diagnostic["severity"], code: string, path: string, message: string) => void): void {
  const root = resolve(projectDir); const target = isAbsolute(file) ? resolve(file) : resolve(root, file); const value = relative(root, target);
  if (value.startsWith("..") || isAbsolute(value)) add("fatal", "OUTPUT_PATH_OUTSIDE_PROJECT", path, "Output path is outside the project.");
}
