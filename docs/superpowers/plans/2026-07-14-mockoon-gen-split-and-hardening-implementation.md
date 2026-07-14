# Mockoon Gen Split and Hardening Implementation Plan

> **Execution rule:** Implement one task at a time. Start each behavior change with a failing test, keep every task buildable, and commit only the files listed for that task plus unavoidable lockfile changes.

**Goal:** Split TypeScript API code generation into an independent `api-code-gen` skill/CLI, reduce `mockoon-gen` to Mockoon and Whistle generation, and make artifact review, output safety, policies, bundles, and CLI gates deterministic.

**Architecture:** A new private `@yzin/openapi-reader` workspace package owns only OpenAPI parsing, minimal types, normalized source references, and content hashes. `mockoon-gen` and `api-code-gen` each own their own config, artifact schema, preflight, safe writes, CLI, skill bundle, and version. No artifact or review model is shared between them.

**Tech stack:** Node.js, TypeScript, pnpm workspaces, Commander, Zod, YAML, Vitest, esbuild.

**Source spec:** `docs/superpowers/specs/2026-07-14-mockoon-gen-split-and-hardening-design.md`

---

## Scope Guardrails

- Do not implement automatic migration from `api-artifact.json` schema `0.2.0`.
- Do not implement artifact refresh or merge.
- Do not restore `sync-api-code` in another form.
- Do not add a shared artifact/review package; only OpenAPI parsing is shared.
- Do not add full `$ref`, request body, or query code generation. Detect unsupported input and stop with diagnostics.
- Preserve the existing supported DTO/VO/mapper/request-function output before enhancing its structure.
- Keep `splitApiOutput`; make it operational through an explicit, reviewed output plan.
- Keep generated files derived and one-way.
- Do not silently overwrite config, artifact, or generated output.
- Do not modify the installed copy under `~/.agents`; update repository skills and bundles only.

## Baseline

Before Task 1:

```bash
git status --short
pnpm --dir packages/mockoon-gen-cli test
pnpm --dir packages/mockoon-gen-cli typecheck
node skills/mockoon-gen/bin/mockoon-gen.mjs --help
```

Expected baseline:

- Worktree is clean except intentional plan/spec work.
- Existing 64 tests pass.
- Existing typecheck passes.
- Existing help still contains `generate`, `sync-api-code`, `guard`, and separate Whistle CLI export; later tasks deliberately remove them.

## Final Repository Shape

```text
package.json
pnpm-workspace.yaml
pnpm-lock.yaml

packages/
  openapi-reader/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      hash.ts
      index.ts
      load-openapi.ts
      types.ts
    tests/
      fixtures/
        openapi.user.yaml
      load-openapi.test.ts

  mockoon-gen-cli/
    package.json
    scripts/bundle-cli.mjs
    src/
      artifact/
        from-openapi.ts
        read-artifact.ts
        schema.ts
        types.ts
      config/
        load-config.ts
        types.ts
      generators/
        mockoon.ts
        whistle.ts
      openapi/
        support.ts
      preflight/
        diagnostics.ts
        mockoon.ts
        run-preflight.ts
        whistle.ts
      utils/
        fs.ts
        json-path.ts
        paths.ts
        safe-write.ts
      cli.ts
      index.ts
    tests/

  api-code-gen-cli/
    package.json
    scripts/bundle-cli.mjs
    src/
      artifact/
        from-openapi.ts
        read-artifact.ts
        schema.ts
        types.ts
      config/
        load-config.ts
        types.ts
      generators/
        api-code.ts
        output-files.ts
      openapi/
        support.ts
      preflight/
        diagnostics.ts
        run-preflight.ts
      utils/
        fs.ts
        paths.ts
        safe-write.ts
      cli.ts
      index.ts
    tests/

skills/
  mockoon-gen/
    SKILL.md
    agents/openai.yaml
    bin/mockoon-gen.mjs
    references/whistle-patterns.md

  api-code-gen/
    SKILL.md
    agents/openai.yaml
    bin/api-code-gen.mjs
    references/api-output-layout.md
```

`skills/*` should not contain user-facing README files. Consolidate install and catalog guidance in the repository root `README.md`.

## Task Dependency Order

| Phase | Tasks | Completion condition |
| --- | --- | --- |
| Workspace | 1 | Root workspace installs and old package still passes |
| Shared input | 2 | Existing mock CLI consumes `@yzin/openapi-reader` without behavior change |
| API split | 3–7 | `api-code-gen` independently creates, validates, and generates single/split output |
| Mock replacement | 8–13 | `mockoon-gen` uses schema 0.3.0 and no longer contains API/guard/sync code |
| Productization | 14–17 | Skills, bundles, CI, e2e, and forward tests pass |

---

## Task 1: Establish a Root pnpm Workspace

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-lock.yaml`
- Modify: `packages/mockoon-gen-cli/package.json`
- Delete: `packages/mockoon-gen-cli/pnpm-workspace.yaml`
- Delete: `packages/mockoon-gen-cli/pnpm-lock.yaml`

- [x] **Step 1: Record the baseline before changing package management**

Run the commands in the Baseline section and retain the terminal output for comparison.

- [x] **Step 2: Add the root workspace manifest**

Create a private root `package.json` with `packageManager: pnpm@11.7.0` and scripts:

```json
{
  "private": true,
  "packageManager": "pnpm@11.7.0",
  "scripts": {
    "build": "pnpm -r --if-present build",
    "bundle": "pnpm -r --if-present bundle",
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck"
  }
}
```

Create root `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"

allowBuilds:
  esbuild: true
