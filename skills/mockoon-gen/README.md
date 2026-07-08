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

## Generated Files

- `.mockoon-gen/api-artifact.json`
- `.mockoon-gen/whistle.txt`
- `.mockoon-gen/mockoon.json`
- `src/api/generated/api.generated.ts`

## Confirmation Gates

Some outputs stay pending until a human confirms them:

- `validate --strict` fails when the OpenAPI artifact has not been reviewed or when an endpoint field or mapper step still needs confirmation
- Whistle exports require a confirmed `apiHost`
- Mockoon exports require a concrete `mockoonPort`

Those gates are deliberate; they keep the generated files aligned with the reviewed contract and the target runtime.

## Local Development

```bash
pnpm --dir skills/mockoon-gen test
CI=true pnpm --dir skills/mockoon-gen test -- tests/cli/e2e.test.ts
pnpm --dir skills/mockoon-gen typecheck
pnpm --dir skills/mockoon-gen build
```
