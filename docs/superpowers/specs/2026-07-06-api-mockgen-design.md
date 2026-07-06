# API Mockgen Skill and CLI Design

## Purpose

Build a low-intrusion workflow that turns API documents into frontend-ready API contracts, mock configuration, and reviewable generated artifacts.

The tool should combine:

- A Codex skill for uncertain, human-in-the-loop work: reading loose API documents, producing OpenAPI, suggesting VO fields, and marking review items.
- A deterministic CLI for repeatable exports: TypeScript API code, OpenAPI files, whistle rules, and Mockoon environments.

The design favors an artifact-first architecture. Generated source files are outputs, not the source of truth.

## Goals

- Convert loose API documents and semi-structured exports into OpenAPI.
- Generate frontend request code with DTO, VO, and mapper boundaries.
- Keep DTO as the backend contract and VO as the frontend view model.
- Generate whistle `txt` rules for routing API requests to Mockoon.
- Generate Mockoon JSON with dynamic Faker-style response bodies and multiple testing scenarios.
- Minimize project intrusion by letting humans confirm output placement, host, paths, and Mockoon port.
- Produce a structured artifact that other skills or humans can review before code generation.

## Non-Goals

- Do not generate additional mock runtime handler code such as MSW, Express, or Vite mock handlers in the MVP.
- Do not force generated API code into a specific project directory.
- Do not infer final network routing from proxy chains alone.
- Do not treat low-confidence LLM guesses as confirmed business logic.

## Recommended Approach

Use an artifact-first two-layer architecture.

The skill handles uncertain interpretation. It reads Markdown, copied Feishu/Yuque text, legacy Swagger, Apifox, YApi, or Postman exports and produces an OpenAPI document plus an `api-artifact.json` draft.

The CLI handles deterministic generation. It reads OpenAPI or `api-artifact.json` and exports code, mock files, and validation reports.

OpenAPI is the backend API contract. `api-artifact.json` is the frontend collaboration contract. Generated files are derived outputs.

## Architecture

### Skill Intelligence Layer

The skill is responsible for:

- Parsing loose or semi-structured API documents.
- Producing OpenAPI 3.x.
- Creating an `api-artifact.json` draft.
- Suggesting VO fields and mapper rules.
- Marking uncertain enum mappings, field meanings, output placement, hosts, paths, ports, and headers as review items.
- Coordinating with page-generation skills or humans to confirm VO and mapper decisions.

The skill may use an LLM for interpretation, but it should preserve uncertainty in the artifact instead of silently turning guesses into facts.

### Artifact Protocol Layer

`api-artifact.json` is the stable handoff format between:

- The API document conversion skill.
- The CLI generator.
- A frontend page-generation skill.
- Human reviewers.

It stores endpoint metadata, DTO and VO suggestions, mapper rules, mock examples, output preferences, and review items.

### CLI Generation Layer

The CLI should be deterministic. Given the same artifact and config, it should produce the same outputs.

The CLI outputs:

- `openapi.yaml` or `openapi.json`
- `api.generated.ts` by default, or a custom path confirmed by human/project config
- `whistle.txt`
- `mockoon.json`
- validation reports

The CLI should not make business-semantic guesses. It may generate drafts and review items.

## Default Directory Layout

The default layout is a suggestion, not a requirement:

```text
.mockgen/
  api-artifact.json
  openapi.yaml
  mockoon.json
  whistle.txt

src/api/generated/
  api.generated.ts
```

Projects can override these paths. Whether generated API code is colocated with existing API code or kept standalone is a human/project decision.

## CLI Commands

Initial command shape:

```bash
mockgen init
mockgen parse ./docs/api.md
mockgen generate --from .mockgen/api-artifact.json
mockgen export whistle
mockgen export mockoon
mockgen validate
```

`parse` may be skill-assisted. `generate`, `export`, and `validate` should be deterministic.

Useful flags:

```bash
mockgen generate --api-output src/api/generated/api.generated.ts
mockgen export mockoon --mockoon-port 3100
mockgen export whistle --mockoon-port 3100
mockgen validate --strict
```