```

- [x] **Step 3: Remove package-local workspace ownership**

Delete the package-local workspace file and lockfile, and remove the package-local `packageManager` field now owned by the root. Keep the package name `mockoon-gen` so existing filter commands remain stable.

- [x] **Step 4: Generate the root lockfile**

```bash
pnpm install
```

Expected: one root lockfile; workspace dependency graph contains the existing mock package.

- [ ] **Step 5: Verify no behavior changed**

```bash
pnpm --filter mockoon-gen test
pnpm --filter mockoon-gen typecheck
pnpm --filter mockoon-gen build
```

Expected: all existing tests pass.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml packages/mockoon-gen-cli/package.json packages/mockoon-gen-cli/pnpm-workspace.yaml packages/mockoon-gen-cli/pnpm-lock.yaml
git commit -m "build: establish generator workspace"
```

---

## Task 2: Extract the Minimal OpenAPI Reader

**Files:**

- Create: `packages/openapi-reader/package.json`
- Create: `packages/openapi-reader/tsconfig.json`
- Create: `packages/openapi-reader/vitest.config.ts`
- Create: `packages/openapi-reader/src/hash.ts`
- Create: `packages/openapi-reader/src/index.ts`
- Create: `packages/openapi-reader/src/load-openapi.ts`
- Create: `packages/openapi-reader/src/types.ts`
- Create: `packages/openapi-reader/tests/fixtures/openapi.user.yaml`
- Create: `packages/openapi-reader/tests/load-openapi.test.ts`
- Modify: `packages/mockoon-gen-cli/package.json`
- Modify: `packages/mockoon-gen-cli/src/artifact/from-openapi.ts`
- Modify: `packages/mockoon-gen-cli/src/cli.ts`
- Delete: `packages/mockoon-gen-cli/src/openapi/load-openapi.ts`
- Delete: `packages/mockoon-gen-cli/src/openapi/types.ts`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Create the test harness and write reader tests first**

Create the package manifest, TypeScript/Vitest configuration, fixture, and tests, but leave `src` unimplemented.

Cover:

- YAML and JSON loading.
- SHA-256 stability over raw file bytes.
- Missing `openapi`, missing `paths`, non-object path item.
- Preservation of operationId, parameters, requestBody, responses, `$ref`, and composition keywords as typed input.
- Normalized absolute source file reference.

Run:

```bash
pnpm --filter @yzin/openapi-reader test
```

Expected: the workspace discovers the package and the test fails because the reader exports do not exist yet.

- [x] **Step 2: Implement only shared reader responsibilities**

Package name: `@yzin/openapi-reader`, version `0.1.0`, private, compiled to `dist`.

Export:

- `loadOpenApi(file)`
- `sha256(input)`
- `LoadedOpenApi`
- minimal OpenAPI types

Do not export review, artifact, mock, Whistle, or API code types.

- [x] **Step 3: Add the workspace dependency to mockoon-gen**

```json
"@yzin/openapi-reader": "workspace:*"
```

Update imports. Do not change current artifact behavior in this task.

- [x] **Step 4: Remove only the duplicated OpenAPI reader files**

Keep `generators/hash.ts` temporarily if old API sync/generation still imports it. It is deleted only after API extraction.

- [ ] **Step 5: Verify both packages**

```bash
pnpm install
pnpm --filter @yzin/openapi-reader test
pnpm --filter @yzin/openapi-reader typecheck
pnpm --filter @yzin/openapi-reader build
pnpm --filter mockoon-gen test
pnpm --filter mockoon-gen typecheck
```

- [x] **Step 6: Commit**

```bash
git add packages/openapi-reader packages/mockoon-gen-cli pnpm-lock.yaml
git commit -m "refactor: extract shared OpenAPI reader"
```

---

## Task 3: Scaffold the API Code Gen Package and Skill

**Files:**

- Create: `packages/api-code-gen-cli/package.json`
- Create: `packages/api-code-gen-cli/tsconfig.json`
- Create: `packages/api-code-gen-cli/vitest.config.ts`
- Create: `packages/api-code-gen-cli/scripts/bundle-cli.mjs`
- Create: `packages/api-code-gen-cli/src/index.ts`
- Create: `packages/api-code-gen-cli/src/cli.ts`
- Create: `packages/api-code-gen-cli/tests/cli/cli.test.ts`
- Create through initializer: `skills/api-code-gen/SKILL.md`
- Create through initializer: `skills/api-code-gen/agents/openai.yaml`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Initialize the skill with the official initializer**

Run from the repository root:

```bash
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/init_skill.py api-code-gen \
  --path skills \
  --resources references \
  --interface display_name="API Code Gen" \
  --interface short_description="Generate reviewed TypeScript API code" \
  --interface default_prompt='Use $api-code-gen to create reviewed DTO, VO, mapper, and TypeScript API code from OpenAPI.'
```

Do not create assets or skill-owned scripts.

- [x] **Step 2: Replace initializer placeholders immediately**

Write a minimal, valid, placeholder-free `SKILL.md` that says this first-stage skill accepts reviewed OpenAPI, owns an independent artifact, and does not provide mock exports or reverse sync. Task 14 will replace this scaffold with the complete workflow. Run `quick_validate.py` before committing Task 3.

- [x] **Step 3: Create the package test harness and write CLI registration tests**

Create the package manifest and test configuration before running the test, but leave command registration unimplemented so the first run fails for the intended reason.

Assert command names:

- `init`
- `from-openapi`
- `validate`
- `generate`

Assert absent:

- `sync-api-code`
- mock or Whistle export commands

- [x] **Step 4: Create the package skeleton**

Package name `api-code-gen`, version `0.1.0`, dependency on `@yzin/openapi-reader`, Commander, Zod, YAML only if package-local serialization still requires it, and matching build/test/typecheck/bundle scripts.

The bundle script writes `skills/api-code-gen/bin/api-code-gen.mjs`.

- [x] **Step 5: Implement command registration without business behavior**

Each command may throw an explicit `Not implemented` error after parsing. Keep the CLI executable and symlink-safe using the existing `shouldRunCli` pattern.

- [x] **Step 6: Verify scaffold**

