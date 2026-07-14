import type { MockArtifact, MockReviewItem } from "../mock-artifact/types.js";
import { mockoonDiagnostics } from "./mockoon.js";
import type { MockDiagnostic, MockPreflightResult } from "./diagnostics.js";
import { whistleDiagnostics } from "./whistle.js";

export function runMockPreflight(artifact: MockArtifact, options: { currentOpenApiSha256: string; target: "all" | "mockoon" | "whistle" }): MockPreflightResult {
  const diagnostics: MockDiagnostic[] = [];
  if (artifact.openapi.reviewStatus !== "confirmed") diagnostics.push({ severity: "fatal", code: "OPENAPI_UNREVIEWED", path: "openapi.reviewStatus", message: "OpenAPI has not been reviewed." });
  if (artifact.openapi.sha256 !== options.currentOpenApiSha256) diagnostics.push({ severity: "fatal", code: "OPENAPI_HASH_MISMATCH", path: "openapi.sha256", message: "OpenAPI content hash changed; artifact is stale." });
  for (const item of artifact.reviewItems) if (item.resolutionStatus === "open" && applies(item, options.target)) diagnostics.push({ severity: item.severity, code: "REVIEW_ITEM_OPEN", path: item.path, message: item.message });
  if (options.target === "all" || options.target === "mockoon") diagnostics.push(...mockoonDiagnostics(artifact));
  if (options.target === "all" || options.target === "whistle") diagnostics.push(...whistleDiagnostics(artifact));
  return { diagnostics, ready: !diagnostics.some((item) => item.severity === "fatal" || item.severity === "needsReview") };
}
function applies(item: MockReviewItem, target: "all" | "mockoon" | "whistle"): boolean { if (target === "all") return true; if (item.scope !== "output") return true; if (item.path.startsWith("outputs.mockoon")) return target === "mockoon"; if (item.path.startsWith("outputs.whistle")) return target === "whistle"; return true; }
