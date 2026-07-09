---
name: mockoon-gen
description: "Use when turning frontend API documents or reviewed OpenAPI contracts into low-intrusion mock assets: api-artifact.json, TypeScript DTO/VO API code, Whistle import JSON, and Mockoon environment JSON. Trigger for requests about frontend API mock acceleration, OpenAPI-to-Mockoon workflows, Whistle forwarding rules, DTO/VO mapper generation, or reviewing mock artifacts before generation."
---

# Mockoon Gen

Use this skill as the agent workflow layer around the bundled deterministic CLI. The skill handles uncertain inputs, review gates, and project-specific confirmation. The CLI handles repeatable generation only.

## Core Contract

- Treat OpenAPI as the backend contract source of truth.
- Treat `.mockoon-gen/api-artifact.json` as the reviewed frontend collaboration artifact.
- Keep generated API code, Whistle JSON, and Mockoon JSON as derived outputs.
- Do not infer final host, forwarding paths, Mockoon port, API code placement, or final VO shape without human or project confirmation.
- Prefer low project intrusion: write mock artifacts under the related page directory, not the project root, and only write API code to the confirmed page-local artifact path.
- If the related page directory is unclear, ask the user to identify it before initializing config, writing OpenAPI, generating artifacts, or exporting files.

## Bundled CLI

The deterministic CLI is bundled with this skill at:

```bash
<skill-dir>/bin/mockoon-gen.mjs
```

Call it from a target project with:

```bash
node <skill-dir>/bin/mockoon-gen.mjs <command> --cwd <project-dir>
```

Do not run package installation from the installed skill. If the bundled CLI is missing, explain that the skill distribution is incomplete and ask the user to install a release that includes `bin/mockoon-gen.mjs`.

## Workflow

1. Identify the project directory and the related page directory for the demand. Treat `<page-dir>` as a path relative to `<project-dir>` unless the user explicitly provides an absolute path. The artifact directory should default to `<page-dir>/.mockoon-gen`, where `<page-dir>` is the directory containing the page, route, view, or feature being mocked. If the page directory cannot be determined from the prompt, files, route name, or nearby code, ask the user before writing anything.
2. If the input is loose documentation, links, copied text, YApi/Apifox/Postman exports, or screenshots, create or update `<page-dir>/.mockoon-gen/openapi.yaml` first. Ask for human review before using it as a confirmed contract.
3. Initialize config when missing:

```bash
node <skill-dir>/bin/mockoon-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
```

4. Confirm or populate these config values before generation. `init --page-dir` should populate page-local defaults; if `mockoon-gen.config.json` already existed or was initialized without `--page-dir`, update it away from root-level defaults before running `from-openapi`:

- `mockoonPort`: human-confirmed Mockoon port.
- `whistleGroupName`: demand-specific Whistle group name.
- `artifactDir`: page-local artifact directory, usually `<page-dir>/.mockoon-gen`.
- `openapiFile`: page-local OpenAPI file, usually `<page-dir>/.mockoon-gen/openapi.yaml`.
- `mockoonFile`: page-local Mockoon export file, usually `<page-dir>/.mockoon-gen/mockoon.json`.
- `whistleFile`: page-local Whistle export file, usually `<page-dir>/.mockoon-gen/whistle.json`.
- `apiOutput`: target API code path under the related page or feature directory, or leave default pending later review.

5. Generate the artifact from reviewed OpenAPI:

```bash
node <skill-dir>/bin/mockoon-gen.mjs from-openapi <page-dir>/.mockoon-gen/openapi.yaml --page-dir <page-dir> --cwd <project-dir>
```

6. Review `<page-dir>/.mockoon-gen/api-artifact.json` before exporting:

- Set each `outputs.whistle.routes[].apiHost` to the confirmed request host.
- Confirm each `outputs.whistle.routes[].targetPort`.
- Confirm `outputs.whistle.groupName`.
- Review Mockoon scenarios, headers, status codes, and Faker templates.
- Leave final VO ownership to the page-generation skill or human when the page context is required.
- Keep unresolved uncertainty as `reviewItems` or `reviewStatus: "unreviewed" | "needs-change"`.

7. Validate before exporting:

```bash
node <skill-dir>/bin/mockoon-gen.mjs validate --from <page-dir>/.mockoon-gen/api-artifact.json --strict --cwd <project-dir>
```

8. Export derived files only after required review gates are satisfied:

```bash
node <skill-dir>/bin/mockoon-gen.mjs generate --from <page-dir>/.mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle --from <page-dir>/.mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from <page-dir>/.mockoon-gen/api-artifact.json --cwd <project-dir>
```

## Output Semantics

- Default artifact output is `<page-dir>/.mockoon-gen/api-artifact.json`; avoid project-root `.mockoon-gen` unless the user explicitly confirms that the project root is the page/feature location.
- Default Whistle output is `<page-dir>/.mockoon-gen/whistle.json`.
- Whistle JSON must contain only the demand-specific group and the order list; do not emit `Default`.
- Default Mockoon output is `<page-dir>/.mockoon-gen/mockoon.json`.
- Mockoon response bodies should use Mockoon/Faker template syntax when generated by the skill.
- Generate multiple scenarios when useful for UI testing, including success, empty, boundary, and error cases.

## Review Rules

- If OpenAPI was generated from loose docs, do not treat it as confirmed until the user reviews it.
- If OpenAPI content changes, regenerate or validate the artifact rather than silently merging conflicting DTO fields.
- If the related page directory is unknown, pause and ask instead of falling back to project-root `.mockoon-gen` or `src/api/generated`.
- If `apiHost`, `targetPort`, or `whistleGroupName` is missing, do not export Whistle.
- If `mockoonPort` is missing, do not export Mockoon.
- If VO transformation is optional or page-dependent, preserve DTO correctness and mark VO/mapper choices for later confirmation.

## User-Facing Guidance

When the user asks how to use this skill, explain:

1. Invoke it as `$mockoon-gen` once installed.
2. Provide an OpenAPI file or API documentation.
3. Confirm the related page directory, host, Mockoon port, Whistle group name, and output paths.
4. Let the skill create/review the artifact, then run the CLI exports.
