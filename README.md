# yzin skills

This is yzin's personal skill library for Codex and other agents that can consume `SKILL.md`-based skills.

The repository is optimized for personal workflows rather than as a public product catalog. Skills may assume yzin's preferred tools, review habits, and local development conventions.

## Layout

- `skills/mockoon-gen/`: installable Codex skill. This directory is what `npx skills add .../skills/mockoon-gen` should install. It contains `SKILL.md`, `agents/openai.yaml`, and the bundled CLI at `bin/mockoon-gen.mjs`.
- `packages/mockoon-gen-cli/`: TypeScript source, tests, and package configuration for the deterministic `mockoon-gen` CLI.
- `.github/workflows/bundle-mockoon-gen-cli.yml`: builds the CLI bundle and opens a PR updating `skills/mockoon-gen/bin/mockoon-gen.mjs`.

## Install A Skill

Install the `mockoon-gen` skill from GitHub with:

```bash
npx skills@latest add https://github.com/yzin/skills/tree/main/skills/mockoon-gen -a codex -g
```

Or install from a local checkout while developing:

```bash
npx skills@latest add ./skills/mockoon-gen -a codex -g
```

Restart Codex after installing or updating skills so the new skill metadata is loaded.

After installation, invoke the skill with:

```text
$mockoon-gen 根据接口文档生成 OpenAPI、Mockoon 和 Whistle 配置
```

## Local Development

```bash
pnpm --dir packages/mockoon-gen-cli test
pnpm --dir packages/mockoon-gen-cli typecheck
pnpm --dir packages/mockoon-gen-cli build
pnpm --dir packages/mockoon-gen-cli bundle
```
