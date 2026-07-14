---
name: mockoon-gen
description: "Use when turning loose API docs or reviewed OpenAPI into page-local Mockoon and Whistle mock artifacts. Use for mock-artifact review, Mockoon export, Whistle forwarding rules, list mock policies, and delayed Whistle JSON/CJS export selection; API client generation belongs to api-code-gen."
---

# Mockoon Gen

Treat reviewed OpenAPI as the contract source. Store `mock-artifact.json`, config, and generated outputs under `<page-dir>/mockoon-gen`; never use a hidden or renamed artifact directory.

1. Identify the project and related page directory. Stop and ask if the page directory is unclear.
2. Normalize loose docs into `<page-dir>/mockoon-gen/openapi.yaml`. Do not mark it reviewed without an explicit human or project review decision.
3. Initialize page-local config, then create the artifact:

```bash
node <skill-dir>/bin/mockoon-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs from-openapi <openapi-file> --origin <generated|imported|manual> --page-dir <page-dir> --cwd <project-dir>
```

4. Review the artifact: OpenAPI status/hash, mock scenarios, Mockoon port, Whistle group, and each semantic `apiHost`. Keep unresolved semantic questions as open review items.
5. Validate the target before output:

```bash
node <skill-dir>/bin/mockoon-gen.mjs validate --from <page-dir>/mockoon-gen/mock-artifact.json --target <all|mockoon|whistle> --cwd <project-dir>
```

6. Export only after readiness succeeds. Choose Whistle format at export time, not in config or artifact:

```bash
node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from <artifact> --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle --format <json|cjs> --from <artifact> --cwd <project-dir>
```

Stop before Mockoon export when port, scenario review, or list policy is unresolved. Stop before Whistle export when group name or host is unresolved. Do not bypass hash, review, path, or no-clobber gates with `--force`.

Read [Whistle patterns](references/whistle-patterns.md) only when reviewing dynamic routes or diagnosing a matching issue.
