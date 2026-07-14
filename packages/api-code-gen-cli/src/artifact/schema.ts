import { z } from "zod";

const reviewStatus = z.enum(["unreviewed", "needs-change", "confirmed"]);
const confidence = z.enum(["high", "medium", "low"]);
const memberPath = z.string().min(1).refine((value) => !isUnsafeMemberPath(value), "member path must be relative and contained");

const reviewItem = z
  .object({
    id: z.string().min(1), severity: z.enum(["fatal", "needsReview", "warning"]),
    scope: z.enum(["global", "openapi", "endpoint", "field", "mapper", "output"]), path: z.string().min(1),
    message: z.string().min(1), suggestion: z.string().optional(),
    resolutionStatus: z.enum(["open", "resolved", "ignored"]),
    resolution: z.object({ reason: z.string().min(1), resolvedBy: z.enum(["human", "api-code-gen-skill"]), resolvedAt: z.string().min(1) }).strict().optional()
  })
  .strict()
  .superRefine((item, context) => {
    if (item.resolutionStatus === "open" && item.resolution) context.addIssue({ code: z.ZodIssueCode.custom, message: "open review items cannot have a resolution" });
    if (item.resolutionStatus !== "open" && !item.resolution) context.addIssue({ code: z.ZodIssueCode.custom, message: "closed review items require a resolution" });
  });

const endpoint = z.object({
  id: z.string().min(1), operationId: z.string().min(1), method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]), path: z.string().min(1), summary: z.string().optional(),
  dto: z.object({ request: z.string().optional(), response: z.string().min(1) }).strict(),
  vo: z.object({ name: z.string().min(1), fields: z.array(z.object({ name: z.string().min(1), type: z.string().min(1), sources: z.array(z.object({ path: z.string().min(1), role: z.string().optional() }).strict()), confidence, origin: z.enum(["generated", "inferred", "manual"]), description: z.string().optional(), reason: z.string().optional() }).strict()) }).strict(),
  mapper: z.object({ name: z.string().min(1), enabled: z.boolean(), steps: z.array(z.object({ id: z.string().min(1), order: z.number().int().nonnegative(), operation: z.enum(["concat", "rename", "enum-label", "date-format", "amount-unit", "default-value", "assign", "custom"]), inputs: z.array(z.string()), output: z.string().min(1), params: z.record(z.unknown()), description: z.string().optional(), confidence }).strict()) }).strict()
}).strict();

const singleOutput = z.object({ splitApiOutput: z.literal(false), file: z.string().min(1).nullable(), transformResponse: z.boolean(), reviewStatus }).strict();
const splitOutput = z.object({ splitApiOutput: z.literal(true), directory: z.string().min(1).nullable(), files: z.array(z.object({ file: memberPath, endpointIds: z.array(z.string().min(1)).min(1) }).strict()), indexFile: memberPath.nullable(), transformResponse: z.boolean(), reviewStatus }).strict().superRefine((output, context) => {
  const files = new Set<string>();
  for (const entry of output.files) {
    if (files.has(entry.file)) context.addIssue({ code: z.ZodIssueCode.custom, message: "split output files must be unique" });
    files.add(entry.file);
  }
});

export const artifactSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  openapi: z.object({ file: z.string().min(1), sha256: z.string().min(1), origin: z.enum(["imported", "manual"]), reviewStatus }).strict(),
  reviewItems: z.array(reviewItem), endpoints: z.array(endpoint), output: z.union([singleOutput, splitOutput])
}).strict();

function isUnsafeMemberPath(value: string): boolean {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value) || value.replace(/\\/g, "/").split("/").includes("..");
}
