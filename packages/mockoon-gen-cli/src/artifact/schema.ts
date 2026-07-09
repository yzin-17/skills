import { z } from "zod";

const originSchema = z.enum(["generated", "inferred", "imported", "manual"]);
const reviewStatusSchema = z.enum(["unreviewed", "needs-change", "confirmed"]);
const confidenceSchema = z.enum(["high", "medium", "low"]);

export const reviewItemSchema = z
  .object({
    id: z.string().min(1),
    severity: z.enum(["fatal", "needsReview", "warning"]),
    scope: z.enum(["global", "openapi", "endpoint", "field", "mapper", "mock", "output"]),
    path: z.string().min(1),
    message: z.string().min(1),
    suggestion: z.string().optional(),
    proposedChange: z
      .object({
        path: z.string().min(1),
        value: z.unknown()
      })
      .optional(),
    resolutionStatus: z.enum(["open", "resolved", "ignored"]),
    resolvedBy: z.enum(["human", "page-skill", "api-skill"]).optional(),
    resolvedAt: z.string().nullable().optional()
  })
  .strict();

const reviewableSchema = z.object({
  origin: originSchema,
  reviewStatus: reviewStatusSchema
});

const sourceSchema = reviewableSchema
  .extend({
    id: z.string().min(1),
    type: z.enum(["url", "file", "text", "export"]),
    uri: z.string().min(1),
    title: z.string().optional(),
    sha256: z.string().optional(),
    retrievedAt: z.string().optional()
  })
  .strict();

const mapperStepSchema = z
  .object({
    id: z.string().min(1),
    order: z.number().int().nonnegative(),
    operation: z.enum([
      "concat",
      "rename",
      "enum-label",
      "date-format",
      "amount-unit",
      "default-value",
      "assign",
      "custom"
    ]),
    inputs: z.array(z.string()),
    output: z.string().min(1),
    params: z.record(z.unknown()),
    description: z.string().optional(),
    confidence: confidenceSchema,
    reviewStatus: reviewStatusSchema
  })
  .strict();

const endpointSchema = z
  .object({
    id: z.string().min(1),
    operationId: z.string().min(1),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z.string().min(1),
    summary: z.string().optional(),
    origin: originSchema,
    reviewStatus: reviewStatusSchema,
    dto: z
      .object({
        request: z.string().optional(),
        response: z.string().min(1)
      })
      .strict(),
    vo: z
      .object({
        name: z.string().min(1),
        owner: z.enum(["page-skill", "human", "api-skill"]),
        origin: z.enum(["generated", "inferred", "manual"]),
        reviewStatus: reviewStatusSchema,
        fields: z.array(
          z
            .object({
              name: z.string().min(1),
              type: z.string().min(1),
              sources: z.array(z.object({ path: z.string().min(1), role: z.string().optional() }).strict()),
              confidence: confidenceSchema,
              origin: z.enum(["generated", "inferred", "manual"]),
              reviewStatus: reviewStatusSchema,
              description: z.string().optional(),
              reason: z.string().optional()
            })
            .strict()
        )
      })
      .strict(),
    mapper: z
      .object({
        name: z.string().min(1),
        enabled: z.boolean(),
        origin: z.enum(["generated", "inferred", "manual"]),
        reviewStatus: reviewStatusSchema,
        steps: z.array(mapperStepSchema)
      })
      .strict(),
    mock: z
      .object({
        origin: z.enum(["generated", "inferred", "manual"]),
        reviewStatus: reviewStatusSchema,
        selection: z
          .object({
            mode: z.enum(["random", "query", "header", "manual"]),
            key: z.string().optional(),
            defaultScenario: z.string().min(1)
          })
          .strict(),
        scenarios: z.array(
          z
            .object({
              name: z.string().min(1),
              statusCode: z.number().int().min(100).max(599),
              headers: z.record(z.string()),
              bodyTemplate: z.string(),
              origin: z.enum(["generated", "inferred", "manual"]),
              reviewStatus: reviewStatusSchema,
              enabled: z.boolean()
            })
            .strict()
        )
      })
      .strict(),
    reviewItems: z.array(reviewItemSchema)
  })
  .strict();

export const artifactSchema = z
  .object({
    schemaVersion: z.literal("0.2.0"),
    sources: z.array(sourceSchema),
    openapi: z
      .object({
        file: z.string().min(1),
        sha256: z.string().min(1),
        origin: z.enum(["generated", "imported", "manual"]),
        reviewStatus: reviewStatusSchema
      })
      .strict(),
    reviewItems: z.array(reviewItemSchema),
    endpoints: z.array(endpointSchema),
    outputs: z
      .object({
        apiCode: z
          .object({
            enabled: z.boolean().default(true),
            suggestedFile: z.string().min(1),
            placement: z.enum(["pending-confirmation", "confirmed"]),
            integrationMode: z.literal("standalone"),
            transformResponse: z.boolean(),
            lastGeneratedSha256: z.string().nullable(),
            origin: z.enum(["generated", "manual"]),
            reviewStatus: reviewStatusSchema
          })
          .strict(),
        whistle: z
          .object({
            file: z.string().min(1),
            groupName: z.string().min(1).nullable(),
            routes: z.array(
              z
                .object({
                  endpointId: z.string().min(1),
                  operationId: z.string().min(1),
                  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
                  apiHost: z.union([z.string().min(1), z.literal("pending-confirmation")]),
                  sourcePath: z.string().min(1),
                  sourcePattern: z.string().min(1),
                  targetPort: z.number().int().positive().nullable(),
                  targetPath: z.string().min(1),
                  origin: z.enum(["generated", "inferred", "manual"]),
                  reviewStatus: reviewStatusSchema
                })
                .strict()
            )
          })
          .strict(),
        mockoon: z
          .object({
            file: z.string().min(1),
            port: z.number().int().positive().nullable(),
            defaultHeaders: z.record(z.string()),
            origin: z.enum(["generated", "inferred", "manual"]),
            reviewStatus: reviewStatusSchema
          })
          .strict()
      })
      .strict()
  })
  .strict();

export type ParsedArtifact = z.infer<typeof artifactSchema>;
