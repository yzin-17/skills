# skills

This repository keeps skill distribution files separate from implementation source code.

## Layout

- `skills/mockoon-gen/`: installable Codex skill. This directory is what `npx skills add .../skills/mockoon-gen` should install. It contains `SKILL.md`, `agents/openai.yaml`, and the bundled CLI at `bin/mockoon-gen.mjs`.
- `packages/mockoon-gen-cli/`: TypeScript source, tests, and package configuration for the deterministic `mockoon-gen` CLI.
- `.github/workflows/bundle-mockoon-gen-cli.yml`: builds the CLI bundle and opens a PR updating `skills/mockoon-gen/bin/mockoon-gen.mjs`.

## Local Development

```bash
pnpm --dir packages/mockoon-gen-cli test
pnpm --dir packages/mockoon-gen-cli typecheck
pnpm --dir packages/mockoon-gen-cli build
pnpm --dir packages/mockoon-gen-cli bundle
```
