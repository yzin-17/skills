# API Mockgen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP `mockgen` TypeScript CLI that reads reviewed OpenAPI/artifact input and deterministically generates `api-artifact.json`, `api.generated.ts`, `whistle.txt`, `mockoon.json`, and validation reports.

**Architecture:** The CLI is artifact-first. `src/artifact` owns the schema, migration, validation, and OpenAPI-to-artifact conversion; `src/generators` owns deterministic output adapters; `src/cli` wires commands to the core modules. The MVP intentionally does not parse loose documents in the CLI; loose docs are handled by the API mockgen skill before OpenAPI reaches the CLI.

**Tech Stack:** Node.js, TypeScript, Vitest, Commander, Zod, YAML.

---

## Current State

The repository is a small skeleton with `README.md`, `LICENSE`, and the reviewed spec at `docs/superpowers/specs/2026-07-06-api-mockgen-design.md`.

The reviewed spec is staged locally but not committed because the user rejected the commit operation. Implementation should avoid modifying unrelated git state.

## File Structure

Create this structure:

```text
package.json
tsconfig.json
vitest.config.ts
.gitignore

src/
  cli.ts
  index.ts
  artifact/
    types.ts
    schema.ts
    validate.ts
    from-openapi.ts
    migrate.ts
    review.ts
  config/
    load-config.ts
    types.ts
  generators/
    api-code.ts
    mockoon.ts
    whistle.ts
    hash.ts
  openapi/
    load-openapi.ts
    types.ts
  utils/
    fs.ts
    json-path.ts

tests/
  fixtures/
    openapi.user.yaml
    artifact.user.json
  artifact/
    schema.test.ts
    from-openapi.test.ts
    validate.test.ts
  generators/
    api-code.test.ts
    mockoon.test.ts
    whistle.test.ts
  cli/
    cli.test.ts
```

Responsibility boundaries:

- `src/artifact/types.ts`: TypeScript types for schema version `0.2.0`.
- `src/artifact/schema.ts`: Zod schema for runtime validation.
- `src/artifact/from-openapi.ts`: deterministic OpenAPI-to-artifact draft generation.
- `src/artifact/validate.ts`: `fatal`, `needsReview`, `warning` validation rules.
- `src/artifact/migrate.ts`: schema version migration entry point.
- `src/generators/api-code.ts`: `api.generated.ts` generation and hash header handling.
- `src/generators/whistle.ts`: route-level whistle rule generation.
- `src/generators/mockoon.ts`: Mockoon JSON generation from endpoint mock scenarios.
- `src/openapi/load-openapi.ts`: YAML/JSON load and content hash.
- `src/cli.ts`: command parsing only; no business logic.

## Task 1: Initialize TypeScript CLI Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts`
- Create: `src/cli.ts`
- Test: `tests/cli/cli.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "api-mockgen",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "bin": {
    "mockgen": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "yaml": "^2.5.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.5.4",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
node_modules/
dist/
.mockgen/
coverage/
*.log
```

- [ ] **Step 5: Create initial exports**

Create `src/index.ts`:

```ts
export const MOCKGEN_VERSION = "0.1.0";
```

Create `src/cli.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { MOCKGEN_VERSION } from "./index.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("mockgen")
    .description("Generate frontend API contracts and mock files from reviewed OpenAPI artifacts.")
    .version(MOCKGEN_VERSION);

  program.command("init").description("Create default mockgen config.").action(() => {
    console.log("mockgen init is not implemented yet");
  });

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync(process.argv);
}
```

- [ ] **Step 6: Write CLI smoke test**

Create `tests/cli/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("createProgram", () => {
  it("registers the mockgen CLI name", () => {
    const program = createProgram();
    expect(program.name()).toBe("mockgen");
  });
});
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 8: Verify project scaffold**

Run:

```bash
npm run typecheck
npm test
```

Expected: both commands exit 0; Vitest reports 1 passing test.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src/index.ts src/cli.ts tests/cli/cli.test.ts
git commit -m "feat: initialize mockgen cli project"
```

## Task 2: Define Artifact Types and Runtime Schema

**Files:**
- Create: `src/artifact/types.ts`
- Create: `src/artifact/schema.ts`
- Test: `tests/artifact/schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Create `tests/artifact/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { artifactSchema } from "../../src/artifact/schema.js";

const minimalArtifact = {
  schemaVersion: "0.2.0",
  sources: [],
  openapi: {
    file: ".mockgen/openapi.yaml",
    sha256: "abc123",
    origin: "generated",
    reviewStatus: "confirmed"
  },
  reviewItems: [],
  endpoints: [],
  outputs: {
    apiCode: {
      suggestedFile: "src/api/generated/api.generated.ts",
      placement: "pending-confirmation",
      integrationMode: "standalone",
      transformResponse: true,
      lastGeneratedSha256: null,
      origin: "generated",
      reviewStatus: "unreviewed"
    },
    whistle: {
      file: ".mockgen/whistle.txt",
      routes: []
    },
    mockoon: {
      file: ".mockgen/mockoon.json",
      port: null,
      defaultHeaders: {
        "Content-Type": "application/json; charset=utf-8"
      },
      origin: "generated",
      reviewStatus: "unreviewed"
    }
  }
};

