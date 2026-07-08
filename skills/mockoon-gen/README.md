# mockoon-gen

`mockoon-gen` is an artifact-first CLI for generating frontend API code, Whistle rules, and Mockoon environments from reviewed contracts.

## Inputs

The CLI works with structured inputs only:

- `.mockoon-gen/openapi.yaml` as the source OpenAPI document
- `.mockoon-gen/api-artifact.json` as the reviewed artifact for downstream generation

Loose Markdown notes and copied API docs are handled before the CLI step. Once you are in `mockoon-gen`, the workflow is OpenAPI to artifact to generated outputs.

## Commands

```bash
pnpm --dir skills/mockoon-gen exec mockoon-gen init
pnpm --dir skills/mockoon-gen exec mockoon-gen from-openapi .mockoon-gen/openapi.yaml
pnpm --dir skills/mockoon-gen exec mockoon-gen generate --from .mockoon-gen/api-artifact.json
pnpm --dir skills/mockoon-gen exec mockoon-gen export whistle --from .mockoon-gen/api-artifact.json
pnpm --dir skills/mockoon-gen exec mockoon-gen export mockoon --from .mockoon-gen/api-artifact.json
pnpm --dir skills/mockoon-gen exec mockoon-gen validate --from .mockoon-gen/api-artifact.json --strict
```

Run `pnpm --dir skills/mockoon-gen build` first if you have not already built the CLI binary.

## Use As A Skill

This package is also a Codex skill. The skill entrypoint is `SKILL.md`; the CLI is the deterministic executor used by that skill.

Install or link `skills/mockoon-gen` into your Codex skills directory, for example:

```bash
ln -s /Users/yzin/code/skills/skills/mockoon-gen ~/.codex/skills/mockoon-gen
```

Then start a request with:

```text
$mockoon-gen 根据这个接口文档生成 OpenAPI、api-artifact、Mockoon 和 Whistle 配置
```

The expected division of labor is:

- The skill reads loose API docs, asks for host/port/group/output confirmation, and reviews `api-artifact.json`.
- The CLI runs deterministic commands such as `from-openapi`, `validate`, `generate`, and `export`.
- The generated Whistle file defaults to `.mockoon-gen/whistle.json`; Mockoon defaults to `.mockoon-gen/mockoon.json`.

## Generated Files

- `.mockoon-gen/api-artifact.json`
- `.mockoon-gen/whistle.json`
- `.mockoon-gen/mockoon.json`
- `src/api/generated/api.generated.ts`

## Confirmation Gates

Some outputs stay pending until a human confirms them:

- `validate --strict` fails when the OpenAPI artifact has not been reviewed or when an endpoint field or mapper step still needs confirmation
- Whistle exports require a confirmed `whistleGroupName` and per-route `apiHost`
- Mockoon exports require a concrete `mockoonPort`

The Whistle export writes only the reviewed demand-specific group and the import order list. It does not emit `Default`, so importing the file will not intentionally replace an existing Default group.

## Local Development

```bash
pnpm --dir skills/mockoon-gen test
CI=true pnpm --dir skills/mockoon-gen test -- tests/cli/e2e.test.ts
pnpm --dir skills/mockoon-gen typecheck
pnpm --dir skills/mockoon-gen build
```
