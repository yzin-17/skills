export type Origin = "generated" | "inferred" | "imported" | "manual";
export type ReviewStatus = "unreviewed" | "needs-change" | "confirmed";
export type ReviewSeverity = "fatal" | "needsReview" | "warning";
export type ResolutionStatus = "open" | "resolved" | "ignored";
export type ReviewScope = "global" | "openapi" | "endpoint" | "field" | "mapper" | "mock" | "output";

export interface ReviewItem {
  id: string;
  severity: ReviewSeverity;
  scope: ReviewScope;
  path: string;
  message: string;
  suggestion?: string;
  proposedChange?: {
    path: string;
    value: unknown;
  };
  resolutionStatus: ResolutionStatus;
  resolvedBy?: "human" | "page-skill" | "api-skill";
  resolvedAt?: string | null;
}

export interface SourceRef {
  id: string;
  type: "url" | "file" | "text" | "export";
  uri: string;
  title?: string;
  sha256?: string;
  retrievedAt?: string;
  origin: Origin;
  reviewStatus: ReviewStatus;
}

export interface OpenApiRef {
  file: string;
  sha256: string;
  origin: Extract<Origin, "generated" | "imported" | "manual">;
  reviewStatus: ReviewStatus;
}

export interface VoFieldSource {
  path: string;
  role?: string;
}

export interface VoField {
  name: string;
  type: string;
  sources: VoFieldSource[];
  confidence: "high" | "medium" | "low";
  origin: Extract<Origin, "generated" | "inferred" | "manual">;
  reviewStatus: ReviewStatus;
  description?: string;
  reason?: string;
}

export interface MapperStep {
  id: string;
  order: number;
  operation:
    | "concat"
    | "rename"
    | "enum-label"
    | "date-format"
    | "amount-unit"
    | "default-value"
    | "assign"
    | "custom";
  inputs: string[];
  output: string;
  params: Record<string, unknown>;
  description?: string;
  confidence: "high" | "medium" | "low";
  reviewStatus: ReviewStatus;
}

export interface MockSelection {
  mode: "random" | "query" | "header" | "manual";
  key?: string;
  defaultScenario: string;
}

export interface MockScenario {
  name: string;
  statusCode: number;
  headers: Record<string, string>;
  bodyTemplate: string;
  origin: Extract<Origin, "generated" | "inferred" | "manual">;
  reviewStatus: ReviewStatus;
  enabled: boolean;
}

export interface ArtifactEndpoint {
  id: string;
  operationId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary?: string;
  origin: Origin;
  reviewStatus: ReviewStatus;
  dto: {
    request?: string;
    response: string;
  };
  vo: {
    name: string;
    owner: "page-skill" | "human" | "api-skill";
    origin: Extract<Origin, "generated" | "inferred" | "manual">;
    reviewStatus: ReviewStatus;
    fields: VoField[];
  };
  mapper: {
    name: string;
    enabled: boolean;
    origin: Extract<Origin, "generated" | "inferred" | "manual">;
    reviewStatus: ReviewStatus;
    steps: MapperStep[];
  };
  mock: {
    origin: Extract<Origin, "generated" | "inferred" | "manual">;
    reviewStatus: ReviewStatus;
    selection: MockSelection;
    scenarios: MockScenario[];
  };
  reviewItems: ReviewItem[];
}

export interface WhistleRoute {
  endpointId: string;
  operationId: string;
  method: ArtifactEndpoint["method"];
  apiHost: string | "pending-confirmation";
  sourcePath: string;
  sourcePattern: string;
  targetPort: number | null;
  targetPath: string;
  origin: Extract<Origin, "generated" | "inferred" | "manual">;
  reviewStatus: ReviewStatus;
}

export interface ApiArtifact {
  schemaVersion: "0.2.0";
  sources: SourceRef[];
  openapi: OpenApiRef;
  reviewItems: ReviewItem[];
  endpoints: ArtifactEndpoint[];
  outputs: {
    apiCode: {
      enabled: boolean;
      suggestedFile: string;
      placement: "pending-confirmation" | "confirmed";
      integrationMode: "standalone";
      transformResponse: boolean;
      lastGeneratedSha256: string | null;
      origin: Extract<Origin, "generated" | "manual">;
      reviewStatus: ReviewStatus;
    };
    whistle: {
      file: string;
      groupName: string | null;
      routes: WhistleRoute[];
    };
    mockoon: {
      file: string;
      port: number | null;
      defaultHeaders: Record<string, string>;
      origin: Extract<Origin, "generated" | "inferred" | "manual">;
      reviewStatus: ReviewStatus;
    };
  };
}