describe("artifactSchema", () => {
  it("accepts a minimal 0.2.0 artifact", () => {
    expect(() => artifactSchema.parse(minimalArtifact)).not.toThrow();
  });

  it("rejects old single source shape", () => {
    expect(() =>
      artifactSchema.parse({
        ...minimalArtifact,
        source: { type: "file", file: "docs/api.md" }
      })
    ).toThrow();
  });

  it("rejects generic status fields on reviewable nodes", () => {
    expect(() =>
      artifactSchema.parse({
        ...minimalArtifact,
        openapi: {
          ...minimalArtifact.openapi,
          status: "generated"
        }
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run schema tests to verify failure**

Run:

```bash
npm test -- tests/artifact/schema.test.ts
```

Expected: FAIL because `src/artifact/schema.ts` does not exist.

- [ ] **Step 3: Create artifact types**

Create `src/artifact/types.ts`:

```ts
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
```

- [ ] **Step 4: Create Zod schema**

Create `src/artifact/schema.ts`:

```ts
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
            routes: z.array(
              z
                .object({
                  endpointId: z.string().min(1),
                  operationId: z.string().min(1),
                  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
                  apiHost: z.string().min(1),
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
```

- [ ] **Step 5: Run schema tests**

Run:

```bash
npm test -- tests/artifact/schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/artifact/types.ts src/artifact/schema.ts tests/artifact/schema.test.ts
git commit -m "feat: define artifact schema"
```

## Task 3: Load OpenAPI and Generate Artifact Draft

**Files:**
- Create: `src/generators/hash.ts`
- Create: `src/openapi/types.ts`
- Create: `src/openapi/load-openapi.ts`
- Create: `src/artifact/from-openapi.ts`
- Create: `tests/fixtures/openapi.user.yaml`
- Test: `tests/artifact/from-openapi.test.ts`

- [ ] **Step 1: Create OpenAPI fixture**

Create `tests/fixtures/openapi.user.yaml`:

```yaml
openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /api/users/{id}:
    get:
      operationId: getUser
      summary: 获取用户
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [id, user_name, status]
                properties:
                  id:
                    type: string
                  user_name:
                    type: string
                  status:
                    type: integer
                    enum: [0, 1]
```

- [ ] **Step 2: Write failing OpenAPI conversion test**

Create `tests/artifact/from-openapi.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadOpenApi } from "../../src/openapi/load-openapi.js";
import { artifactFromOpenApi } from "../../src/artifact/from-openapi.js";

describe("artifactFromOpenApi", () => {
  it("creates endpoint, route, DTO, VO, mapper, and mock draft", async () => {
    const loaded = await loadOpenApi("tests/fixtures/openapi.user.yaml");
    const artifact = artifactFromOpenApi(loaded, {
      artifactDir: ".mockgen",
      apiOutput: "src/api/generated/api.generated.ts",
      mockoonPort: 3100
    });

    expect(artifact.schemaVersion).toBe("0.2.0");
    expect(artifact.openapi.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.endpoints[0]?.id).toBe("ep-get-user");
    expect(artifact.endpoints[0]?.dto.response).toBe("GetUserResponseDTO");
    expect(artifact.endpoints[0]?.vo.name).toBe("GetUserVO");
    expect(artifact.endpoints[0]?.mapper.steps[0]?.operation).toBe("rename");
    expect(artifact.endpoints[0]?.mock.selection.defaultScenario).toBe("success-default");
    expect(artifact.outputs.whistle.routes[0]?.endpointId).toBe("ep-get-user");
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run:

```bash
npm test -- tests/artifact/from-openapi.test.ts
```

Expected: FAIL because OpenAPI loader and converter do not exist.

- [ ] **Step 4: Implement SHA-256 helper**

Create `src/generators/hash.ts`:

```ts
import { createHash } from "node:crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
```

- [ ] **Step 5: Implement OpenAPI types and loader**

Create `src/openapi/types.ts`:

```ts
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
```

Create `src/openapi/load-openapi.ts`:

```ts
import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { sha256 } from "../generators/hash.js";
import type { LoadedOpenApi, OpenApiDocument } from "./types.js";

export async function loadOpenApi(file: string): Promise<LoadedOpenApi> {
  const raw = await readFile(file, "utf8");
  const document = YAML.parse(raw) as OpenApiDocument;

  if (!document || typeof document !== "object" || !document.openapi || !document.paths) {
    throw new Error(`Invalid OpenAPI document: ${file}`);
  }

  return {
    file,
    sha256: sha256(raw),
    document
  };
}
```

- [ ] **Step 6: Implement OpenAPI-to-artifact converter**

Create `src/artifact/from-openapi.ts`:

```ts
import type { ApiArtifact, ArtifactEndpoint, MapperStep, MockScenario, WhistleRoute } from "./types.js";
import type { LoadedOpenApi, OpenApiOperation, OpenApiSchema } from "../openapi/types.js";

interface FromOpenApiOptions {
  artifactDir: string;
  apiOutput: string;
  mockoonPort: number | null;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export function artifactFromOpenApi(openapi: LoadedOpenApi, options: FromOpenApiOptions): ApiArtifact {
  const endpoints: ArtifactEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(openapi.document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      endpoints.push(endpointFromOperation(method.toUpperCase() as ArtifactEndpoint["method"], path, operation));
    }
  }

  const routes: WhistleRoute[] = endpoints.map((endpoint) => ({
    endpointId: endpoint.id,
    operationId: endpoint.operationId,
    method: endpoint.method,
    apiHost: "pending-confirmation",
    sourcePath: endpoint.path,
    sourcePattern: endpoint.path.replace(/\{[^}]+\}/g, "*"),
    targetPort: options.mockoonPort,
    targetPath: endpoint.path.replace(/\{([^}]+)\}/g, ":$1"),
    origin: "generated",
    reviewStatus: options.mockoonPort ? "needs-change" : "unreviewed"
  }));

  return {
    schemaVersion: "0.2.0",
    sources: [
      {
        id: "src-openapi-001",
        type: "file",
        uri: openapi.file,
        title: openapi.document.info?.title,
        sha256: openapi.sha256,
        origin: "imported",
        reviewStatus: "confirmed"
      }
    ],
    openapi: {
      file: openapi.file,
      sha256: openapi.sha256,
      origin: "imported",
      reviewStatus: "confirmed"
    },
    reviewItems: [],
    endpoints,
    outputs: {
      apiCode: {
        suggestedFile: options.apiOutput,
        placement: "pending-confirmation",
        integrationMode: "standalone",
        transformResponse: true,
        lastGeneratedSha256: null,
        origin: "generated",
        reviewStatus: "unreviewed"
      },
      whistle: {
        file: `${options.artifactDir}/whistle.txt`,
        routes
      },
      mockoon: {
        file: `${options.artifactDir}/mockoon.json`,
        port: options.mockoonPort,
        defaultHeaders: {
          "Content-Type": "application/json; charset=utf-8"
        },
        origin: "generated",
        reviewStatus: options.mockoonPort ? "needs-change" : "unreviewed"
      }
    }
  };
}

function endpointFromOperation(
  method: ArtifactEndpoint["method"],
  path: string,
  operation: OpenApiOperation
): ArtifactEndpoint {
  const operationId = operation.operationId ?? operationIdFrom(method, path);
  const responseSchema = operation.responses?.["200"]?.content?.["application/json"]?.schema;
  const fieldNames = Object.keys(responseSchema?.properties ?? {});
  const dtoResponse = `${pascal(operationId)}ResponseDTO`;
  const voName = `${pascal(operationId)}VO`;
  const mapperName = `to${pascal(operationId)}VO`;

  const steps: MapperStep[] = fieldNames.map((field, index) => ({
    id: `step-${String(index + 1).padStart(3, "0")}`,
    order: index + 1,
    operation: "rename",
    inputs: [`response.body.${field}`],
    output: `vo.${camel(field)}`,
    params: {},
    description: `Map ${field} to ${camel(field)}`,
    confidence: "medium",
    reviewStatus: "unreviewed"
  }));

  const scenarios: MockScenario[] = [
    {
      name: "success-default",
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      bodyTemplate: mockBodyTemplate(responseSchema),
      origin: "generated",
      reviewStatus: "unreviewed",
      enabled: true
    },
    {
      name: "success-empty",
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      bodyTemplate: "{}",
      origin: "generated",
      reviewStatus: "unreviewed",
      enabled: true
    }
  ];

  return {
    id: `ep-${kebab(operationId)}`,
    operationId,
    method,
    path,
    summary: operation.summary,
    origin: "generated",
    reviewStatus: "unreviewed",
    dto: {
      response: dtoResponse
    },
    vo: {
      name: voName,
      owner: "api-skill",
      origin: "inferred",
      reviewStatus: "unreviewed",
      fields: fieldNames.map((field) => ({
        name: camel(field),
        type: tsType(responseSchema?.properties?.[field]),
        sources: [{ path: `response.body.${field}`, role: camel(field) }],
        confidence: "medium",
        origin: "inferred",
        reviewStatus: "unreviewed",
        description: operation.summary,
        reason: `Generated from response field ${field}`
      }))
    },
    mapper: {
      name: mapperName,
      enabled: true,
      origin: "inferred",
      reviewStatus: "unreviewed",
      steps
    },
    mock: {
      origin: "generated",
      reviewStatus: "unreviewed",
      selection: {
        mode: "query",
        key: "scenario",
        defaultScenario: "success-default"
      },
      scenarios
    },
    reviewItems: []
  };
}

function mockBodyTemplate(schema: OpenApiSchema | undefined): string {
  if (!schema?.properties) return "{}";
  const entries = Object.entries(schema.properties).map(([name, prop]) => {
    if (prop.enum?.length) return `"${name}": ${JSON.stringify(prop.enum[0])}`;
    if (prop.type === "integer" || prop.type === "number") return `"${name}": "{{faker 'number.int'}}"`;
    return `"${name}": "{{faker 'string.sample'}}"`;
  });
  return `{\n  ${entries.join(",\n  ")}\n}`;
}

function tsType(schema: OpenApiSchema | undefined): string {
  if (!schema) return "unknown";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") return `${tsType(schema.items)}[]`;
  if (schema.type === "object") return "Record<string, unknown>";
  return "string";
}

function operationIdFrom(method: string, path: string): string {
  return camel(`${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
}

function pascal(value: string): string {
  const c = camel(value);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function camel(value: string): string {
  return value
    .replace(/[_-\s]+(.)?/g, (_, char: string | undefined) => (char ? char.toUpperCase() : ""))
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}
```

- [ ] **Step 7: Run conversion test**

Run:

```bash
npm test -- tests/artifact/from-openapi.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/generators/hash.ts src/openapi/types.ts src/openapi/load-openapi.ts src/artifact/from-openapi.ts tests/fixtures/openapi.user.yaml tests/artifact/from-openapi.test.ts
git commit -m "feat: generate artifact from openapi"
```

## Task 4: Add Artifact Validation

**Files:**
- Create: `src/utils/json-path.ts`
- Create: `src/artifact/validate.ts`
- Test: `tests/artifact/validate.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `tests/artifact/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiArtifact } from "../../src/artifact/types.js";
import { validateArtifact } from "../../src/artifact/validate.js";

function artifact(overrides: Partial<ApiArtifact> = {}): ApiArtifact {
  return {
    schemaVersion: "0.2.0",
    sources: [],
    openapi: {
      file: ".mockgen/openapi.yaml",
      sha256: "abc",
      origin: "generated",
      reviewStatus: "confirmed"
    },
    reviewItems: [],
    endpoints: [],
    outputs: {
      apiCode: {
        suggestedFile: "src/api/generated/api.generated.ts",
        placement: "pending-confirmation",
        integrationMode: "standalone",
        transformResponse: true,
        lastGeneratedSha256: null,
        origin: "generated",
        reviewStatus: "unreviewed"
      },
      whistle: {
        file: ".mockgen/whistle.txt",
        routes: []
      },
      mockoon: {
        file: ".mockgen/mockoon.json",
        port: null,
        defaultHeaders: {},
        origin: "generated",
        reviewStatus: "unreviewed"
      }
    },
    ...overrides
  };
}

describe("validateArtifact", () => {
  it("fails strict mode when generated OpenAPI is unreviewed", () => {
    const result = validateArtifact(
      artifact({
        openapi: {
          file: ".mockgen/openapi.yaml",
          sha256: "abc",
          origin: "generated",
          reviewStatus: "unreviewed"
        }
      }),
      { strict: true, currentOpenApiSha256: "abc" }
    );

    expect(result.fatal.map((item) => item.message)).toContain("OpenAPI generated from loose documents has not been reviewed.");
  });

  it("reports hash drift as fatal", () => {
    const result = validateArtifact(artifact(), { strict: false, currentOpenApiSha256: "changed" });
    expect(result.fatal[0]?.message).toBe("OpenAPI content hash changed; artifact is stale.");
  });

  it("reports missing whistle host as needsReview", () => {
    const result = validateArtifact(
      artifact({
        outputs: {
          ...artifact().outputs,
          whistle: {
            file: ".mockgen/whistle.txt",
            routes: [
              {
                endpointId: "ep-get-user",
                operationId: "getUser",
                method: "GET",
                apiHost: "pending-confirmation",
                sourcePath: "/api/users/{id}",
                sourcePattern: "/api/users/*",
                targetPort: 3100,
                targetPath: "/api/users/:id",
                origin: "generated",
                reviewStatus: "unreviewed"
              }
            ]
          }
        }
      }),
      { strict: false, currentOpenApiSha256: "abc" }
    );

    expect(result.needsReview[0]?.path).toBe("outputs.whistle.routes[0].apiHost");
  });
});
```

- [ ] **Step 2: Run validation tests to verify failure**

Run:

```bash
npm test -- tests/artifact/validate.test.ts
```

Expected: FAIL because `validateArtifact` does not exist.

- [ ] **Step 3: Implement JSON path helper**

Create `src/utils/json-path.ts`:

```ts
export function pathFor(parts: Array<string | number>): string {
  return parts
    .map((part, index) => {
      if (typeof part === "number") return `[${part}]`;
      return index === 0 ? part : `.${part}`;
    })
    .join("");
}
```

- [ ] **Step 4: Implement validator**

Create `src/artifact/validate.ts`:

```ts
import type { ApiArtifact, ReviewItem } from "./types.js";

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
        item("needsReview", "output", `outputs.whistle.routes[${index}].apiHost`, "Route API host is unconfirmed.")
      );
    }
    if (route.targetPort === null) {
      needsReview.push(
        item("needsReview", "output", `outputs.whistle.routes[${index}].targetPort`, "Mockoon target port is unconfirmed.")
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
            `endpoints[${endpointIndex}].vo.fields[${fieldIndex}]`,
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
            `endpoints[${endpointIndex}].mapper.steps[${stepIndex}]`,
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
```

- [ ] **Step 5: Run validation tests**

Run:

```bash
npm test -- tests/artifact/validate.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/json-path.ts src/artifact/validate.ts tests/artifact/validate.test.ts
git commit -m "feat: validate artifact review gates"
```

## Task 5: Generate TypeScript API Code

**Files:**
- Create: `src/generators/api-code.ts`
- Test: `tests/generators/api-code.test.ts`

- [ ] **Step 1: Write failing API code generation tests**

Create `tests/generators/api-code.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiArtifact } from "../../src/artifact/types.js";
import { generateApiCode } from "../../src/generators/api-code.js";

const artifact: ApiArtifact = {
  schemaVersion: "0.2.0",
  sources: [],
  openapi: { file: ".mockgen/openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" },
  reviewItems: [],
  endpoints: [
    {
      id: "ep-get-user",
      operationId: "getUser",
      method: "GET",
      path: "/api/users/{id}",
      origin: "generated",
      reviewStatus: "confirmed",
      dto: { response: "GetUserResponseDTO" },
      vo: {
        name: "GetUserVO",
        owner: "api-skill",
        origin: "inferred",
        reviewStatus: "confirmed",
        fields: [
          {
            name: "userName",
            type: "string",
            sources: [{ path: "response.body.user_name", role: "userName" }],
            confidence: "medium",
            origin: "inferred",
            reviewStatus: "confirmed"
          }
        ]
      },
      mapper: {
        name: "toGetUserVO",
        enabled: true,
        origin: "inferred",
        reviewStatus: "confirmed",
        steps: [
          {
            id: "step-001",
            order: 1,
            operation: "rename",
            inputs: ["response.body.user_name"],
            output: "vo.userName",
            params: {},
            confidence: "medium",
            reviewStatus: "confirmed"
          }
        ]
      },
      mock: {
        origin: "generated",
        reviewStatus: "confirmed",
        selection: { mode: "query", key: "scenario", defaultScenario: "success-default" },
        scenarios: []
      },
      reviewItems: []
    }
  ],
  outputs: {
    apiCode: {
      suggestedFile: "src/api/generated/api.generated.ts",
      placement: "confirmed",
      integrationMode: "standalone",
      transformResponse: true,
      lastGeneratedSha256: null,
      origin: "generated",
      reviewStatus: "confirmed"
    },
    whistle: { file: ".mockgen/whistle.txt", routes: [] },
    mockoon: {
      file: ".mockgen/mockoon.json",
      port: 3100,
      defaultHeaders: {},
      origin: "generated",
      reviewStatus: "confirmed"
    }
  }
};

describe("generateApiCode", () => {
  it("generates DTO, VO, mapper, and VO-returning request function", () => {
    const code = generateApiCode(artifact);
    expect(code).toContain("export interface GetUserResponseDTO");
    expect(code).toContain("export interface GetUserVO");
    expect(code).toContain("export function toGetUserVO");
    expect(code).toContain("export async function getUser");
    expect(code).toContain("return toGetUserVO(dto);");
  });

  it("returns DTO directly when transformResponse is false", () => {
    const code = generateApiCode({
      ...artifact,
      outputs: {
        ...artifact.outputs,
        apiCode: { ...artifact.outputs.apiCode, transformResponse: false }
      }
    });
    expect(code).toContain("Promise<GetUserResponseDTO>");
    expect(code).toContain("return request<GetUserResponseDTO>");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/generators/api-code.test.ts
```

Expected: FAIL because `generateApiCode` does not exist.

- [ ] **Step 3: Implement API code generator**

Create `src/generators/api-code.ts`:

```ts
import type { ApiArtifact, ArtifactEndpoint, MapperStep } from "../artifact/types.js";
import { sha256 } from "./hash.js";

export function generateApiCode(artifact: ApiArtifact): string {
  const body = [
    "/* eslint-disable */",
    "/* This file is generated by mockgen. Do not edit by hand unless you accept it back into the artifact workflow. */",
    "declare function request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T>;",
    "",
    ...artifact.endpoints.flatMap((endpoint) => generateEndpoint(endpoint, artifact.outputs.apiCode.transformResponse))
  ].join("\n");

  return `/* mockgen-sha256: ${sha256(body)} */\n${body}\n`;
}

function generateEndpoint(endpoint: ArtifactEndpoint, transformResponse: boolean): string[] {
  const dto = endpoint.dto.response;
  const vo = endpoint.vo.name;
  const mapper = endpoint.mapper.name;
  const responseType = transformResponse ? vo : dto;

  return [
    `export interface ${dto} {`,
    ...endpoint.vo.fields.flatMap((field) => {
      const source = field.sources[0]?.path.split(".").at(-1) ?? field.name;
      return [`  ${source}: ${field.type};`];
    }),
    "}",
    "",
    `export interface ${vo} {`,
    ...endpoint.vo.fields.map((field) => `  ${field.name}: ${field.type};`),
    "}",
    "",
    `export function ${mapper}(dto: ${dto}): ${vo} {`,
    "  const vo = {} as " + vo + ";",
    ...endpoint.mapper.steps.sort((a, b) => a.order - b.order).map(generateMapperStep),
    "  return vo;",
    "}",
    "",
    `export async function ${endpoint.operationId}(): Promise<${responseType}> {`,
    transformResponse
      ? `  const dto = await request<${dto}>("${endpoint.path}", { method: "${endpoint.method}" });\n  return ${mapper}(dto);`
      : `  return request<${dto}>("${endpoint.path}", { method: "${endpoint.method}" });`,
    "}",
    ""
  ];
}

function generateMapperStep(step: MapperStep): string {
  if (step.operation === "rename" || step.operation === "assign") {
    const input = step.inputs[0]?.replace("response.body.", "dto.") ?? "undefined";
    const output = step.output.replace("vo.", "vo.");
    return `  ${output} = ${input};`;
  }
  return `  // needsReview: ${step.description ?? `Unsupported mapper operation ${step.operation}`}`;
}
```

- [ ] **Step 4: Run API code generator tests**

Run:

```bash
npm test -- tests/generators/api-code.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/api-code.ts tests/generators/api-code.test.ts
git commit -m "feat: generate api code"
```

## Task 6: Generate Whistle Rules

**Files:**
- Create: `src/generators/whistle.ts`
- Test: `tests/generators/whistle.test.ts`

- [ ] **Step 1: Write failing whistle tests**

Create `tests/generators/whistle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateWhistleRules } from "../../src/generators/whistle.js";
import type { WhistleRoute } from "../../src/artifact/types.js";

const route: WhistleRoute = {
  endpointId: "ep-get-user",
  operationId: "getUser",
  method: "GET",
  apiHost: "api.example.com",
  sourcePath: "/api/users/{id}",
  sourcePattern: "/api/users/*",
  targetPort: 3100,
  targetPath: "/api/users/:id",
  origin: "manual",
  reviewStatus: "confirmed"
};

describe("generateWhistleRules", () => {
  it("generates host plus path forwarding", () => {
    expect(generateWhistleRules([route])).toBe("api.example.com/api/users/* http://127.0.0.1:3100/api/users/:id\n");
  });

  it("throws when apiHost is pending", () => {
    expect(() => generateWhistleRules([{ ...route, apiHost: "pending-confirmation" }])).toThrow("apiHost");
  });

  it("throws when targetPort is missing", () => {
    expect(() => generateWhistleRules([{ ...route, targetPort: null }])).toThrow("targetPort");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/generators/whistle.test.ts
```

Expected: FAIL because `generateWhistleRules` does not exist.

- [ ] **Step 3: Implement whistle generator**

Create `src/generators/whistle.ts`:

```ts
import type { WhistleRoute } from "../artifact/types.js";

export function generateWhistleRules(routes: WhistleRoute[]): string {
  return routes.map(ruleFor).join("\n") + (routes.length ? "\n" : "");
}

function ruleFor(route: WhistleRoute): string {
  if (route.apiHost === "pending-confirmation") {
    throw new Error(`Cannot export whistle rule for ${route.operationId}: apiHost is pending confirmation.`);
  }
  if (route.targetPort === null) {
    throw new Error(`Cannot export whistle rule for ${route.operationId}: targetPort is pending confirmation.`);
  }
  return `${route.apiHost}${route.sourcePattern} http://127.0.0.1:${route.targetPort}${route.targetPath}`;
}
```

- [ ] **Step 4: Run whistle tests**

Run:

```bash
npm test -- tests/generators/whistle.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/whistle.ts tests/generators/whistle.test.ts
git commit -m "feat: generate whistle rules"
```

## Task 7: Generate Mockoon JSON

**Files:**
- Create: `src/generators/mockoon.ts`
- Test: `tests/generators/mockoon.test.ts`

- [ ] **Step 1: Write failing Mockoon tests**

Create `tests/generators/mockoon.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ApiArtifact } from "../../src/artifact/types.js";
import { generateMockoonEnvironment } from "../../src/generators/mockoon.js";

const artifact: ApiArtifact = {
  schemaVersion: "0.2.0",
  sources: [],
  openapi: { file: ".mockgen/openapi.yaml", sha256: "abc", origin: "imported", reviewStatus: "confirmed" },
  reviewItems: [],
  endpoints: [
    {
      id: "ep-get-user",
      operationId: "getUser",
      method: "GET",
      path: "/api/users/{id}",
      origin: "generated",
      reviewStatus: "confirmed",
      dto: { response: "GetUserResponseDTO" },
      vo: { name: "GetUserVO", owner: "api-skill", origin: "inferred", reviewStatus: "confirmed", fields: [] },
      mapper: { name: "toGetUserVO", enabled: true, origin: "inferred", reviewStatus: "confirmed", steps: [] },
      mock: {
        origin: "generated",
        reviewStatus: "confirmed",
        selection: { mode: "query", key: "scenario", defaultScenario: "success-default" },
        scenarios: [
          {
            name: "success-default",
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            bodyTemplate: "{ \"name\": \"{{faker 'person.firstName'}}\" }",
            origin: "generated",
            reviewStatus: "confirmed",
            enabled: true
          }
        ]
      },
      reviewItems: []
    }
  ],
  outputs: {
    apiCode: {
      suggestedFile: "src/api/generated/api.generated.ts",
      placement: "confirmed",
      integrationMode: "standalone",
      transformResponse: true,
      lastGeneratedSha256: null,
      origin: "generated",
      reviewStatus: "confirmed"
    },
    whistle: { file: ".mockgen/whistle.txt", routes: [] },
    mockoon: {
      file: ".mockgen/mockoon.json",
      port: 3100,
      defaultHeaders: { "Content-Type": "application/json; charset=utf-8" },
      origin: "generated",
      reviewStatus: "confirmed"
    }
  }
};

describe("generateMockoonEnvironment", () => {
  it("generates one route with scenario responses", () => {
    const env = generateMockoonEnvironment(artifact);
    expect(env.port).toBe(3100);
    expect(env.routes[0]?.method).toBe("get");
    expect(env.routes[0]?.endpoint).toBe("api/users/:id");
    expect(env.routes[0]?.responses[0]?.body).toContain("faker");
  });

  it("throws when port is missing", () => {
    expect(() =>
      generateMockoonEnvironment({
        ...artifact,
        outputs: { ...artifact.outputs, mockoon: { ...artifact.outputs.mockoon, port: null } }
      })
    ).toThrow("Mockoon port");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/generators/mockoon.test.ts
```

Expected: FAIL because `generateMockoonEnvironment` does not exist.

- [ ] **Step 3: Implement Mockoon generator**

Create `src/generators/mockoon.ts`:

```ts
import type { ApiArtifact } from "../artifact/types.js";

interface MockoonResponse {
  uuid: string;
  body: string;
  latency: number;
  statusCode: number;
  label: string;
  headers: Array<{ key: string; value: string }>;
}

interface MockoonRoute {
  uuid: string;
  method: string;
  endpoint: string;
  responses: MockoonResponse[];
  enabled: boolean;
}

interface MockoonEnvironment {
  uuid: string;
  lastMigration: number;
  name: string;
  endpointPrefix: string;
  latency: number;
  port: number;
  routes: MockoonRoute[];
}

export function generateMockoonEnvironment(artifact: ApiArtifact): MockoonEnvironment {
  const port = artifact.outputs.mockoon.port;
  if (port === null) {
    throw new Error("Mockoon port is pending confirmation.");
  }

  return {
    uuid: "mockgen-env",
    lastMigration: 32,
    name: "mockgen",
    endpointPrefix: "",
    latency: 0,
    port,
    routes: artifact.endpoints.map((endpoint) => ({
      uuid: endpoint.id,
      method: endpoint.method.toLowerCase(),
      endpoint: endpoint.path.replace(/^\//, "").replace(/\{([^}]+)\}/g, ":$1"),
      enabled: true,
      responses: endpoint.mock.scenarios
        .filter((scenario) => scenario.enabled)
        .map((scenario) => ({
          uuid: `${endpoint.id}-${scenario.name}`,
          body: scenario.bodyTemplate,
          latency: 0,
          statusCode: scenario.statusCode,
          label: scenario.name,
          headers: Object.entries({ ...artifact.outputs.mockoon.defaultHeaders, ...scenario.headers }).map(([key, value]) => ({
            key,
            value
          }))
        }))
    }))
  };
}
```

- [ ] **Step 4: Run Mockoon tests**

Run:

```bash
npm test -- tests/generators/mockoon.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/mockoon.ts tests/generators/mockoon.test.ts
git commit -m "feat: generate mockoon environment"
```

## Task 8: Add Config Loading and CLI Commands

**Files:**
- Create: `src/config/types.ts`
- Create: `src/config/load-config.ts`
- Create: `src/utils/fs.ts`
- Modify: `src/cli.ts`
- Test: `tests/cli/cli.test.ts`

- [ ] **Step 1: Extend CLI tests**

Replace `tests/cli/cli.test.ts` with:

```ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("createProgram", () => {
  it("registers core commands", () => {
    const program = createProgram();
    expect(program.commands.map((command) => command.name())).toEqual([
      "init",
      "from-openapi",
      "generate",
      "export",
      "validate"
    ]);
  });

  it("init writes mockgen.config.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mockgen-"));
    const program = createProgram();
    await program.parseAsync(["node", "mockgen", "init", "--cwd", dir], { from: "user" });
    const config = JSON.parse(await readFile(join(dir, "mockgen.config.json"), "utf8"));
    expect(config.artifactDir).toBe(".mockgen");
  });
});
```

- [ ] **Step 2: Run CLI tests to verify failure**

Run:

```bash
npm test -- tests/cli/cli.test.ts
```

Expected: FAIL because commands are not implemented.

- [ ] **Step 3: Create config types and loader**

Create `src/config/types.ts`:

```ts
export interface MockgenConfig {
  artifactDir: string;
  openapiFile: string;
  mockoonFile: string;
  whistleFile: string;
  apiOutput: string;
  splitApiOutput: boolean;
  transformResponse: boolean;
  mockoonPort: number | null;
  confirmPlacement: boolean;
}

export const defaultConfig: MockgenConfig = {
  artifactDir: ".mockgen",
  openapiFile: ".mockgen/openapi.yaml",
  mockoonFile: ".mockgen/mockoon.json",
  whistleFile: ".mockgen/whistle.txt",
  apiOutput: "src/api/generated/api.generated.ts",
  splitApiOutput: false,
  transformResponse: true,
  mockoonPort: null,
  confirmPlacement: true
};
```

Create `src/config/load-config.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultConfig, type MockgenConfig } from "./types.js";

export async function loadConfig(cwd: string): Promise<MockgenConfig> {
  try {
    const raw = await readFile(join(cwd, "mockgen.config.json"), "utf8");
    return { ...defaultConfig, ...(JSON.parse(raw) as Partial<MockgenConfig>) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultConfig;
    throw error;
  }
}
```

- [ ] **Step 4: Create filesystem helper**

Create `src/utils/fs.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeTextFile(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
```

- [ ] **Step 5: Implement CLI commands**

Replace `src/cli.ts` with:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { join } from "node:path";
import { artifactSchema } from "./artifact/schema.js";
import { artifactFromOpenApi } from "./artifact/from-openapi.js";
import { validateArtifact } from "./artifact/validate.js";
import { defaultConfig } from "./config/types.js";
import { loadConfig } from "./config/load-config.js";
import { generateApiCode } from "./generators/api-code.js";
import { generateMockoonEnvironment } from "./generators/mockoon.js";
import { generateWhistleRules } from "./generators/whistle.js";
import { loadOpenApi } from "./openapi/load-openapi.js";
import { prettyJson, writeTextFile } from "./utils/fs.js";
import { MOCKGEN_VERSION } from "./index.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("mockgen")
    .description("Generate frontend API contracts and mock files from reviewed OpenAPI artifacts.")
    .version(MOCKGEN_VERSION);

  program
    .command("init")
    .description("Create default mockgen config.")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .action(async (options: { cwd: string }) => {
      await writeTextFile(join(options.cwd, "mockgen.config.json"), prettyJson(defaultConfig));
    });

  program
    .command("from-openapi")
    .argument("<file>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .description("Create api-artifact.json from reviewed OpenAPI.")
    .action(async (file: string, options: { cwd: string }) => {
      const config = await loadConfig(options.cwd);
      const openapi = await loadOpenApi(join(options.cwd, file));
      const artifact = artifactFromOpenApi(openapi, {
        artifactDir: config.artifactDir,
        apiOutput: config.apiOutput,
        mockoonPort: config.mockoonPort
      });
      await writeTextFile(join(options.cwd, config.artifactDir, "api-artifact.json"), prettyJson(artifact));
    });

  program
    .command("generate")
    .requiredOption("--from <artifact>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .description("Generate TypeScript API code from artifact.")
    .action(async (options: { from: string; cwd: string }) => {
      const config = await loadConfig(options.cwd);
      const artifact = await readArtifact(join(options.cwd, options.from));
      await writeTextFile(join(options.cwd, config.apiOutput), generateApiCode(artifact));
    });

  program
    .command("export")
    .argument("<target>", "whistle or mockoon")
    .requiredOption("--from <artifact>")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .description("Export whistle.txt or mockoon.json.")
    .action(async (target: string, options: { from: string; cwd: string }) => {
      const artifact = await readArtifact(join(options.cwd, options.from));
      if (target === "whistle") {
        await writeTextFile(join(options.cwd, artifact.outputs.whistle.file), generateWhistleRules(artifact.outputs.whistle.routes));
        return;
      }
      if (target === "mockoon") {
        await writeTextFile(join(options.cwd, artifact.outputs.mockoon.file), prettyJson(generateMockoonEnvironment(artifact)));
        return;
      }
      throw new Error(`Unknown export target: ${target}`);
    });

  program
    .command("validate")
    .requiredOption("--from <artifact>")
    .option("--openapi <file>")
    .option("--strict", "Fail on needsReview")
    .option("--cwd <cwd>", "Working directory", process.cwd())
    .description("Validate artifact review gates.")
    .action(async (options: { from: string; openapi?: string; strict?: boolean; cwd: string }) => {
      const artifact = await readArtifact(join(options.cwd, options.from));
      const openapi = await loadOpenApi(join(options.cwd, options.openapi ?? artifact.openapi.file));
      const result = validateArtifact(artifact, {
        strict: Boolean(options.strict),
        currentOpenApiSha256: openapi.sha256
      });
      console.log(prettyJson(result));
      if (result.fatal.length > 0 || (options.strict && result.needsReview.length > 0)) {
        process.exitCode = 1;
      }
    });

  return program;
}

async function readArtifact(file: string) {
  const { readFile } = await import("node:fs/promises");
  return artifactSchema.parse(JSON.parse(await readFile(file, "utf8")));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync(process.argv);
}
```

- [ ] **Step 6: Run CLI tests**

Run:

```bash
npm test -- tests/cli/cli.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run full test suite and typecheck**

Run:

```bash
npm run typecheck
npm test
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/config/types.ts src/config/load-config.ts src/utils/fs.ts src/cli.ts tests/cli/cli.test.ts
git commit -m "feat: wire mockgen cli commands"
```

## Task 9: Add README Usage and End-to-End Fixture Test

**Files:**
- Modify: `README.md`
- Create: `tests/cli/e2e.test.ts`

- [ ] **Step 1: Write end-to-end test**

Create `tests/cli/e2e.test.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("mockgen e2e", () => {
  it("creates artifact and exports generated files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mockgen-e2e-"));
    await mkdir(join(cwd, ".mockgen"), { recursive: true });
    await writeFile(
      join(cwd, ".mockgen/openapi.yaml"),
      `openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /api/users/{id}:
    get:
      operationId: getUser
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
`,
      "utf8"
    );

    const program = createProgram();
    await program.parseAsync(["node", "mockgen", "init", "--cwd", cwd], { from: "user" });
    await program.parseAsync(["node", "mockgen", "from-openapi", ".mockgen/openapi.yaml", "--cwd", cwd], { from: "user" });
    await program.parseAsync(["node", "mockgen", "generate", "--from", ".mockgen/api-artifact.json", "--cwd", cwd], {
      from: "user"
    });

    const artifact = await readFile(join(cwd, ".mockgen/api-artifact.json"), "utf8");
    const apiCode = await readFile(join(cwd, "src/api/generated/api.generated.ts"), "utf8");
    expect(artifact).toContain("\"schemaVersion\": \"0.2.0\"");
    expect(apiCode).toContain("export async function getUser");
  });
});
```

- [ ] **Step 2: Run e2e test to verify failure or pass**

Run:

```bash
npm test -- tests/cli/e2e.test.ts
```

Expected: PASS if prior tasks are complete.

- [ ] **Step 3: Update README**

Replace `README.md` with:

```md
# api-mockgen

`mockgen` is an artifact-first CLI for generating frontend API code, whistle rules, and Mockoon environments from reviewed OpenAPI contracts.

## Commands

```bash
mockgen init
mockgen from-openapi .mockgen/openapi.yaml
mockgen generate --from .mockgen/api-artifact.json
mockgen export whistle --from .mockgen/api-artifact.json
mockgen export mockoon --from .mockgen/api-artifact.json
mockgen validate --from .mockgen/api-artifact.json --strict
```

Loose Markdown or copied API docs are handled by the API mockgen skill before the CLI runs. The CLI only accepts structured OpenAPI or `api-artifact.json` inputs.

## Generated Files

- `.mockgen/api-artifact.json`
- `.mockgen/whistle.txt`
- `.mockgen/mockoon.json`
- `src/api/generated/api.generated.ts`
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run typecheck
npm test
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/cli/e2e.test.ts
git commit -m "docs: document mockgen usage"
```

## Self-Review Checklist

- Spec coverage:
  - `sources[]` with URL/file/text/export: Task 2 schema, Task 3 OpenAPI source.
  - `origin` and `reviewStatus`: Task 2 schema.
  - Structured `reviewItems`: Task 2 schema, Task 4 validation.
  - Multiple VO sources: Task 2 schema, Task 5 code generation consumes first source for MVP.
  - Ordered mapper steps: Task 2 schema, Task 5 generation sorts by `order`.
  - Endpoint-level mock selection: Task 2 schema, Task 7 Mockoon generator preserves scenarios.
  - Whistle routes reference endpoints: Task 2 schema, Task 6 route generator.
  - OpenAPI hash drift: Task 3 hash, Task 4 validation.
  - `transformResponse`: Task 5.
  - Missing `apiHost` and Mockoon port gates: Task 4 and Task 6.

- Intentional MVP simplifications:
  - The API code generator emits simple DTO shapes from VO sources in Task 5; deeper OpenAPI schema-to-TypeScript support can be added after the first passing loop.
  - Mockoon scenario selection is represented in artifact schema first; the MVP Mockoon adapter exports responses and keeps endpoint shape simple.
  - Whistle adapter starts with host + path forwarding and must be checked against a real project before being called stable.

- Placeholder scan:
  - No unfinished placeholder steps.
  - Each task includes concrete files, test commands, expected results, and commit commands.

- Type consistency:
  - `schemaVersion` is `0.2.0` throughout.
  - `reviewItem.resolutionStatus` is used instead of generic `status`.
  - Ordered mapper steps are used consistently.
  - `sources[]` is used instead of single `source`.
