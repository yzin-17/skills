export interface LoadedOpenApi {
  file: string;
  sha256: string;
  document: OpenApiDocument;
}

export interface OpenApiDocument {
  openapi: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  parameters?: Array<{
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    schema?: OpenApiSchema;
  }>;
  requestBody?: unknown;
  responses?: Record<string, OpenApiResponse>;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, { schema?: OpenApiSchema }>;
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  enum?: Array<string | number | boolean | null>;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
}
