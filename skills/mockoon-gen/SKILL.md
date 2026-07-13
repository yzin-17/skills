---
name: mockoon-gen
description: "Use when turning frontend API documents or reviewed OpenAPI contracts into low-intrusion mock assets: api-artifact.json, TypeScript DTO/VO API code, Whistle import JSON/CLI CJS, and Mockoon environment JSON. Trigger for requests about frontend API mock acceleration, OpenAPI-to-Mockoon workflows, Whistle forwarding rules, DTO/VO mapper generation, or reviewing mock artifacts before generation."
---

# Mockoon Gen

Use this skill as the agent workflow layer around the bundled deterministic CLI. The skill handles uncertain inputs, review gates, and project-specific confirmation. The CLI handles repeatable generation only.

## Core Contract

- Treat OpenAPI as the backend contract source of truth.
- Treat `mockoon-gen/api-artifact.json` as the reviewed frontend collaboration artifact.
- Require the artifact directory to be named exactly `mockoon-gen`, without a leading dot. Never suggest, create, preserve, or write to a hidden dot-prefixed variant, including when it appears in existing configuration or artifacts.
- Keep generated API code, Whistle JSON/CLI CJS, and Mockoon JSON as derived outputs.
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

1. Identify the project directory and the related page directory for the demand. Treat `<page-dir>` as a path relative to `<project-dir>` unless the user explicitly provides an absolute path. The artifact directory should default to `<page-dir>/mockoon-gen`, where `<page-dir>` is the directory containing the page, route, view, or feature being mocked. If the page directory cannot be determined from the prompt, files, route name, or nearby code, ask the user before writing anything.
2. If the input is loose documentation, links, copied text, YApi/Apifox/Postman exports, or screenshots, create or update `<page-dir>/mockoon-gen/openapi.yaml` first. Ask for human review before using it as a confirmed contract.
   If the input is an existing concrete API/interface code file, use it only as the source for mock contract review. Do not generate replacement API code for that case.
3. Before generating anything, ask the user to choose the Whistle import mode:

- GUI format: Whistle UI JSON import, set `whistleFile` to `<page-dir>/mockoon-gen/whistle.json`.
- CLI format: Whistle CLI CJS import, set `whistleFile` to `<page-dir>/mockoon-gen/whistle.cjs`.

If the user has not explicitly chosen GUI or CLI format, stop and ask. Do not initialize from OpenAPI, generate artifacts, or export files yet.

4. Initialize config when missing:

```bash
node <skill-dir>/bin/mockoon-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
```

This writes `<page-dir>/mockoon-gen/mockoon-gen.config.json`. Keep demand-specific config beside the related page, not at the project root.

5. Confirm or populate these config values in `<page-dir>/mockoon-gen/mockoon-gen.config.json` before generation. `from-openapi --page-dir <page-dir>` reads this page-local config:

- `mockoonPort`: human-confirmed Mockoon port.
- `whistleGroupName`: demand-specific Whistle group name.
- `whistleFile`: must be set from the user's confirmed Whistle import mode before generation. The CLI default is `null` so generation cannot continue silently.
- Use `<page-dir>/mockoon-gen/whistle.json` for Whistle UI JSON import.
- Use `<page-dir>/mockoon-gen/whistle.cjs` for Whistle CLI import with `w2 add filepath`.
- If the user did not clearly ask for UI import JSON or CLI CJS, stop and ask which one they want instead of choosing silently.
- `artifactDir`: mandatory page-local `<page-dir>/mockoon-gen` directory; do not omit `<page-dir>/` or use a hidden dot-prefixed variant.
- `openapiFile`: page-local OpenAPI file, usually `<page-dir>/mockoon-gen/openapi.yaml`.
- `mockoonFile`: page-local Mockoon export file, usually `<page-dir>/mockoon-gen/mockoon.json`.
- `generateApiCode`: set to `false` when the input is an existing concrete API/interface code file; leave `true` for OpenAPI or loose API docs that need generated API code.
- `apiOutput`: target API code path under the related page or feature directory, or leave default pending later review.

6. Generate the artifact from reviewed OpenAPI:

```bash
node <skill-dir>/bin/mockoon-gen.mjs from-openapi <page-dir>/mockoon-gen/openapi.yaml --page-dir <page-dir> --cwd <project-dir>
```

