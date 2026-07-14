---
name: api-code-gen
description: "Use when generating reviewed TypeScript DTOs, VOs, mappers, and request functions from OpenAPI. Use for API-code artifact review, single-file or split output plans, and safe code generation; do not use for Mockoon/Whistle exports or reverse synchronization from TypeScript."
---

# API Code Gen

Accept only reviewed OpenAPI. Keep `api-code-artifact.json` and config under `<page-dir>/api-code-gen`; never read or modify mock artifacts.

1. Identify the page directory and inspect adjacent API code when a split output is requested. Stop and ask if the project convention is unclear.
2. Initialize config and create an artifact from reviewed OpenAPI:

```bash
node <skill-dir>/bin/api-code-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
node <skill-dir>/bin/api-code-gen.mjs from-openapi <openapi-file> --origin <imported|manual> --reviewed --page-dir <page-dir> --cwd <project-dir>
```

3. Review DTO/VO fields, mapper steps, and output plan. For split output, assign every endpoint exactly once and confirm files plus optional index.
4. Validate before writing:

```bash
node <skill-dir>/bin/api-code-gen.mjs validate --from <page-dir>/api-code-gen/api-code-artifact.json --cwd <project-dir>
node <skill-dir>/bin/api-code-gen.mjs generate --from <artifact> --cwd <project-dir>
```

Stop when review items remain open, the output plan is unconfirmed, the OpenAPI hash changed, unsupported input is detected, or the path escapes the project. Generated files are derived outputs; do not reverse-sync edits.

Read [API output layout](references/api-output-layout.md) when selecting or reviewing a split plan.
