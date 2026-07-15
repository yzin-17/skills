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
    [key: string]: unknown;
  };
  paths: Record<string, OpenApiPathItem>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
  head?: OpenApiOperation;
  options?: OpenApiOperation;
  trace?: OpenApiOperation;
  parameters?: OpenApiParameter[];
  [key: string]: unknown;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  parameters?: OpenApiParameter[];
  requestBody?: unknown;
  responses?: Record<string, OpenApiResponse>;
  [key: string]: unknown;
}

export interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema?: OpenApiSchema;
  [key: string]: unknown;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, { schema?: OpenApiSchema; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface OpenApiSchema {
  $ref?: string;
  type?: string;
  format?: string;
  enum?: Array<string | number | boolean | null>;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  not?: OpenApiSchema;
  nullable?: boolean;
  [key: string]: unknown;
}
