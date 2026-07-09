# mockoon-gen

`mockoon-gen` is an artifact-first CLI for generating frontend API code, Whistle rules, and Mockoon environments from reviewed contracts.

## Inputs

The CLI works with structured inputs only:

- `<page-dir>/mockoon-gen/openapi.yaml` as the source OpenAPI document
- `<page-dir>/mockoon-gen/api-artifact.json` as the reviewed artifact for downstream generation

Loose Markdown notes and copied API docs are handled before the CLI step. Once you are in `mockoon-gen`, the workflow is OpenAPI to artifact to generated outputs.

## Commands

```bash
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen init --page-dir src/pages/user-detail
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen from-openapi src/pages/user-detail/mockoon-gen/openapi.yaml --page-dir src/pages/user-detail
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen generate --from src/pages/user-detail/mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen export whistle --from src/pages/user-detail/mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen export whistle-cli --from src/pages/user-detail/mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen export mockoon --from src/pages/user-detail/mockoon-gen/api-artifact.json
pnpm --dir packages/mockoon-gen-cli exec mockoon-gen validate --from src/pages/user-detail/mockoon-gen/api-artifact.json --strict
```

With `--page-dir`, `init` writes `src/pages/user-detail/mockoon-gen/mockoon-gen.config.json`, and `from-openapi --page-dir` reads that page-local config.

Before running `from-openapi`, set `whistleFile` in the config from an explicit user choice:

- GUI format: `src/pages/user-detail/mockoon-gen/whistle.json`
- CLI format: `src/pages/user-detail/mockoon-gen/whistle.cjs`

`from-openapi` refuses to run while `whistleFile` is `null`.

Use `export whistle-cli` when you want Whistle CLI import instead of UI JSON import:

```bash
w2 add src/pages/user-detail/mockoon-gen/whistle.cjs
```

`export whistle` only writes `.json` files, and `export whistle-cli` only writes `.cjs` files. Set `whistleFile` to the confirmed import mode before exporting.

After `export whistle-cli`, the CLI prints the matching startup commands:

```bash
w2 add /absolute/path/to/whistle.cjs
mockoon-cli start --data /absolute/path/to/mockoon.json
```

Run `pnpm --dir packages/mockoon-gen-cli build` first if you have not already built the CLI binary.

## Skill Bundle

The installable skill lives in `skills/mockoon-gen`. Its bundled CLI is generated from this package:

```bash
pnpm --dir packages/mockoon-gen-cli bundle
```

That command writes `skills/mockoon-gen/bin/mockoon-gen.mjs`. The GitHub Action `Bundle Mockoon Gen CLI` runs tests, typechecks, bundles this file, and opens a PR when it changes.

## Generated Files

- `<page-dir>/mockoon-gen/mockoon-gen.config.json`
- `<page-dir>/mockoon-gen/api-artifact.json`
- `<page-dir>/mockoon-gen/whistle.json`
- `<page-dir>/mockoon-gen/whistle.cjs`
- `<page-dir>/mockoon-gen/mockoon.json`
- `<page-dir>/api.generated.ts` when `generateApiCode` is enabled

## Confirmation Gates

Some outputs stay pending until a human confirms them:

- `validate --strict` fails when the OpenAPI artifact has not been reviewed or when an endpoint field or mapper step still needs confirmation
- Whistle exports require a confirmed `whistleGroupName` and per-route `apiHost`
- Whistle JSON and CLI exports fail if `whistleFile` has the wrong suffix for the selected export mode
- `from-openapi` fails until `whistleFile` records the confirmed GUI or CLI mode
- Mockoon exports require a concrete `mockoonPort`
- `generate` skips writing API code when `outputs.apiCode.enabled` is `false`
- Generated Mockoon routes include success, empty, and failure scenarios
- List endpoints also include a 20-item Mockoon/Faker template scenario

The Whistle export writes only the reviewed demand-specific group and the import order list. It does not emit `Default`, so importing the file will not intentionally replace an existing Default group.

The Whistle CLI export writes a CommonJS module with `groupName`, `name`, and `rules` exports for `w2 add filepath`.

## Local Development

```bash
pnpm --dir packages/mockoon-gen-cli test
CI=true pnpm --dir packages/mockoon-gen-cli test -- tests/cli/e2e.test.ts
pnpm --dir packages/mockoon-gen-cli typecheck
pnpm --dir packages/mockoon-gen-cli build
pnpm --dir packages/mockoon-gen-cli bundle
```
