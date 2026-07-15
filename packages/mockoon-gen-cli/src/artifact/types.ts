export type MockReviewStatus = "unreviewed" | "needs-change" | "confirmed";
export interface MockArtifact {
  schemaVersion: "0.3.0";
  openapi: { file: string; sha256: string; origin: "generated" | "imported" | "manual"; reviewStatus: MockReviewStatus };
  reviewItems: MockReviewItem[];
  policies: { listScenario: { enabled: boolean; itemCount: number }; randomEmptyData?: boolean };
  endpoints: MockEndpoint[];
  outputs: { whistle: { groupName: string | null; routes: Array<{ endpointId: string; apiHost: string | null }> }; mockoon: { port: number | null; defaultHeaders: Record<string, string> } };
}
export interface MockReviewItem { id: string; severity: "fatal" | "needsReview" | "warning"; scope: "global" | "openapi" | "endpoint" | "mock" | "output"; path: string; message: string; suggestion?: string; resolutionStatus: "open" | "resolved" | "ignored"; resolution?: { reason: string; resolvedBy: "human" | "mockoon-gen-skill"; resolvedAt: string }; }
export interface MockSemanticMapping { path: string; faker: string; }
export interface MockEndpoint { id: string; operationId: string; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string; summary?: string; mock: { selection: { mode: "random" | "query" | "header" | "manual"; key?: string; defaultScenario: string }; semanticMappings?: MockSemanticMapping[]; scenarios: MockScenario[] }; }
export interface MockScenario { name: string; statusCode: number; headers: Record<string, string>; bodyTemplate: string; origin: "generated" | "inferred" | "manual"; enabled: boolean; }