```bash
pnpm install
pnpm --filter api-code-gen test -- tests/cli/cli.test.ts
pnpm --filter api-code-gen typecheck
pnpm --filter api-code-gen build
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/api-code-gen
```

- [x] **Step 7: Commit**

```bash
git add packages/api-code-gen-cli skills/api-code-gen pnpm-lock.yaml
git commit -m "feat: scaffold api-code-gen skill and cli"
```

---

## Task 4: Define API Code Artifact 0.1.0

**Files:**

- Create: `packages/api-code-gen-cli/src/artifact/types.ts`
- Create: `packages/api-code-gen-cli/src/artifact/schema.ts`
- Create: `packages/api-code-gen-cli/src/artifact/read-artifact.ts`
- Create: `packages/api-code-gen-cli/src/artifact/from-openapi.ts`
- Create: `packages/api-code-gen-cli/src/config/types.ts`
- Create: `packages/api-code-gen-cli/src/config/load-config.ts`
- Create: `packages/api-code-gen-cli/tests/artifact/schema.test.ts`
- Create: `packages/api-code-gen-cli/tests/artifact/from-openapi.test.ts`
- Create: `packages/api-code-gen-cli/tests/config/load-config.test.ts`
- Copy fixture then adapt: `packages/api-code-gen-cli/tests/fixtures/openapi.user.yaml`

- [x] **Step 1: Write schema tests first**

Assert:

- schemaVersion is exactly `0.1.0`.
- artifact contains OpenAPI ref, global reviewItems, endpoints, and discriminated output plan.
- artifact rejects mock, Mockoon, Whistle, endpoint-local reviewItems, and `lastGeneratedSha256`.
- single output uses `splitApiOutput: false` and `file`.
- split output uses `splitApiOutput: true`, `directory`, files, and optional indexFile.
- split plan rejects duplicate files, empty endpoint groups, and absolute member paths at schema/preflight boundary as appropriate.

- [x] **Step 2: Define the review model locally**

Do not import review types from mockoon-gen. Use one global reviewItems array. Preserve VO fields and mapper steps required by the current generator, but turn low-confidence items into global review items instead of nested reviewStatus values.

- [x] **Step 3: Implement config parsing**

Config defaults:

```json
{
  "apiOutput": null,
  "splitApiOutput": false,
  "transformResponse": true
}
```

Reject unknown fields and type mismatches rather than merging unchecked JSON.

- [x] **Step 4: Implement OpenAPI-to-API-artifact draft generation**

Migrate the existing DTO, VO, mapper naming and source-path behavior. Do not copy mock scenarios or Whistle fields.

`api-code-gen from-openapi` requires:

- `--origin imported|manual`
- `--reviewed`
- `--page-dir`

Artifact OpenAPI status is confirmed only because the reviewed flag is explicit.
Initialize the output from config, but keep it unconfirmed. Copy a non-null `apiOutput` to single-file `file` or split `directory`; otherwise use `null`. A split draft starts with `files: []` and `indexFile: null`, never with a fabricated grouping. Preflight rejects an incomplete plan, and the skill must supply and confirm the concrete plan before generation.

- [x] **Step 5: Run focused tests**

```bash
pnpm --filter api-code-gen test -- tests/artifact tests/config
pnpm --filter api-code-gen typecheck
```

- [x] **Step 6: Commit**

```bash
git add packages/api-code-gen-cli/src/artifact packages/api-code-gen-cli/src/config packages/api-code-gen-cli/tests
git commit -m "feat: define api-code artifact"
```

---

## Task 5: Migrate Single-File API Code Generation

**Files:**

- Create: `packages/api-code-gen-cli/src/generators/api-code.ts`
- Create: `packages/api-code-gen-cli/tests/generators/api-code.test.ts`
- Reference source: `packages/mockoon-gen-cli/src/generators/api-code.ts`
- Reference tests: `packages/mockoon-gen-cli/tests/generators/api-code.test.ts`

- [x] **Step 1: Copy behavior tests before implementation**

Adapt the current tests to the new API artifact type. Preserve coverage for:

- DTO, VO, mapper, and request function.
- transformResponse true and false.
- nested DTO shape and quoted property names.
- path params, reserved names, and collisions.
- mapper step ordering.
- explicit failure for unsupported mapper operations.
- edited artifact fields as generator inputs.

Run:

```bash
pnpm --filter api-code-gen test -- tests/generators/api-code.test.ts
```

Expected: fail because the generator does not exist.

- [x] **Step 2: Move, do not redesign, the generator**

Extract internal `generateEndpoint` behavior so a later split-output task can group endpoints without duplicating generation logic.

Each generated module starts with exactly one request declaration, regardless of how many endpoints it contains.

- [x] **Step 3: Remove reverse-sync concepts**

Do not emit generated hashes into artifact. Do not add code headers that imply reverse synchronization. Do not copy `api-code-sync.ts`.

- [x] **Step 4: Verify focused and package tests**

```bash
pnpm --filter api-code-gen test -- tests/generators/api-code.test.ts
pnpm --filter api-code-gen typecheck
```

- [x] **Step 5: Commit**

```bash
git add packages/api-code-gen-cli/src/generators packages/api-code-gen-cli/tests/generators
git commit -m "feat: migrate api code generation"
```

---

## Task 6: Implement Split API Output Plans

**Files:**

- Create: `packages/api-code-gen-cli/src/generators/output-files.ts`
- Create: `packages/api-code-gen-cli/tests/generators/output-files.test.ts`
- Modify: `packages/api-code-gen-cli/src/artifact/schema.ts`
- Modify: `packages/api-code-gen-cli/src/artifact/types.ts`
- Modify: `packages/api-code-gen-cli/tests/artifact/schema.test.ts`

- [x] **Step 1: Write failing plan and grouping tests**

Cover:

