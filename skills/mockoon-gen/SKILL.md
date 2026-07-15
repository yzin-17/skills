---
name: mockoon-gen
description: "Use when turning loose API docs or reviewed OpenAPI into page-local Mockoon and Whistle mock artifacts. Use for mock-artifact review, Mockoon export, Whistle forwarding rules, list mock policies, and delayed Whistle JSON/CJS export selection; API client generation belongs to api-code-gen."
---

# Mockoon Gen

Treat reviewed OpenAPI as the contract source. Store `mock-artifact.json`, config, and generated outputs under `<page-dir>/mockoon-gen`; never use a hidden or renamed artifact directory.

1. Identify the project and related page directory. Stop and ask if the page directory is unclear.
2. Normalize loose docs into `<page-dir>/mockoon-gen/openapi.yaml`. Do not mark it reviewed without an explicit human or project review decision.
3. Before creating the artifact, explicitly ask the user whether to enable random empty-data mode. When enabled, it adds a separate `success-random-empty` scenario that may emit `null`, an empty string, an empty array, or an empty object for any field, including `required` or non-`nullable` fields, to test responses that do not follow the contract. It does not change `success-default`. Add `--random-empty-data` to `from-openapi` only when the user explicitly enables it.

4. Initialize page-local config, then create the artifact:

```bash
node <skill-dir>/bin/mockoon-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs from-openapi <openapi-file> --origin <generated|imported|manual> --page-dir <page-dir> --cwd <project-dir> [--random-empty-data]
```

5. Before rendering or exporting, the model must inspect every string field in each successful JSON response schema and make a semantic Faker decision. Use this order:

   - Treat an explicit OpenAPI `format` as the contract constraint.
   - Otherwise infer from the field name, full field path, `title`, `description`, parent object, neighboring fields, and request/response context.
   - When the meaning is clear, add an entry to that endpoint's `mock.semanticMappings` in `mock-artifact.json`. Use a Faker.js `module.method` path without Mockoon braces, for example:

```json
{
  "path": "items[].productName",
  "faker": "commerce.productName"
}
```

   - Do not invent a mapping when the meaning is ambiguous. Leaving the field unmapped is valid and causes the renderer to use `string.sample`.
   - Keep the mapping decision separate from `bodyTemplate`; never hand-edit generated templates to encode the decision.

   After adding or changing mappings, materialize them into generated success scenarios:

```bash
node <skill-dir>/bin/mockoon-gen.mjs render-templates --from <page-dir>/mockoon-gen/mock-artifact.json --cwd <project-dir>
```

The renderer applies the precedence `semanticMappings > OpenAPI format > string.sample` and keeps default, list, empty, and nested templates consistent. Review the artifact afterward: OpenAPI status/hash, mock scenarios, each `semanticMappings` entry, Mockoon port, Whistle group, and each semantic `apiHost`. Keep unresolved semantic questions as open review items.

6. Validate the target before output:

```bash
node <skill-dir>/bin/mockoon-gen.mjs validate --from <page-dir>/mockoon-gen/mock-artifact.json --target <all|mockoon|whistle> --cwd <project-dir>
```

## HARD-GATE: Whistle format confirmation

Before exporting Whistle, ask the user to choose exactly one format: `json` or `cjs`. Do not infer the format from filenames, examples, prior docs, or defaults.

If the user has not explicitly selected `json` or `cjs` in the current task, stop before Whistle export. This gate does not prevent Mockoon export.

7. Export only after readiness succeeds and the Whistle format gate is satisfied. Choose Whistle format at export time, not in config or artifact:

```bash
node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from <artifact> --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle --format <json|cjs> --from <artifact> --cwd <project-dir>
```

Stop before Mockoon export when port, scenario review, or list policy is unresolved. Stop before Whistle export when group name or host is unresolved. Do not bypass hash, review, path, or no-clobber gates with `--force`.

Read [Whistle patterns](references/whistle-patterns.md) only when reviewing dynamic routes or diagnosing a matching issue.
