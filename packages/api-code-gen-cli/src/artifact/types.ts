export type ApiOrigin = "imported" | "manual";
export type ReviewStatus = "unreviewed" | "needs-change" | "confirmed";
export type ReviewSeverity = "fatal" | "needsReview" | "warning";

export interface ReviewItem {
  id: string;
  severity: ReviewSeverity;
  scope: "global" | "openapi" | "endpoint" | "field" | "mapper" | "output";
  path: string;
  message: string;
  suggestion?: string;
  resolutionStatus: "open" | "resolved" | "ignored";
  resolution?: { reason: string; resolvedBy: "human" | "api-code-gen-skill"; resolvedAt: string };
}

export interface ApiEndpoint {
  id: string;
  operationId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary?: string;
  dto: { request?: string; response: string };
  vo: { name: string; fields: VoField[] };
  mapper: { name: string; enabled: boolean; steps: MapperStep[] };
}

export interface VoField {
  name: string;
  type: string;
  sources: Array<{ path: string; role?: string }>;
  confidence: "high" | "medium" | "low";
  origin: "generated" | "inferred" | "manual";
  description?: string;
  reason?: string;
}

export interface MapperStep {
  id: string;
  order: number;
  operation: "concat" | "rename" | "enum-label" | "date-format" | "amount-unit" | "default-value" | "assign" | "custom";
  inputs: string[];
  output: string;
  params: Record<string, unknown>;
  description?: string;
  confidence: "high" | "medium" | "low";
}

export type ApiOutput =
  | { splitApiOutput: false; file: string | null; transformResponse: boolean; reviewStatus: ReviewStatus }
  | {
      splitApiOutput: true;
      directory: string | null;
      files: Array<{ file: string; endpointIds: string[] }>;
      indexFile: string | null;
      transformResponse: boolean;
      reviewStatus: ReviewStatus;
    };

export interface ApiCodeArtifact {
  schemaVersion: "0.1.0";
  openapi: { file: string; sha256: string; origin: ApiOrigin; reviewStatus: ReviewStatus };
  reviewItems: ReviewItem[];
  endpoints: ApiEndpoint[];
  output: ApiOutput;
}