- every endpoint assigned exactly once.
- unknown endpoint rejected.
- duplicate endpoint rejected across files.
- duplicate file path rejected.
- empty file group rejected.
- an unreviewed split draft may have `files: []`, but a confirmed split plan may not.
- files grouped in declared order.
- one request declaration per generated file.
- indexFile null produces no index.
- indexFile produces exports for every declared module exactly once.
- relative nested member paths accepted; absolute and `..` member paths rejected.

- [x] **Step 2: Model output as a discriminated union**

Use `splitApiOutput` as discriminator. Keep `transformResponse` and `reviewStatus` in both variants.

- [x] **Step 3: Implement deterministic file generation**

Return an in-memory `Map<projectRelativePath, contents>` or equivalent. Do not write files in the generator. Safe writes belong to Task 7.

- [x] **Step 4: Verify**

```bash
pnpm --filter api-code-gen test -- tests/artifact/schema.test.ts tests/generators/output-files.test.ts
pnpm --filter api-code-gen typecheck
```

- [x] **Step 5: Commit**

```bash
git add packages/api-code-gen-cli/src/artifact packages/api-code-gen-cli/src/generators/output-files.ts packages/api-code-gen-cli/tests
git commit -m "feat: support reviewed api output plans"
```

---

## Task 7: Add API Preflight, Safe Writes, and Working CLI

**Files:**

- Create: `packages/api-code-gen-cli/src/openapi/support.ts`
- Create: `packages/api-code-gen-cli/src/preflight/diagnostics.ts`
- Create: `packages/api-code-gen-cli/src/preflight/run-preflight.ts`
- Create: `packages/api-code-gen-cli/src/utils/fs.ts`
- Create: `packages/api-code-gen-cli/src/utils/paths.ts`
- Create: `packages/api-code-gen-cli/src/utils/safe-write.ts`
- Modify: `packages/api-code-gen-cli/src/cli.ts`
- Create: `packages/api-code-gen-cli/tests/preflight/run-preflight.test.ts`
- Create: `packages/api-code-gen-cli/tests/utils/paths.test.ts`
- Create: `packages/api-code-gen-cli/tests/utils/safe-write.test.ts`
- Expand: `packages/api-code-gen-cli/tests/cli/cli.test.ts`
- Create: `packages/api-code-gen-cli/tests/cli/e2e.test.ts`

- [x] **Step 1: Write failing preflight tests**

Stable diagnostic codes must include at least:

- `ARTIFACT_SCHEMA_UNSUPPORTED`
- `OPENAPI_UNREVIEWED`
- `OPENAPI_HASH_MISMATCH`
- `REVIEW_ITEM_OPEN`
- `OUTPUT_PLAN_UNCONFIRMED`
- `OUTPUT_PLAN_INCOMPLETE`
- `OUTPUT_PATH_OUTSIDE_PROJECT`
- `TYPESCRIPT_IDENTIFIER_INVALID`
- `MAPPER_OPERATION_UNSUPPORTED`
- `OPENAPI_FEATURE_UNSUPPORTED`

Open fatal/needsReview blocks; warning does not.

- [x] **Step 2: Detect unsupported API input**

For the current generator, return fatal diagnostics for unhandled `$ref`/composition, request body, and query/header inputs that generated code would otherwise ignore. Select the first supported JSON 2xx response by numeric status order and warn if multiple different success schemas exist.

- [x] **Step 3: Implement canonical path checks**

Test:

- project-relative valid output.
- absolute path outside cwd.
- `..` escape.
- existing symlink parent escaping cwd.
- split directory and member containment.
- artifact/config fixed under `<page-dir>/api-code-gen`.

- [x] **Step 4: Implement no-clobber and atomic multi-file writes**

Behavior:

- absent output: write.
- identical output: no-op.
- different output: fail unless force.
- force never bypasses preflight or path checks.
- preflight all files before writing any split output.
- write via temporary sibling files and rename after every target is ready.
- if a commit-stage rename fails, restore prior files and remove all temporary files before returning non-zero.

- [x] **Step 5: Wire all four CLI commands**

Implement:

- `init --page-dir <page-dir> [--force] --cwd <project-dir>`: idempotent create, explicit force reset.
- `from-openapi <file> --origin <imported|manual> --reviewed --page-dir <page-dir> [--force] --cwd <project-dir>`: hash-aware create/replacement.
- `validate --from <api-code-artifact> --cwd <project-dir>`: JSON diagnostics.
- `generate --from <api-code-artifact> [--force] --cwd <project-dir>`: preflighted single or split writes.

- [x] **Step 6: Verify the complete API package**

```bash
pnpm --filter api-code-gen test
pnpm --filter api-code-gen typecheck
pnpm --filter api-code-gen build
node packages/api-code-gen-cli/dist/src/cli.js --help
```

- [x] **Step 7: Commit**

```bash
git add packages/api-code-gen-cli
git commit -m "feat: enforce api code generation gates"
```

---

## Task 8: Introduce Mock Artifact 0.3.0 Alongside the Legacy Model

This task adds the new model without switching the existing CLI yet, keeping the package green while API functionality has already moved.

**Files:**

- Create: `packages/mockoon-gen-cli/src/mock-artifact/types.ts`
- Create: `packages/mockoon-gen-cli/src/mock-artifact/schema.ts`
- Create: `packages/mockoon-gen-cli/src/mock-artifact/read-artifact.ts`
- Create: `packages/mockoon-gen-cli/src/mock-artifact/from-openapi.ts`
- Create: `packages/mockoon-gen-cli/src/config-v2/types.ts`
- Create: `packages/mockoon-gen-cli/src/config-v2/load-config.ts`
- Create: `packages/mockoon-gen-cli/tests/mock-artifact/schema.test.ts`
- Create: `packages/mockoon-gen-cli/tests/mock-artifact/from-openapi.test.ts`
- Create: `packages/mockoon-gen-cli/tests/config-v2/load-config.test.ts`

- [x] **Step 1: Write failing schema tests**

