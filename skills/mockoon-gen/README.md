# mockoon-gen

`mockoon-gen` is yzin's frontend API mock workflow skill. It turns API docs or OpenAPI into generated interface code and mock config files.

Use it like this:

```text
$mockoon-gen 根据这个接口文档生成接口和 mock 配置
```

## Requirements

- Codex or another agent that can use `SKILL.md` skills.
- Node.cjs available in the agent runtime.
- Whistle installed separately if you want to import forwarding rules.
- Mockoon installed separately if you want to import and run mock data.

The skill does not install Whistle or Mockoon for you.

## Install

Install from GitHub:

```bash
npx skills@latest add yzin-17/skills --skill mockoon-gen
```

Restart Codex after installation.

## What It Does

- Converts loose API docs to reviewed OpenAPI when needed.
- Creates `<page-dir>/mockoon-gen/mockoon-gen.config.json` for page-local generation settings.
- Creates `<page-dir>/mockoon-gen/api-artifact.json` as the review artifact.
- Generates TypeScript API code with DTO/VO support when the input is not an existing API/interface code file.
- Exports `<page-dir>/mockoon-gen/whistle.json` for Whistle import.
- Exports `<page-dir>/mockoon-gen/whistle.cjs` for Whistle CLI import with `w2 add filepath`.
- Exports `<page-dir>/mockoon-gen/mockoon.json` for Mockoon import.
- Creates success, empty, and failure mock scenarios for every endpoint.
- Creates a 20-item Faker template scenario for list endpoints.
- Asks you to confirm the page directory, host, Whistle group name, Whistle import mode (`GUI .json` or `CLI .cjs`), Mockoon port, and generated code path before generation or export.

## Notes

- OpenAPI is treated as the backend contract source of truth.
- If the input is an existing concrete API/interface code file, the skill disables API code generation and exports only mock config files.
- Whistle JSON does not emit `Default`, so it should not overwrite your existing Default group.
- Whistle CLI import uses `w2 add <page-dir>/mockoon-gen/whistle.cjs`.
- `export whistle` writes `.json` only; `export whistle-cli` writes `.cjs` only.
- If you choose CLI format, the skill prints `w2 add <page-dir>/mockoon-gen/whistle.cjs` and `mockoon-cli start --data <page-dir>/mockoon-gen/mockoon.json` after exporting.
- Whistle and Mockoon imports are manual steps in their apps.

## Generated Files

- `<page-dir>/mockoon-gen/mockoon-gen.config.json`
- `<page-dir>/mockoon-gen/api-artifact.json`
- `<page-dir>/mockoon-gen/whistle.json`
- `<page-dir>/mockoon-gen/whistle.cjs`
- `<page-dir>/mockoon-gen/mockoon.json`
- `<page-dir>/api.generated.ts` only when API code generation is enabled.
