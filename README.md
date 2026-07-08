# yzin skills

This is yzin's personal skill library for Codex and other agents that can consume `SKILL.md`-based skills.

The repository is optimized for personal workflows rather than as a public product catalog. Skills may assume yzin's preferred tools, review habits, and local development conventions.

## Skills

- `mockoon-gen`: Generate frontend API and mock artifacts from API docs or OpenAPI. It can create/review OpenAPI, produce `.mockoon-gen/api-artifact.json`, generate TypeScript API code, and export Whistle/Mockoon config files.

## Install

Install the `mockoon-gen` skill from GitHub with:

```bash
npx skills@latest add https://github.com/yzin/skills/tree/main/skills/mockoon-gen
```

Or install from a local checkout while developing:

```bash
npx skills@latest add ./skills/mockoon-gen
```

Restart Codex after installing or updating skills so the new skill metadata is loaded.

Use it with:

```text
$mockoon-gen 根据这个接口文档生成接口和 mock 配置
```