Assert schema `0.3.0`:

- contains OpenAPI ref, global reviewItems, policies, mock endpoints, Whistle semantic values, and Mockoon values.
- rejects DTO, VO, mapper, apiCode, endpoint-local reviewItems, `sourcePattern`, `targetPath`, targetPort, route method, and route operationId.
- uses `null`, not `pending-confirmation`.
- validates review resolution metadata.
- validates list itemCount 1–1000.

- [x] **Step 2: Implement the new model in parallel**

Do not import types from `src/artifact`. Do not modify the old CLI yet.

For target applicability of mock review items:

- global/openapi/endpoint/mock scopes apply to both mock targets.
- output items under `outputs.mockoon` apply only to Mockoon.
- output items under `outputs.whistle` apply only to Whistle.
- ambiguous output paths are treated as applying to both.

- [x] **Step 3: Implement the reduced config**

Only:

- mockoonPort
- whistleGroupName
- mockPolicy.listScenario.enabled
- mockPolicy.listScenario.itemCount

Use strict runtime parsing. Missing config returns defaults; malformed config fails.
Reject unknown legacy or misspelled fields rather than retaining unused configuration.

- [x] **Step 4: Generate a draft mock artifact**

Requirements:

- `--origin` value becomes provenance.
- status defaults unreviewed; explicit reviewed flag sets confirmed.
- policy/config values are frozen into artifact.
- route stores only endpointId/apiHost.
- no Whistle format is required.

- [ ] **Step 5: Verify parallel modules**

```bash
pnpm --filter mockoon-gen test -- tests/mock-artifact tests/config-v2
pnpm --filter mockoon-gen typecheck
```

- [x] **Step 6: Commit**

```bash
git add packages/mockoon-gen-cli/src/mock-artifact packages/mockoon-gen-cli/src/config-v2 packages/mockoon-gen-cli/tests/mock-artifact packages/mockoon-gen-cli/tests/config-v2
git commit -m "feat: add mock artifact schema 0.3"
```

---

## Task 9: Implement Policy-Driven Mockoon Generation

**Files:**

- Create: `packages/mockoon-gen-cli/src/generators/mockoon-v3.ts`
- Create: `packages/mockoon-gen-cli/src/openapi/mock-support.ts`
- Create: `packages/mockoon-gen-cli/tests/generators/mockoon-v3.test.ts`
- Expand: `packages/mockoon-gen-cli/tests/mock-artifact/from-openapi.test.ts`

- [x] **Step 1: Write failing scenario and type tests**

Cover:

- required success-default, success-empty, error-default.
- root array list detection.
- exactly one top-level array property detection.
- multiple top-level arrays produce needsReview instead of arbitrary selection.
- list itemCount 10, 20, and 30.
- policy disabled produces no required list scenario.
- integer/number templates output JSON numbers.
- boolean templates output JSON booleans.
- string templates remain strings.
- enum retains original JSON type.

- [x] **Step 2: Select supported success responses deterministically**

Use the lowest numeric 2xx response with supported inline `application/json` schema. Report unsupported structures; do not silently emit `{}` for `$ref` or compositions.

- [x] **Step 3: Implement Mockoon v3 exporter**

Read only `MockArtifact`. The generator returns JSON data and does not write files.

- [ ] **Step 4: Verify**

```bash
pnpm --filter mockoon-gen test -- tests/mock-artifact/from-openapi.test.ts tests/generators/mockoon-v3.test.ts
pnpm --filter mockoon-gen typecheck
```

- [x] **Step 5: Commit**

```bash
git add packages/mockoon-gen-cli/src/generators/mockoon-v3.ts packages/mockoon-gen-cli/src/openapi/mock-support.ts packages/mockoon-gen-cli/tests
git commit -m "feat: generate policy-driven Mockoon scenarios"
```

---

## Task 10: Derive Whistle Rules and Delay Format Selection

**Files:**

- Create: `packages/mockoon-gen-cli/src/generators/whistle-v3.ts`
- Create: `packages/mockoon-gen-cli/tests/generators/whistle-v3.test.ts`

- [x] **Step 1: Write failing derivation tests**

Cover:

- static endpoint uses plain matcher.
- one and multiple OpenAPI path params generate `^`, `*`, and ordered `$n` captures.
- target path is derived from the same endpoint path with `{param}` replaced by the corresponding ordered `$1...$n` captures.
- no terminal `$` by default.
- duplicate generated rules deduplicate.
- route endpointId missing from endpoints fails.
- apiHost with scheme, path, `^`, or `$` fails preflight rather than being repaired.
- JSON output excludes `Default`.
- CJS exports groupName, name, and rules.
- JSON/CJS are chosen by a function argument, not artifact fields.

- [x] **Step 2: Implement semantic lookup**

Resolve route endpointId to endpoint; use Mockoon port as target port. Do not accept matcher or target overrides.

- [x] **Step 3: Keep generator and serializer separate**

Use one derived rules text function, then JSON and CJS serializers. This prevents behavior drift between formats.

- [x] **Step 4: Verify**

```bash
pnpm --filter mockoon-gen test -- tests/generators/whistle-v3.test.ts
pnpm --filter mockoon-gen typecheck
```

- [x] **Step 5: Commit**

```bash
git add packages/mockoon-gen-cli/src/generators/whistle-v3.ts packages/mockoon-gen-cli/tests/generators/whistle-v3.test.ts
git commit -m "feat: derive Whistle rules from endpoints"
```

---

## Task 11: Add Mock Target Preflight

**Files:**

- Create: `packages/mockoon-gen-cli/src/preflight-v2/diagnostics.ts`
- Create: `packages/mockoon-gen-cli/src/preflight-v2/run-preflight.ts`
- Create: `packages/mockoon-gen-cli/src/preflight-v2/mockoon.ts`
- Create: `packages/mockoon-gen-cli/src/preflight-v2/whistle.ts`
- Create: `packages/mockoon-gen-cli/tests/preflight-v2/run-preflight.test.ts`
- Create: `packages/mockoon-gen-cli/tests/preflight-v2/mockoon.test.ts`
- Create: `packages/mockoon-gen-cli/tests/preflight-v2/whistle.test.ts`