7. Review `<page-dir>/mockoon-gen/api-artifact.json` before exporting:

- Set each `outputs.whistle.routes[].apiHost` to the confirmed request host.
- Confirm each `outputs.whistle.routes[].targetPort`.
- Confirm `outputs.whistle.groupName`.
- For any OpenAPI route with `{pathParams}`, confirm the Whistle route will export with `^` wildcard capture on the source and `$1`, `$2`, ... substitutions on the target.
- Review Mockoon scenarios, headers, status codes, and Faker templates. Every mock endpoint must include at least one success, one empty, and one failure scenario.
- For list endpoints, ensure at least one success scenario returns 20 items using Mockoon/Faker templates.
- Leave final VO ownership to the page-generation skill or human when the page context is required.
- Keep unresolved uncertainty as `reviewItems` or `reviewStatus: "unreviewed" | "needs-change"`.

8. Validate before exporting:

```bash
node <skill-dir>/bin/mockoon-gen.mjs validate --from <page-dir>/mockoon-gen/api-artifact.json --strict --cwd <project-dir>
```

9. Export derived files only after required review gates are satisfied:

```bash
node <skill-dir>/bin/mockoon-gen.mjs generate --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle-cli --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
```

Skip `generate` when `outputs.apiCode.enabled` is `false`; in that mode only export Whistle and Mockoon mock config files.

For mock-only mode, wrap the whole export flow in one guard:

```bash
node <skill-dir>/bin/mockoon-gen.mjs guard begin --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle-cli --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs guard check --from <page-dir>/mockoon-gen/api-artifact.json --cwd <project-dir>
```

Use `guard begin` before the first mock export and `guard check` after the last mock export. Do not run `generate` inside a mock-only guarded flow.

Choose the export command that matches the confirmed `whistleFile` suffix.
- `.json` => `export whistle`
- `.cjs` => `export whistle-cli`

Use the CLI file with:

```bash
w2 add <page-dir>/mockoon-gen/whistle.cjs
```

When the confirmed mode is CLI format, tell the user these commands after exporting the config files:

```bash
w2 add <page-dir>/mockoon-gen/whistle.cjs
mockoon-cli start --data <page-dir>/mockoon-gen/mockoon.json
```

## Output Semantics

- Default page-local config output is `<page-dir>/mockoon-gen/mockoon-gen.config.json`.
- Default artifact output is `<page-dir>/mockoon-gen/api-artifact.json`; the directory name is mandatory and must never be changed to a hidden dot-prefixed variant. Avoid project-root `mockoon-gen` unless the user explicitly confirms that the project root is the page/feature location.
- Default API code generation is enabled. When the input is an existing concrete API/interface code file, disable API code generation and do not emit `<page-dir>/api.generated.ts`.
- Default `whistleFile` is `null`; the user must choose GUI JSON or CLI CJS before generation.
- GUI Whistle output is `<page-dir>/mockoon-gen/whistle.json`.
- Whistle JSON must contain only the demand-specific group and the order list; do not emit `Default`.
- Default Whistle CLI output is `<page-dir>/mockoon-gen/whistle.cjs`.
- Whistle CLI CJS must export `groupName`, `name`, and `rules` so it can be imported with `w2 add filepath`.
- Whistle rules for OpenAPI path params must use official wildcard capture syntax. Build artifact `sourcePattern` from the OpenAPI path by replacing each `{param}` with `*` only. The exporter, not the artifact, adds the leading `^` needed for wildcard capture. Replace each target `{param}` with `$1`, `$2`, ... from left to right. Do not add a terminal `$` to generated dynamic routes unless the user explicitly asks for exact end anchoring.
- Keep `apiHost` semantically host-only in reviewed artifacts: for example `localhost:3000`, never `^localhost:3000` and never a value with a path. Keep `sourcePattern` path-only: for example `/api/skus/*/available-warehouses`, never `^/api/skus/*/available-warehouses`, never `/api/skus/*/available-warehouses$`, and never a full host+path matcher. Do not store Whistle matcher operators such as `^` or `$` in artifact fields; apply them only in the Whistle export step.
- Default Mockoon output is `<page-dir>/mockoon-gen/mockoon.json`.
- Mockoon response bodies should use Mockoon/Faker template syntax when generated by the skill.
- Generate at least three scenarios for every mock endpoint: `success-default`, `success-empty`, and `error-default`.
- Generate `success-list-20` for list endpoints, with 20 returned items created by Mockoon repeat/Faker templates.

