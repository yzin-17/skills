import type { ApiArtifact, ReviewItem } from "./types.js";
import { pathFor } from "../utils/json-path.js";

export interface ValidationOptions {
  strict: boolean;
  currentOpenApiSha256: string;
}

export interface ValidationResult {
  fatal: ReviewItem[];
  needsReview: ReviewItem[];
  warning: ReviewItem[];
}

export function validateArtifact(artifact: ApiArtifact, options: ValidationOptions): ValidationResult {
  const fatal: ReviewItem[] = [];
  const needsReview: ReviewItem[] = [];
  const warning: ReviewItem[] = [];

  if (artifact.openapi.sha256 !== options.currentOpenApiSha256) {
    fatal.push(item("fatal", "openapi", "openapi.sha256", "OpenAPI content hash changed; artifact is stale."));
  }

  if (options.strict && artifact.openapi.origin === "generated" && artifact.openapi.reviewStatus !== "confirmed") {
    fatal.push(
      item("fatal", "openapi", "openapi.reviewStatus", "OpenAPI generated from loose documents has not been reviewed.")
    );
  }

  artifact.outputs.whistle.routes.forEach((route, index) => {
    if (route.apiHost === "pending-confirmation") {
      needsReview.push(
        item(
          "needsReview",
          "output",
          pathFor(["outputs", "whistle", "routes", index, "apiHost"]),
          "Route API host is unconfirmed."
        )
      );
    }
    if (route.targetPort === null) {
      needsReview.push(
        item(
          "needsReview",
          "output",
          pathFor(["outputs", "whistle", "routes", index, "targetPort"]),
          "Mockoon target port is unconfirmed."
        )
      );
    }
  });

  artifact.endpoints.forEach((endpoint, endpointIndex) => {
    endpoint.vo.fields.forEach((field, fieldIndex) => {
      if (field.confidence === "low") {
        needsReview.push(
          item(
            "needsReview",
            "field",
            pathFor(["endpoints", endpointIndex, "vo", "fields", fieldIndex]),
            `VO field ${field.name} is low confidence.`
          )
        );
      }
    });

    endpoint.mapper.steps.forEach((step, stepIndex) => {
      if (step.confidence === "low") {
        needsReview.push(
          item(
            "needsReview",
            "mapper",
            pathFor(["endpoints", endpointIndex, "mapper", "steps", stepIndex]),
            `Mapper step ${step.id} is low confidence.`
          )
        );
      }
    });
  });

  return { fatal, needsReview, warning };
}

function item(
  severity: ReviewItem["severity"],
  scope: ReviewItem["scope"],
  path: string,
  message: string
): ReviewItem {
  return {
    id: `review-${severity}-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`,
    severity,
    scope,
    path,
    message,
    resolutionStatus: "open"
  };
}
