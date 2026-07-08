# mockoon-gen

`mockoon-gen` is yzin's frontend API mock workflow skill. It turns API docs or OpenAPI into generated interface code and mock config files.

Use it like this:

```text
$mockoon-gen 根据这个接口文档生成接口和 mock 配置
```

## Requirements

- Codex or another agent that can use `SKILL.md` skills.
- Node.js available in the agent runtime.
- Whistle installed separately if you want to import forwarding rules.
- Mockoon installed separately if you want to import and run mock data.

The skill does not install Whistle or Mockoon for you.

## Install

Install from GitHub:

```bash
npx skills@latest add https://github.com/yzin/skills/tree/main/skills/mockoon-gen
```

Install from a local checkout:

```bash
npx skills@latest add ./skills/mockoon-gen
```

Restart Codex after installation.

## What It Does

- Converts loose API docs to reviewed OpenAPI when needed.
- Creates `.mockoon-gen/api-artifact.json` as the review artifact.
- Generates TypeScript API code with DTO/VO support.
- Exports `.mockoon-gen/whistle.json` for Whistle import.
- Exports `.mockoon-gen/mockoon.json` for Mockoon import.
- Asks you to confirm host, Whistle group name, Mockoon port, and generated code path before final export.

## Notes

- OpenAPI is treated as the backend contract source of truth.
- Whistle JSON does not emit `Default`, so it should not overwrite your existing Default group.
- Whistle and Mockoon imports are manual steps in their apps.

## Generated Files

- `.mockoon-gen/api-artifact.json`
- `.mockoon-gen/whistle.json`
- `.mockoon-gen/mockoon.json`
- `src/api/generated/api.generated.ts` by default, unless changed during review.
