# yzin skills

This is yzin's personal skill library for Codex and other agents that can consume `SKILL.md`-based skills.

The repository is optimized for personal workflows rather than as a public product catalog. Skills may assume yzin's preferred tools, review habits, and local development conventions.

## Skills

- `mockoon-gen`: Turn reviewed OpenAPI into independent page-local Mockoon and Whistle artifacts.
- `api-code-gen`: Turn reviewed OpenAPI into independent TypeScript DTO, VO, mapper, and request-code artifacts.

## Install

Install the skills from GitHub with:

```bash
npx skills@latest add yzin-17/skills
```

Restart Codex after installing or updating skills so the new skill metadata is loaded.

Use it with:

```text
$mockoon-gen 根据已 review 的 OpenAPI 生成 Mockoon 和 Whistle 配置
$api-code-gen 根据已 review 的 OpenAPI 生成 TypeScript API 代码
```

## Automation

The skills share only OpenAPI input. `mock-artifact.json` and `api-code-artifact.json` are independent and generated outputs never become reverse inputs.
