# mockoon-gen

`mockoon-gen` is an artifact-first CLI for generating frontend API code, Whistle rules, and Mockoon environments from reviewed contracts.

## Inputs

The CLI works with structured inputs only:

- `<page-dir>/.mockoon-gen/openapi.yaml` as the source OpenAPI document
- `<page-dir>/.mockoon-gen/api-artifact.json` as the reviewed artifact for downstream generation

Loose Markdown notes and copied API docs are handled before the CLI step. Once you are in `mockoon-gen`, the workflow is OpenAPI to artifact to generated outputs.

## Commands

```bash
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen init --page-dir src/pages/user-detail
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen from-openapi src/pages/user-detail/.mockoon-gen/openapi.yaml --page-dir src/pages/user-detail
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen generate --from src/pages/user-detail/.mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen export whistle --from src/pages/user-detail/.mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen export mockoon --from src/pages/user-detail/.mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen validate --from src/pages/user-detail/.mockoon-gen/api-artifact.json --strict
```

Run `pnpm --dir packages/mockoon-gen-cli build` first if you have not already built the CLI binary.

## Skill Bundle

The installable skill lives in `skills/mockoon-gen`. Its bundled CLI is generated from this package:

```bash
pnpm --dir packages/mockoon-gen-cli bundle
```

That command writes `skills/mockoon-gen/bin/mockoon-gen.mjs`. The GitHub Action `Bundle Mockoon Gen CLI` runs tests, typechecks, bundles this file, and opens a PR when it changes.

## Generated Files

- `<page-dir>/.mockoon-gen/api-artifact.json`
- `<page-dir>/.mockoon-gen/whistle.json`
- `<page-dir>/.mockoon-gen/mockoon.json`
- `<page-dir>/api.generated.ts`

## Confirmation Gates

Some outputs stay pending until a human confirms them:

- `validate --strict` fails when the OpenAPI artifact has not been reviewed or when an endpoint field or mapper step still needs confirmation
- Whistle exports require a confirmed `whistleGroupName` and per-route `apiHost`
- Mockoon exports require a concrete `mockoonPort`

The Whistle export writes only the reviewed demand-specific group and the import order list. It does not emit `Default`, so importing the file will not intentionally replace an existing Default group.

## Local Development

```bash
pnpm --dir packages/mockoon-gen-cli test
CI=true pnpm --dir packages/mockoon-gen-cli test -- tests/cli/e2e.test.ts
pnpm --dir packages/mockoon-gen-cli typecheck
pnpm --dir packages/mockoon-gen-cli build
pnpm --dir packages/mockoon-gen-cli bundle
```
