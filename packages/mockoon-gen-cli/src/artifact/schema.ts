import { z } from "zod";

const resolution = z.object({ reason: z.string().min(1), resolvedBy: z.enum(["human", "mockoon-gen-skill"]), resolvedAt: z.string().min(1) }).strict();
const reviewItem = z.object({ id: z.string().min(1), severity: z.enum(["fatal", "needsReview", "warning"]), scope: z.enum(["global", "openapi", "endpoint", "mock", "output"]), path: z.string().min(1), message: z.string().min(1), suggestion: z.string().optional(), resolutionStatus: z.enum(["open", "resolved", "ignored"]), resolution: resolution.optional() }).strict().superRefine((item, context) => { if (item.resolutionStatus === "open" && item.resolution) context.addIssue({ code: z.ZodIssueCode.custom, message: "open item cannot have resolution" }); if (item.resolutionStatus !== "open" && !item.resolution) context.addIssue({ code: z.ZodIssueCode.custom, message: "closed item requires resolution" }); });
const scenario = z.object({ name: z.string().min(1), statusCode: z.number().int().min(100).max(599), headers: z.record(z.string()), bodyTemplate: z.string(), origin: z.enum(["generated", "inferred", "manual"]), enabled: z.boolean() }).strict();

export const mockArtifactSchema = z.object({
  schemaVersion: z.literal("0.3.0"),
  openapi: z.object({ file: z.string().min(1), sha256: z.string().min(1), origin: z.enum(["generated", "imported", "manual"]), reviewStatus: z.enum(["unreviewed", "needs-change", "confirmed"]) }).strict(),
  reviewItems: z.array(reviewItem),
  policies: z.object({ listScenario: z.object({ enabled: z.boolean(), itemCount: z.number().int().min(2).max(1000) }).strict() }).strict(),
  endpoints: z.array(z.object({ id: z.string().min(1), operationId: z.string().min(1), method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), path: z.string().min(1), summary: z.string().optional(), mock: z.object({ selection: z.object({ mode: z.enum(["random", "query", "header", "manual"]), key: z.string().optional(), defaultScenario: z.string().min(1) }).strict(), scenarios: z.array(scenario) }).strict() }).strict()),
  outputs: z.object({ whistle: z.object({ groupName: z.string().min(1).nullable(), routes: z.array(z.object({ endpointId: z.string().min(1), apiHost: z.string().min(1).nullable() }).strict()) }).strict(), mockoon: z.object({ port: z.number().int().min(1).max(65535).nullable(), defaultHeaders: z.record(z.string()) }).strict() }).strict()
}).strict();