- [x] **Step 1: Write failing shared-gate tests**

Stable diagnostic codes must include:

- `ARTIFACT_SCHEMA_UNSUPPORTED`
- `OPENAPI_UNREVIEWED`
- `OPENAPI_HASH_MISMATCH`
- `REVIEW_ITEM_OPEN`
- `MOCKOON_PORT_REQUIRED`
- `MOCK_SCENARIO_REQUIRED`
- `LIST_SCENARIO_REQUIRED`
- `LIST_SCHEMA_AMBIGUOUS`
- `WHISTLE_GROUP_REQUIRED`
- `WHISTLE_HOST_REQUIRED`
- `WHISTLE_HOST_INVALID`
- `WHISTLE_ENDPOINT_UNKNOWN`
- `WHISTLE_CAPTURE_INVALID`

- [x] **Step 2: Implement target-aware review item filtering**

Implement the scope/path rules documented in Task 8. `target=all` returns the stable union without duplicate diagnostics.

- [x] **Step 3: Implement Mockoon readiness**

Check schema, hash, review, port, IDs, scenario selection, required scenarios, policy, body types, and UUID uniqueness.

- [x] **Step 4: Implement Whistle readiness**

Check shared OpenAPI readiness, port, group, host-only values, endpoint references, and derived capture integrity. Format is not required for `validate --target whistle`; export validates the format argument separately.

- [x] **Step 5: Verify**

```bash
pnpm --filter mockoon-gen test -- tests/preflight-v2
pnpm --filter mockoon-gen typecheck
```

- [x] **Step 6: Commit**

```bash
git add packages/mockoon-gen-cli/src/preflight-v2 packages/mockoon-gen-cli/tests/preflight-v2
git commit -m "feat: add target-aware mock preflight"
```

---

## Task 12: Add Mock Path Safety and No-Clobber Writes

**Files:**

- Create: `packages/mockoon-gen-cli/src/utils/paths-v2.ts`
- Create: `packages/mockoon-gen-cli/src/utils/safe-write-v2.ts`
- Create: `packages/mockoon-gen-cli/tests/utils/paths-v2.test.ts`
- Create: `packages/mockoon-gen-cli/tests/utils/safe-write-v2.test.ts`

- [x] **Step 1: Write failing path tests**

Cover:

- artifact/config/output directly under visible `mockoon-gen`.
- project-root `mockoon-gen` only when page-dir explicitly resolves to project root.
- renamed or hidden directory rejected.
- `..` escape rejected.
- absolute project-outside path rejected.
- symlink escape rejected.
- Windows separators normalized in pure helper tests.

- [x] **Step 2: Write failing no-clobber tests**

Cover init, artifact, JSON output, and CJS output:

- absent write.
- identical no-op.
- different refusal.
- force replacement.
- force cannot bypass path or preflight.

- [x] **Step 3: Implement package-local safety helpers**

Do not move them into `openapi-reader`. The two CLIs remain independently owned even if their safety behavior is intentionally parallel.

- [x] **Step 4: Verify**

```bash
pnpm --filter mockoon-gen test -- tests/utils/paths-v2.test.ts tests/utils/safe-write-v2.test.ts
pnpm --filter mockoon-gen typecheck
```

- [x] **Step 5: Commit**

```bash
git add packages/mockoon-gen-cli/src/utils packages/mockoon-gen-cli/tests/utils
git commit -m "fix: enforce mock output write boundaries"
```

---

## Task 13: Cut Over the Mockoon Gen CLI and Remove Legacy/API Code

**Files:**

- Rewrite: `packages/mockoon-gen-cli/src/cli.ts`
- Modify: `packages/mockoon-gen-cli/src/index.ts`
- Move/rename into canonical locations:
  - `src/mock-artifact/*` → `src/artifact/*`
  - `src/config-v2/*` → `src/config/*`
  - `src/preflight-v2/*` → `src/preflight/*`
  - `src/generators/mockoon-v3.ts` → `src/generators/mockoon.ts`
  - `src/generators/whistle-v3.ts` → `src/generators/whistle.ts`
  - `src/utils/paths-v2.ts` → `src/utils/paths.ts`
  - `src/utils/safe-write-v2.ts` → `src/utils/safe-write.ts`
- Delete: `packages/mockoon-gen-cli/src/generators/api-code.ts`
- Delete: `packages/mockoon-gen-cli/src/generators/api-code-sync.ts`
- Delete: `packages/mockoon-gen-cli/src/generators/hash.ts`
- Delete legacy: `packages/mockoon-gen-cli/src/artifact/*` before moving new files
- Delete legacy: `packages/mockoon-gen-cli/src/config/*` before moving new files
- Rewrite: `packages/mockoon-gen-cli/tests/cli/cli.test.ts`
- Rewrite: `packages/mockoon-gen-cli/tests/cli/e2e.test.ts`
- Remove/move legacy tests under `tests/artifact`, `tests/config`, and `tests/generators/api-code.test.ts`

- [ ] **Step 1: Write the final CLI tests first**

Expected commands:

- `init`
- `from-openapi`
- `validate`
- `export mockoon`
- `export whistle --format json|cjs`

Expected absent:

- `generate`
- `sync-api-code`
- `guard`
- `export whistle-cli`

- [ ] **Step 2: Wire idempotent init/from-openapi**

Implement:

- page-local fixed config/artifact paths.
- no Whistle format gate.
- `from-openapi <file> --origin <generated|imported|manual>` and optional `--reviewed`, plus the exact `--page-dir`, `--force`, and `--cwd` contract from the spec.
- same hash no-op, changed hash refusal, force replacement.
- old schema explicit error; no migration or deletion.