## Whistle Pattern Rules

Use this embedded Whistle pattern summary when reviewing or generating forwarding rules. Do not fetch `https://wproxy.org/docs/rules/pattern.html` during normal mock generation; read the official page only when a human reports a Whistle matching issue, the local behavior contradicts this summary, or the generator needs support for a pattern not covered here.

- Plain URL patterns treat `*` in paths as a literal URL character. For path or query wildcards, the source matcher must start with `^`.
- With a `^` wildcard matcher, captures are assigned left to right: `$1`, `$2`, ... `$9`. `$0` is the full match.
- In path wildcards, `*` captures one path segment without `/` or `?`; `**` can cross `/` but stops before `?`; `***` captures the remainder including `?` and is usually only appropriate at the end.
- In query wildcards, `*` captures within one parameter value without `&`; `**` captures the rest of the query string.
- If the pattern must not match trailing path or query content, add `$` at the end of the source matcher. Without `$`, Whistle allows following `/`, `?`, or other trailing content according to pattern rules.
- Remote URL mappings may append the unmatched remainder of the request path/query. For generated API forwarding, prefer explicit target paths with `$n` captures so a path param is forwarded intentionally rather than by automatic remainder joining.

For OpenAPI paths with params, generate rules like:

```text
^localhost:3000/api/skus/*/available-warehouses http://127.0.0.1:6000/api/skus/$1/available-warehouses
^localhost:3000/api/skus/*/warehouses/* http://127.0.0.1:6000/api/skus/$1/warehouses/$2
```

Do not generate these incorrect forms:

```text
localhost:3000/api/skus/*/available-warehouses http://127.0.0.1:6000/api/skus/*/available-warehouses
localhost:3000/api/skus/*/available-warehouses http://127.0.0.1:6000/api/skus/:skuId/available-warehouses
^localhost:3000/api/skus/*/available-warehouses http://127.0.0.1:6000/api/skus/*/available-warehouses
```

When validating a Whistle artifact, treat these as fatal issues:

- `sourcePath` contains `{param}` but the exported source matcher does not start with `^`.
- `sourcePattern` stores matcher operators such as a leading `^` or terminal `$` instead of staying path-only.
- `targetPath` contains `*` or `:param` for an OpenAPI path param.
- The number or order of `$n` captures does not match the path params in `sourcePath`.
- A generated dynamic route relies on automatic remainder joining instead of an explicit `$n` target path.

## Review Rules

- If OpenAPI was generated from loose docs, do not treat it as confirmed until the user reviews it.
- If OpenAPI content changes, regenerate or validate the artifact rather than silently merging conflicting DTO fields.
- If the related page directory is unknown, pause and ask instead of falling back to project-root `mockoon-gen` or `src/api/generated`.
- If the input file is existing API/interface code, set `generateApiCode: false`, skip `generate`, and only export mock configuration files. Run `guard begin` before the first mock export and `guard check` after the last mock export; the CLI refuses if the guarded workflow changes anything except the Whistle and Mockoon config outputs.
- If the user has not made the Whistle import mode explicit, ask whether they want GUI JSON import or CLI CJS import before initializing from OpenAPI, generating the artifact, or exporting files.
- If `apiHost`, `targetPort`, or `whistleGroupName` is missing, do not export Whistle.
- If a Whistle route for an OpenAPI path param would export without `^` capture or without matching `$n` target substitutions, fix the artifact or generator before exporting.
- If `mockoonPort` is missing, do not export Mockoon.
- If any endpoint lacks success, empty, or failure mock scenarios, add them before exporting Mockoon.
- If a list endpoint lacks a 20-item Faker template scenario, add it before exporting Mockoon.
- If VO transformation is optional or page-dependent, preserve DTO correctness and mark VO/mapper choices for later confirmation.

## User-Facing Guidance

When the user asks how to use this skill, explain:

1. Invoke it as `$mockoon-gen` once installed.
2. Provide an OpenAPI file or API documentation.
3. Confirm the related page directory, host, Mockoon port, Whistle group name, and output paths.
4. Let the skill create/review the artifact, then run the CLI exports.