## Configuration

Example project config:

```ts
export default {
  artifactDir: ".mockgen",
  openapiFile: ".mockgen/openapi.yaml",
  mockoonFile: ".mockgen/mockoon.json",
  whistleFile: ".mockgen/whistle.txt",
  apiOutput: "src/api/generated/api.generated.ts",
  splitApiOutput: false,
  mockoonPort: null,
  confirmPlacement: true
};
```

The config can provide defaults, but reviewable artifact fields should still record whether important values were inferred, manually confirmed, or left pending.

## Artifact Schema Draft

Simplified structure:

```json
{
  "version": "0.1.0",
  "source": {
    "type": "markdown | openapi | apifox | yapi | postman",
    "file": "docs/api.md"
  },
  "openapi": {
    "file": ".mockgen/openapi.yaml",
    "status": "generated | reviewed"
  },
  "endpoints": [
    {
      "operationId": "getUserList",
      "method": "GET",
      "path": "/api/users",
      "summary": "User list",
      "dto": {
        "request": "GetUserListRequestDTO",
        "response": "GetUserListResponseDTO"
      },
      "vo": {
        "name": "UserListVO",
        "status": "suggested | confirmed",
        "fields": []
      },
      "mapper": {
        "name": "toUserListVO",
        "status": "suggested | confirmed",
        "rules": []
      },
      "mock": {
        "scenarios": [],
        "status": "generated | reviewed"
      },
      "reviewItems": []
    }
  ],
  "outputs": {
    "apiCode": {
      "suggestedFile": "src/api/generated/api.generated.ts",
      "placement": "pending-confirmation",
      "integrationMode": "standalone | co-located | custom"
    },
    "whistle": {
      "file": ".mockgen/whistle.txt",
      "routes": [
        {
          "method": "GET",
          "apiHost": "pending-confirmation",
          "sourcePath": "/api/users",
          "targetUrl": "http://127.0.0.1:3100/api/users",
          "status": "pending-confirmation"
        }
      ]
    },
    "mockoon": {
      "file": ".mockgen/mockoon.json",
      "port": "pending-confirmation",
      "defaultHeaders": {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  }
}
```

Important network decisions are route-level. `apiHost` belongs to each whistle route because different endpoints may use different hosts.

## DTO, VO, Mapper, and API Code

DTO represents the backend API contract and should be generated strictly from OpenAPI.

VO represents the frontend view model and may be suggested by the skill, a page-generation skill, or a human.

Mapper functions form the anti-corruption layer between DTO and VO. They handle:

- Field renaming.
- Enum label mapping.
- Date and time formatting.
- Amount and unit conversion.
- Null/default fallbacks.
- Shape flattening or grouping when confirmed.

API functions should return VO by default. Internally they request DTO and pass it through the mapper.

Example:

```ts
export interface UserDTO {
  id: number;
  user_name: string;
  status: number;
}

export interface UserVO {
  id: number;
  name: string;
  statusText: string;
}

export function toUserVO(dto: UserDTO): UserVO {
  return {
    id: dto.id,
    name: dto.user_name,
    statusText: dto.status === 1 ? "Enabled" : "Disabled"
  };
}

export async function getUser(): Promise<UserVO> {
  const dto = await request<UserDTO>("/api/user");
  return toUserVO(dto);
}
```

If enum meanings or display fields are uncertain, the artifact should record review items. The generator can emit conservative mapper code or an explicit `needsReview` marker, but should not hard-code low-confidence business semantics as confirmed behavior.

## API Code Output Strategy

Default output is a single `api.generated.ts` file. This keeps generated API code low-intrusion and easy to review.

Splitting DTO, VO, mapper, and API functions into separate files should be optional and project-configured.

Code placement is not decided by the tool alone. The artifact records suggested placement and confirmation status.

## Whistle Export Strategy

Whistle output is a `txt` file.

The generator only needs accurate route-level values:

- `apiHost`: the host the browser actually requests for that route.
- `sourcePath`: the exact path to match.
- `targetUrl`: the Mockoon target URL.

The tool may inspect project files for clues, including Vite config, Webpack dev server proxy, package scripts, environment variables, nginx config, or existing whistle files. These are only clues. If the host cannot be determined accurately, the route stays pending.

The artifact should not model the full proxy chain. The concrete route list is sufficient for whistle generation.

Example draft rule shape:

```text
api.example.com/api/users http://127.0.0.1:3100/api/users
```

The exact whistle syntax should be implemented by a dedicated adapter and verified against real project usage.

## Mockoon Export Strategy

`mockoon.json` should be generated from OpenAPI plus artifact mock scenarios.

Mockoon port is manually confirmed or passed through CLI flags. It should not be guessed.

Response body should use Mockoon-supported templating with Faker-style dynamic values where possible, rather than static JSON only.

Each endpoint should support multiple scenarios when enough schema information exists:

- `success-default`: representative normal response.
- `success-empty`: empty list, empty object, or no data state.
- `success-boundary`: long strings, min/max numbers, special characters, nulls, missing optional fields.
- `error-business`: documented business error.
- `error-auth`: 401 or 403 when auth is documented or implied.
- `error-server`: 500 fallback.

Default response headers should include JSON content type:

```json
{
  "Content-Type": "application/json; charset=utf-8"
}
```

If docs or project config imply auth, trace IDs, CORS, or custom headers, the artifact should mark them for review before final export.

## Validation and Error Handling

Errors should be categorized.

`fatal`:

- Invalid OpenAPI.
- Invalid artifact schema.
- Cannot write output files.

`needsReview`:

- VO field is low confidence.
- Mapper enum meaning is unclear.
- API code placement is unconfirmed.
- Mockoon port is unconfirmed.
- Route-level `apiHost` is unconfirmed.
- Custom headers require human confirmation.

`warning`:

- Missing field descriptions.
- Incomplete mock examples.
- Weak operation naming.
- Missing optional error responses.

`mockgen validate` should print a clear review list. Default generation can produce drafts, while `--strict` fails on `needsReview`.

## Testing Strategy

MVP tests should be deterministic and fixture-driven.

Cover:

- Markdown example fixture to OpenAPI draft snapshot.
- OpenAPI to artifact schema validation.
- Artifact to `api.generated.ts` snapshot.
- Artifact to `mockoon.json` structure validation.
- Artifact to `whistle.txt` generation.
- Low-confidence VO or mapper suggestions becoming `reviewItems`.
- Missing route-level `apiHost` blocking strict whistle export.
- Missing Mockoon port blocking strict Mockoon or whistle export.

LLM outputs should be captured as fixtures in tests. CI should not depend on live model behavior.

## MVP Scope

The MVP should support:

- Markdown/text API document input through the skill.
- OpenAPI 3.x output.
- `api-artifact.json` draft.
- Single-file TypeScript API code generation.
- Route-level whistle `txt` generation after host and port confirmation.
- Mockoon JSON generation with dynamic Faker-style response bodies and multiple scenarios.
- Validation with `fatal`, `needsReview`, and `warning` categories.

Semi-structured importers for Apifox, YApi, Postman, and legacy Swagger can be added as adapters after the artifact and generator path is stable.

## MVP Decisions

- Generated API functions should target a project-provided `request` function by default. If the project cannot provide one, the generator emits a small adapter placeholder that must be confirmed before strict validation passes.
- Mockoon body generation should start with a small, documented templating subset for strings, numbers, booleans, dates, enums, arrays, empty values, nulls, and boundary values. Broader Faker helper coverage can be added after the MVP.
- Whistle generation should be implemented through a dedicated adapter. The MVP adapter should cover route-level host plus path forwarding to Mockoon and should be verified against at least one real project before being treated as stable.
- Confirmed VO and mapper decisions should be stored in `api-artifact.json` as the source of truth. Page-generation skills may create code patches from it, but should not become the canonical storage location for API model decisions.