- [ ] **Step 3: Wire validate and exports through shared preflight**

`validate --target` defaults all. Export commands call preflight internally before safe write.

- [ ] **Step 4: Delete mock-owned API and guard code**

Remove child-process Git snapshot logic, tmp guard snapshots, code hashes, sync parser, API generator imports, and API config fields.

- [ ] **Step 5: Promote parallel v3/v2 modules to canonical paths**

Update imports and test paths. Do not leave `-v2`, `-v3`, `config-v2`, or `preflight-v2` names in the final tree.

- [ ] **Step 6: Set mock CLI version 0.2.0**

Update package and exported version consistently.

- [ ] **Step 7: Run package verification**

```bash
pnpm --filter mockoon-gen test
pnpm --filter mockoon-gen typecheck
pnpm --filter mockoon-gen build
node packages/mockoon-gen-cli/dist/src/cli.js --help
```

Also verify removal:

```bash
rg -n "sync-api-code|guard begin|sourcePattern|targetPath|generateApiCode|apiOutput|confirmPlacement" packages/mockoon-gen-cli/src packages/mockoon-gen-cli/tests
```

Expected: no obsolete runtime/schema references; fixture descriptions may mention old fields only in explicit rejection tests.

- [ ] **Step 8: Commit**

```bash
git add packages/mockoon-gen-cli
git commit -m "refactor: cut over mockoon-gen to mock artifacts"
```

---

## Task 14: Rewrite Both Skills with Progressive Disclosure

**Files:**

- Rewrite: `skills/mockoon-gen/SKILL.md`
- Modify via generator: `skills/mockoon-gen/agents/openai.yaml`
- Create: `skills/mockoon-gen/references/whistle-patterns.md`
- Delete: `skills/mockoon-gen/README.md`
- Rewrite initializer output: `skills/api-code-gen/SKILL.md`
- Modify via generator: `skills/api-code-gen/agents/openai.yaml`
- Create: `skills/api-code-gen/references/api-output-layout.md`
- Modify: `README.md`

- [x] **Step 1: Rewrite Mockoon Gen SKILL.md**

Target 80–100 lines. Keep only:

- trigger contract in frontmatter.
- page-dir and reviewed OpenAPI gates.
- loose docs normalization.
- mock-artifact review.
- target validate/export workflow.
- delayed Whistle format choice.
- target-specific stop conditions.

Move matcher theory and troubleshooting to `references/whistle-patterns.md`. Do not duplicate the same rules in both files.

- [x] **Step 2: Write API Code Gen SKILL.md**

Use imperative instructions. Include:

- reviewed OpenAPI only.
- page-dir and output plan.
- DTO/VO/mapper artifact review.
- single/split selection.
- project-convention inspection when split is true.
- stop and ask when the convention is unclear.
- validate before generate.
- no reverse sync.

Put layout heuristics and examples in `references/api-output-layout.md`.

- [x] **Step 3: Regenerate agents metadata**

```bash
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py skills/mockoon-gen \
  --interface display_name="Mockoon Gen" \
  --interface short_description="Generate reviewed Mockoon and Whistle artifacts" \
  --interface default_prompt='Use $mockoon-gen to turn reviewed OpenAPI into page-local Mockoon and Whistle artifacts.'

python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py skills/api-code-gen \
  --interface display_name="API Code Gen" \
  --interface short_description="Generate reviewed TypeScript API code" \
  --interface default_prompt='Use $api-code-gen to create reviewed DTO, VO, mapper, and TypeScript API code from OpenAPI.'
```

- [x] **Step 4: Consolidate user-facing docs at repository root**

Update root `README.md` to list both skills, installation, invocation examples, generated files, and the fact that they share OpenAPI but not artifacts. Remove the per-skill README to avoid duplicated instructions.

- [x] **Step 5: Validate both skills**

```bash
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/mockoon-gen
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/api-code-gen
rg -n "TBD|TODO|FIXME|api-artifact|sync-api-code|guard begin|export whistle-cli" skills/mockoon-gen skills/api-code-gen
```

Expected: validators pass; no placeholders or obsolete workflow instructions.

- [x] **Step 6: Commit**

```bash
git add README.md skills/mockoon-gen skills/api-code-gen
git commit -m "docs: split mock and api code skills"
```

---

## Task 15: Bundle Both CLIs and Verify Reproducibility

**Files:**

- Modify: `packages/mockoon-gen-cli/scripts/bundle-cli.mjs`
- Verify/update: `packages/api-code-gen-cli/scripts/bundle-cli.mjs`
- Regenerate: `skills/mockoon-gen/bin/mockoon-gen.mjs`
- Generate: `skills/api-code-gen/bin/api-code-gen.mjs`
- Modify: root `package.json`

- [x] **Step 1: Ensure workspace build order is explicit**

Root bundle must build `@yzin/openapi-reader` before invoking esbuild for either CLI. Do not externalize the workspace reader; each final `.mjs` must be standalone.

- [x] **Step 2: Bundle both CLIs**

```bash
pnpm build
pnpm bundle
```

- [x] **Step 3: Verify repository bundles**

```bash
node skills/mockoon-gen/bin/mockoon-gen.mjs --version
node skills/mockoon-gen/bin/mockoon-gen.mjs --help
node skills/api-code-gen/bin/api-code-gen.mjs --version
node skills/api-code-gen/bin/api-code-gen.mjs --help
```

Expected versions: mock `0.2.0`, API `0.1.0`.

- [x] **Step 4: Re-run bundling and assert clean reproduction**

```bash
pnpm bundle
git diff --exit-code -- skills/mockoon-gen/bin/mockoon-gen.mjs skills/api-code-gen/bin/api-code-gen.mjs
```

- [x] **Step 5: Commit**

```bash
git add package.json packages/mockoon-gen-cli/scripts packages/api-code-gen-cli/scripts skills/mockoon-gen/bin skills/api-code-gen/bin
git commit -m "build: bundle split generator CLIs"
```

---

## Task 16: Replace the Post-Merge Bundle Workflow

**Files:**

- Rewrite/rename: `.github/workflows/bundle-mockoon-gen-cli.yml`

- [x] **Step 1: Change workflow purpose from mutation to verification**

Trigger on pull requests and main pushes when either package, skill bundle, root lockfile, or workflow changes.

Use read-only contents permission. Remove `peter-evans/create-pull-request` and all write permissions.

- [x] **Step 2: Use the root workspace**

Workflow steps:

1. checkout
2. setup pnpm 11.7.0
3. setup Node 22 with root lockfile cache
4. `pnpm install --frozen-lockfile`
5. `pnpm test`
6. `pnpm typecheck`
7. `pnpm build`
8. `pnpm bundle`
9. `git diff --exit-code` for both bundled CLIs
10. run both bundle `--version` and `--help`
11. run both skill quick validators

- [x] **Step 3: Validate workflow syntax locally where available**

At minimum inspect YAML parsing and path filters. If `actionlint` is installed, run it; do not add it as a dependency solely for this task.

- [x] **Step 4: Commit**

```bash
git add .github/workflows package.json pnpm-lock.yaml
git commit -m "ci: verify generator bundles in pull requests"
```

---

## Task 17: Full E2E, Negative, and Forward Verification

**Files:**

- Expand: `packages/mockoon-gen-cli/tests/cli/e2e.test.ts`
- Expand: `packages/api-code-gen-cli/tests/cli/e2e.test.ts`
- Create only if useful for reusable fixtures: `packages/*/tests/fixtures/projects/*`
- No production code changes unless a failing test exposes a spec violation.

- [x] **Step 1: Add cross-command Mockoon e2e cases**

Cover:

- init → from-openapi without Whistle format.
- unreviewed artifact blocks export.
- reviewed artifact exports Mockoon.
- Whistle JSON and CJS selected only at export.
- same hash from-openapi no-op.
- changed hash from-openapi refuses.
- old `0.2.0` artifact refuses and remains unchanged.
- manually changed output refuses overwrite.
- `--force` replaces output only after readiness/path checks.

- [x] **Step 2: Add cross-command API e2e cases**

Cover:

- reviewed flag required.
- single-file generation.
- split generation following explicit plan.
- missing/duplicate endpoint assignment blocks.
- output plan unconfirmed blocks.
- unsupported request body/query blocks.
- project-outside and symlink paths block.
- manually changed output refuses overwrite.

- [ ] **Step 3: Run all automated verification**

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm bundle
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/mockoon-gen
python3 /Users/yzin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/api-code-gen
git diff --check
git diff --exit-code -- skills/mockoon-gen/bin/mockoon-gen.mjs skills/api-code-gen/bin/api-code-gen.mjs
```

- [x] **Step 4: Run isolated skill forward-tests**

Use fresh subagents with raw temporary projects and no leaked diagnosis. Use prompts shaped like real requests, including:

1. `$mockoon-gen` with loose docs and no page directory.
2. `$mockoon-gen` with reviewed OpenAPI requesting only Mockoon and no Whistle format.
3. `$mockoon-gen` with a stale artifact and pressure to skip review.
4. `$api-code-gen` with reviewed OpenAPI and an obvious existing split API convention.
5. `$api-code-gen` with no clear API convention and `splitApiOutput=true`.
6. `$api-code-gen` with an existing TypeScript API file instead of OpenAPI.

Verify actual actions, CLI calls, file diffs, and stop points. Do not tell the subagents the expected answer. Use temporary directories and remove their artifacts after evaluation.

- [ ] **Step 5: Final architecture audit**

```bash
rg -n "mock-artifact" packages/api-code-gen-cli skills/api-code-gen
rg -n "api-code-artifact|dto|mapper|apiOutput|generateApiCode" packages/mockoon-gen-cli skills/mockoon-gen
rg -n "@yzin/openapi-reader" packages/mockoon-gen-cli packages/api-code-gen-cli
```

Expected:

- API skill/package does not consume mock artifact.
- Mock skill/package does not contain API code state.
- Both consume only the shared reader package.

- [x] **Step 6: Commit any test-only additions**

```bash
git add packages/mockoon-gen-cli/tests packages/api-code-gen-cli/tests
git commit -m "test: verify split generator workflows"
```

If automated or forward tests expose production defects, fix them in separate narrowly scoped commits before this final test commit.

---

## Final Verification Checklist

- [x] Root workspace has one lockfile.
- [x] `@yzin/openapi-reader` contains no target-specific artifact or generator logic.
- [x] `mockoon-gen` version is 0.2.0 and artifact schema is 0.3.0.
- [x] `api-code-gen` version and artifact schema are 0.1.0.
- [x] Mock CLI help excludes generate, sync, guard, and whistle-cli.
- [x] API CLI help excludes sync and all mock exports.
- [x] Whistle format is absent from config/artifact and required only for export.
- [x] Mock artifact does not store sourcePattern or targetPath.
- [x] list item count defaults to 20 but is policy-driven.
- [x] splitApiOutput produces an explicit reviewed file plan.
- [x] all output commands call shared package-local preflight.
- [x] open fatal/needsReview blocks real output.
- [x] OpenAPI hash drift blocks output.
- [x] path traversal and symlink escapes fail.
- [x] init/from-openapi/output no-clobber behavior is covered by tests.
- [x] old artifact is rejected without deletion or migration.
- [x] numeric and boolean mock template types are correct.
- [x] both SKILL.md files validate and contain no placeholders.
- [x] both bundles reproduce with no diff.
- [ ] full tests, typecheck, build, bundle, e2e, and forward-tests pass.
- [x] `git status --short` is clean after final commits.
