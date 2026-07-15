# Mockoon Gen 拆分与门禁强化设计

## 文档状态

- 设计日期：2026-07-14
- 状态：已完成设计讨论，等待书面 spec review
- 实施状态：未开始
- 相关现有设计：`docs/superpowers/specs/2026-07-06-api-mockgen-design.md`

## 背景

当前 `mockoon-gen` 同时承担四类职责：

- 从 OpenAPI 创建协作 artifact。
- 生成 Mockoon 环境。
- 生成 Whistle GUI JSON 或 CLI CJS。
- 生成并反向同步 TypeScript DTO、VO、mapper 和 API code。

这些职责共享同一个 `api-artifact.json`、配置文件和 CLI。随着功能增加，当前实现出现了以下问题：

- Whistle 导出格式在 artifact 生成前就必须选择，阻塞了与格式无关的 Mockoon 和 artifact 流程。
- `guard begin/check` 是可选且依赖 Git 可见状态的外围检查，不能形成真正写入边界。
- `sync-api-code` 让派生代码反向成为 artifact 输入，破坏单向 source-of-truth。
- `sourcePattern` 和 `targetPath` 与 endpoint path 重复存储，可能漂移。
- 多个配置字段未使用，或只被校验但没有影响输出。
- “列表必须生成 20 条”被硬编码成全局规则，无法按项目调整。
- `generate` 和 `export` 可以绕过 `validate --strict`。
- `reviewItems`、多层 `reviewStatus`、`pending-confirmation`、`null` 和 confidence 同时表示未决状态，可能互相矛盾。
- OpenAPI provenance 会被错误地自动标记为 imported/confirmed。
- 源码、skill bundle 和已安装 bundle 可能处于不同功能版本。

本设计把 mock 与 API code 拆成两个独立 skill，并强化 CLI 的确定性、写入安全和 target readiness。

## 目标

- 将 `mockoon-gen` 收敛为 OpenAPI 到 Mockoon/Whistle 的低侵入 mock 工作流。
- 新建 `api-code-gen`，承接现有 DTO、VO、mapper 和 TypeScript API code 生成能力。
- 两个 skill 只共享必要且稳定的 OpenAPI 读取能力，不共享 artifact、配置、review 状态或业务生成模型。
- 将 Whistle JSON/CJS 选择延迟到导出命令。
- 删除 `guard begin/check` 和 `sync-api-code`。
- 删除 artifact 中可以从 endpoint 确定推导的 Whistle 字段。
- 让所有保留的配置真实生效。
- 将列表数量变成可配置 policy，默认值保持 20。
- 让 `validate`、`export` 和 `generate` 使用同一套 preflight。
- 防止路径逃逸、静默覆盖和人工 review 内容丢失。
- 精简 `SKILL.md`，把确定性规则放回 CLI，把非核心领域说明放到 reference。
- 通过负向测试和原始任务行为测试验证门禁不能被绕过。

## 非目标

- 本阶段不实现旧 `api-artifact.json` 的自动迁移。
- 本阶段不实现 OpenAPI 与已 review artifact 的增量合并或 `refresh` 命令。
- 本阶段不扩展为完整 OpenAPI 3.x 代码生成器。
- 本阶段不新增 `$ref`、`allOf`、`oneOf`、request body、query builder 等 API code 能力。
- 本阶段不支持从 TypeScript API 文件反向生成 artifact。
- 本阶段不恢复 `sync-api-code` 的等价能力。
- 本阶段不允许两个 skill 读取彼此的 artifact。
- 本阶段不引入额外 mock runtime，如 MSW、Express 或 Vite handler。

## 总体决策

### 独立能力边界

仓库采用以下结构：

```text
packages/
  openapi-reader/
  mockoon-gen-cli/
  api-code-gen-cli/

skills/
  mockoon-gen/
  api-code-gen/
```

各部分职责：

- `openapi-reader`：OpenAPI 读取、基础结构检查、内容 hash、文件路径归一化和解析诊断。
- `mockoon-gen-cli`：`mock-artifact` schema、mock policy、Mockoon exporter、Whistle exporter 和 mock readiness。
- `api-code-gen-cli`：`api-code-artifact` schema、DTO/VO/mapper 草案、单文件或拆分文件生成和 API code readiness。
- `mockoon-gen` skill：处理 loose docs、page directory、OpenAPI review、mock 语义确认和 mock 导出工作流。
- `api-code-gen` skill：处理 reviewed OpenAPI、项目既有 API 目录惯例、输出计划和 API code 生成工作流。

### 共享限制

`openapi-reader` 只能共享以下内容：

- 读取 YAML/JSON OpenAPI 文件。
- 计算源文件 SHA-256。
- 基础 OpenAPI 结构检查。
- 返回规范化的文件引用和解析 diagnostic。
- 两个消费者都需要的最小 OpenAPI TypeScript 类型。

`openapi-reader` 不得包含：

- 任一 artifact schema。
- review item 或 review status。
- Mockoon、Whistle、DTO、VO、mapper 或输出计划。
- 任一 skill 的配置。
- 任一目标的支持范围判断；目标特有的 unsupported diagnostic 由对应 CLI 产生。

两个 CLI 不互相 import，也不读取彼此 artifact。它们可以读取同一份 reviewed OpenAPI，这是唯一共享契约。

## 数据流

```text
loose docs
  -> mockoon-gen skill
  -> generated OpenAPI
  -> human/project review
  -> reviewed OpenAPI
     -> mockoon-gen CLI
        -> mock-artifact.json
        -> mockoon.json / whistle.json / whistle.cjs
     -> api-code-gen CLI
        -> api-code-artifact.json
        -> TypeScript API code
```

`mock-artifact.json` 与 `api-code-artifact.json` 不互相引用。生成文件都是派生输出，不是 artifact 的反向输入。

## Mockoon Gen 设计

### 默认目录

```text
<page-dir>/mockoon-gen/
  mockoon-gen.config.json
  openapi.yaml
  mock-artifact.json
  mockoon.json
  whistle.json
  whistle.cjs
```

只有实际选择的 Whistle 格式需要存在。`whistle.json` 和 `whistle.cjs` 不要求同时生成。

### Mock 配置

`mockoon-gen.config.json` 只保留会影响 draft artifact 的项目默认值：

```json
{
  "mockoonPort": null,
  "whistleGroupName": null,
  "mockPolicy": {
    "listScenario": {
      "enabled": true,
      "itemCount": 20
    }
  }
}
```

字段语义：

- `mockoonPort`：创建 draft artifact 时复制到 `outputs.mockoon.port`。
- `whistleGroupName`：创建 draft artifact 时复制到 `outputs.whistle.groupName`。
- `mockPolicy.listScenario.enabled`：是否为可明确识别的列表 endpoint 生成列表专用场景。
- `mockPolicy.listScenario.itemCount`：列表专用场景的生成数量，必须是 1 到 1000 的整数，默认 20。

配置只是 draft 默认值。`from-openapi` 创建 artifact 后，artifact 中的 effective policy 是 validate/export 的唯一事实来源。之后修改配置不会静默修改已有 artifact。

以下旧配置从 `mockoon-gen` 删除：

- `artifactDir`：由 `--page-dir` 和固定目录名推导。
- `openapiFile`：由 `from-openapi <file>` 明确提供。
- `mockoonFile`：固定为 artifact 同目录下的 `mockoon.json`。
- `whistleFile`：由导出时的 `--format` 推导。
- `apiOutput`：移交 `api-code-gen`。
- `generateApiCode`：mock CLI 不再生成 API code。
- `splitApiOutput`：移交 `api-code-gen`。
- `transformResponse`：移交 `api-code-gen`。
- `confirmPlacement`：删除，输出确认由 artifact 状态和 preflight 表达。

CLI 不再静默读取 project-root 或旧位置的 legacy config。缺少 page-local config 时使用内建默认值；`init` 用于将这些默认值显式写出。

### Mock Artifact

文件名为：

```text
<page-dir>/mockoon-gen/mock-artifact.json
```

schema version 为 `0.3.0`。概念结构如下：

```json
{
  "schemaVersion": "0.3.0",
  "openapi": {
    "file": "src/pages/user/mockoon-gen/openapi.yaml",
    "sha256": "openapi-content-hash",
    "origin": "generated",
    "reviewStatus": "unreviewed"
  },
  "reviewItems": [],
  "policies": {
    "listScenario": {
      "enabled": true,
      "itemCount": 20
    }
  },
  "endpoints": [
    {
      "id": "ep-get-user",
      "operationId": "getUser",
      "method": "GET",
      "path": "/api/users/{id}",
      "summary": "Get user",
      "mock": {
        "selection": {
          "mode": "query",
          "key": "scenario",
          "defaultScenario": "success-default"
        },
        "scenarios": [
          {
            "name": "success-default",
            "statusCode": 200,
            "headers": {
              "Content-Type": "application/json; charset=utf-8"
            },
            "bodyTemplate": "{}",
            "origin": "generated",
            "enabled": true
          },
          {
            "name": "success-empty",
            "statusCode": 200,
            "headers": {
              "Content-Type": "application/json; charset=utf-8"
            },
            "bodyTemplate": "{}",
            "origin": "generated",
            "enabled": true
          },
          {
            "name": "error-default",
            "statusCode": 500,
            "headers": {
              "Content-Type": "application/json; charset=utf-8"
            },
            "bodyTemplate": "{}",
            "origin": "generated",
            "enabled": true
          }
        ]
      }
    }
  ],
  "outputs": {
    "whistle": {
      "groupName": null,
      "routes": [
        {
          "endpointId": "ep-get-user",
          "apiHost": null
        }
      ]
    },
    "mockoon": {
      "port": null,
      "defaultHeaders": {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  }
}
```

### Review 状态模型

artifact 只保留两类显式 review 状态：

- `openapi.reviewStatus`：表示源 OpenAPI 是否已 review。
- 全局 `reviewItems`：表示不能仅由字段值推导的人工语义问题。

endpoint、scenario、Whistle route 和 Mockoon output 不再各自保存重复的 `reviewStatus`。可机械判断的缺失值由 preflight 动态产生 diagnostic，不重复写入 artifact。

`reviewItems` 使用以下字段：

```json
{
  "id": "review-001",
  "severity": "fatal | needsReview | warning",
  "scope": "global | openapi | endpoint | mock | output",
  "path": "endpoints[0].mock.scenarios[0]",
  "message": "Scenario body is ambiguous",
  "suggestion": "Confirm the response envelope",
  "resolutionStatus": "open | resolved | ignored",
  "resolution": {
    "reason": "Accepted because the backend contract is incomplete",
    "resolvedBy": "human | mockoon-gen-skill",
    "resolvedAt": "2026-07-14T15:00:00+08:00"
  }
}
```

规则：

- `resolutionStatus: open` 时不得包含伪造的解决信息。
- `resolved` 和 `ignored` 必须包含非空 `reason`、`resolvedBy` 和 `resolvedAt`。
- 开放的 `fatal` 或 `needsReview` 阻塞其适用 target。
- 开放的 `warning` 只报告，不阻塞。
- `ignored` 表示明确接受风险，不等于删除问题。

### 删除 Whistle 派生副本

Whistle route 只保存：

- `endpointId`
- `apiHost`

删除：

- `operationId`
- `method`
- `sourcePath`
- `sourcePattern`
- `targetPort`
- `targetPath`
- route 级 `origin`
- route 级 `reviewStatus`

推导规则：

- method、operationId 和 path 由 `endpointId` 解析到 endpoint。
- target port 使用 `outputs.mockoon.port`。
- target path 使用 endpoint 原始 OpenAPI path，并把 path param 转成 `$1...$n`。
- 静态 source matcher 为 `apiHost + endpoint.path`。
- 动态 source matcher 在前面加 `^`，把每个 `{param}` 从左到右转换为 `*`。
- 动态 target path 把相同顺序的 `{param}` 转成 `$1...$n`。
- 默认不添加 terminal `$`。
- exporter 不使用自动 remainder joining 传递 path param。

artifact 不提供 matcher override。未来若需要用户自定义 Whistle matcher，应另行设计显式 override 类型，不能重新混用派生字段。

### Mock Policy

每个 endpoint 仍必须至少包含以下 enabled scenario：

- `success-default`
- `success-empty`
- `error-default`

列表专用场景由 `policies.listScenario` 控制：

- `enabled: true`：对明确识别的列表 endpoint 生成 `success-list-<itemCount>`。
- `enabled: false`：不要求也不自动生成列表专用场景。
- `itemCount` 不再固定为 20；20 只是默认值。

列表 endpoint 的 MVP 识别规则：

- response root schema 是 array；或
- response root object 恰好有一个 top-level array property。

如果 root object 有多个 top-level array property，CLI 产生 `needsReview` diagnostic，不自行选择其中一个。

有效 policy 被写入 artifact。validate/export 不在运行时重新读取配置 policy。

### Mockoon Gen CLI

命令收敛为：

```bash
mockoon-gen init --page-dir <page-dir> [--force] --cwd <project-dir>
mockoon-gen from-openapi <file> --origin <generated|imported|manual> [--reviewed] --page-dir <page-dir> [--force] --cwd <project-dir>
mockoon-gen validate --from <mock-artifact> [--target all|mockoon|whistle] --cwd <project-dir>
mockoon-gen export mockoon --from <mock-artifact> [--force] --cwd <project-dir>
mockoon-gen export whistle --format <json|cjs> --from <mock-artifact> [--force] --cwd <project-dir>
```

删除命令：

- `generate`
- `sync-api-code`
- `guard begin`
- `guard check`
- `export whistle-cli`

Whistle 格式只在 `export whistle` 时选择：

- `--format json` 输出 `<page-dir>/mockoon-gen/whistle.json`。
- `--format cjs` 输出 `<page-dir>/mockoon-gen/whistle.cjs`。
- format 不写入 config 或 artifact。
- `from-openapi`、`validate --target mockoon` 和 `export mockoon` 不要求 Whistle format。
- CJS 导出成功后打印对应的 `w2 add` 和 `mockoon-cli start --data` 命令。
- JSON 继续只输出需求 group 和 order list，不生成 `Default` group。

## API Code Gen 设计

### 第一阶段能力范围

第一阶段迁移现有 DTO、VO、mapper 和请求函数生成能力，不扩展输入和转换语义。

`api-code-gen`：

- 只接受 reviewed OpenAPI。
- 不处理 loose docs、截图、YApi 文本或已有 TypeScript API 文件。
- 不读取 `mock-artifact.json`。
- 不提供 reverse sync。
- 将生成代码视为可重新生成的派生输出。

### 默认目录

```text
<page-dir>/api-code-gen/
  api-code-gen.config.json
  api-code-artifact.json

<confirmed-api-output>
```

### API Code 配置

```json
{
  "apiOutput": null,
  "splitApiOutput": false,
  "transformResponse": true
}
```

字段语义：

- `apiOutput`：单文件模式下是 project-relative `.ts` 文件；拆分模式下是 project-relative 输出目录。`null` 表示未确认。
- `splitApiOutput`：是否按项目既有惯例拆分文件。
- `transformResponse`：生成请求函数是否通过 mapper 返回 VO。

删除 `confirmPlacement`。输出是否可生成由 artifact 中已确认的 output plan 表达。

### API Code Artifact

文件名为：

```text
<page-dir>/api-code-gen/api-code-artifact.json
```

schema version 从 `0.1.0` 开始。概念结构如下：

```json
{
  "schemaVersion": "0.1.0",
  "openapi": {
    "file": "src/pages/user/mockoon-gen/openapi.yaml",
    "sha256": "openapi-content-hash",
    "origin": "imported",
    "reviewStatus": "confirmed"
  },
  "reviewItems": [],
  "endpoints": [
    {
      "id": "ep-get-user",
      "operationId": "getUser",
      "method": "GET",
      "path": "/api/users/{id}",
      "summary": "Get user",
      "dto": {
        "response": "GetUserResponseDTO"
      },
      "vo": {
        "name": "GetUserVO",
        "fields": []
      },
      "mapper": {
        "name": "toGetUserVO",
        "enabled": true,
        "steps": []
      }
    }
  ],
  "output": {
    "splitApiOutput": false,
    "file": null,
    "transformResponse": true,
    "reviewStatus": "unreviewed"
  }
}
```

API artifact 不包含 mock、Mockoon 或 Whistle 字段。

VO field 保留现有生成所需的 name、type 和 DTO source path。Mapper step 保留现有 operation、inputs、output、params、order 和 confidence。低置信度建议在 artifact 创建时转成全局 `reviewItems`，不再要求每个 field/step 再保存一份 review status。

### 单文件输出

当 `splitApiOutput: false` 时，output 结构为：

```json
{
  "splitApiOutput": false,
  "file": "src/pages/user/api.generated.ts",
  "transformResponse": true,
  "reviewStatus": "confirmed"
}
```

规则：

- `file` 必须是 project-relative `.ts` 文件。
- `file` 不能位于 `mockoon-gen` 或 `api-code-gen` artifact 目录内。
- `reviewStatus` 未 confirmed 时，`generate` 停止。

### 拆分输出

当 `splitApiOutput: true` 时，skill 先检查项目已有 API 目录、分组和 export 约定，再将明确输出计划写入 artifact：

```json
{
  "splitApiOutput": true,
  "directory": "src/pages/user/api",
  "files": [
    {
      "file": "user-query.ts",
      "endpointIds": ["ep-get-user", "ep-list-users"]
    },
    {
      "file": "user-command.ts",
      "endpointIds": ["ep-create-user"]
    }
  ],
  "indexFile": "index.ts",
  "transformResponse": true,
  "reviewStatus": "confirmed"
}
```

规则：

- CLI 不扫描项目来决定拆分方式。
- skill 负责检查相邻或相关 API 代码惯例。
- 找不到明确惯例时，skill 必须询问用户。
- `directory` 是 project-relative 目录。
- `files[].file` 和 `indexFile` 是相对 `directory` 的文件名或子路径。
- 每个 endpoint 必须且只能出现在一个 `endpointIds` 列表中。
- 不允许未知 endpoint、重复 endpoint、重复文件或空文件组。
- `indexFile` 可以是 `null`；非空时必须导出全部生成模块。
- 所有路径必须位于 confirmed directory 和 project 内。
- output plan 未 confirmed 时，`generate` 停止。

### API Code Gen CLI

```bash
api-code-gen init --page-dir <page-dir> [--force] --cwd <project-dir>
api-code-gen from-openapi <file> --origin <imported|manual> --reviewed --page-dir <page-dir> [--force] --cwd <project-dir>
api-code-gen validate --from <api-code-artifact> --cwd <project-dir>
api-code-gen generate --from <api-code-artifact> [--force] --cwd <project-dir>
```

`generate` 必须调用与 `validate` 相同的 preflight。API code skill 不提供 `sync-api-code`。

## OpenAPI Provenance

`origin` 与 `reviewStatus` 是两个不同维度：

- `origin`：`generated | imported | manual`
- `reviewStatus`：`unreviewed | needs-change | confirmed`

规则：

- `from-openapi` 不因为文件可解析或 origin 为 imported 就自动写 confirmed。
- 新 mock artifact 的 OpenAPI review status 默认是 unreviewed；只有调用方显式提供 `--reviewed` 才写 confirmed。
- `api-code-gen from-openapi` 要求 `--reviewed`，因为该 skill 的输入契约只接受 reviewed OpenAPI。
- generated OpenAPI 必须保持 unreviewed，直到 skill 获得明确人工或项目 review 结论。
- skill 可以在明确 review 后更新已有 mock artifact 为 confirmed，或在首次创建时提供 `--reviewed`。
- CLI 不能证明人类是否真的 review，但必须拒绝未 confirmed 的 artifact 产生正式输出。
- OpenAPI 内容 hash 变化后，现有 artifact 立即 stale，所有正式输出停止。

`api-code-gen` 的 skill 入口只接受已经 reviewed 的 OpenAPI，但 CLI 仍保存并校验 review status，不能只依赖提示词约束。

## 统一 Preflight

### 原则

`validate`、`export` 和 `generate` 不得各自维护不同规则。每个 CLI 应有一个 target-aware preflight core：

```text
preflight(artifact, currentOpenApi, target) -> diagnostics
```

diagnostic 至少包含：

- `severity`: `fatal | needsReview | warning`
- `code`: 稳定机器码
- `path`: artifact JSON path 或输入路径
- `message`: 用户可读信息
- `suggestion`: 可选修复建议

所有命令共享同一结果：

- fatal：始终返回非零。
- needsReview：正式 validate/export/generate 返回非零。
- warning：输出报告但不阻塞。

不再提供含义模糊的 `--strict`。`validate` 表示“当前 target 是否 ready”，而不是可选的宽松 schema 检查。

### Mockoon Target

Mockoon preflight 检查：

- artifact schema。
- OpenAPI review status 和内容 hash。
- 开放 review items。
- Mockoon port 是 1 到 65535 的整数。
- endpoint id 和 operationId 唯一。
- Mockoon route UUID 唯一。
- 每个 endpoint 有 enabled success、empty 和 error 场景。
- defaultScenario 指向 enabled scenario。
- status code、header 和 body template 结构合法。
- list policy 合法。
- policy enabled 时，明确列表 endpoint 有正确 itemCount 的列表场景。
- Faker 模板生成的数字和布尔保持 JSON 数值/布尔类型。

### Whistle Target

Whistle preflight 检查：

- Mockoon target 的共享必要条件，包括有效 port。
- groupName 非空。
- 每个 route 的 endpointId 存在且唯一。
- 每个 route 的 apiHost 非空且为 host-only，不包含 scheme、path、`^` 或 `$`。
- 从 endpoint path 推导出的 wildcard 和 capture 数量一致。
- 生成的 target path 显式使用 `$1...$n`。
- `export whistle` 额外检查命令参数 `--format` 是 json 或 cjs；单独运行 `validate --target whistle` 不要求选择格式。

### API Code Target

API code preflight 检查：

- artifact schema。
- OpenAPI review status 和内容 hash。
- 开放 review items。
- endpoint id、operationId、DTO、VO 和 mapper 名称唯一且为合法 TypeScript identifier。
- DTO source path 可解析。
- mapper operation 属于当前 generator 支持集合。
- output plan confirmed。
- 单文件或拆分文件 plan 满足对应约束。
- 所有目标路径位于 project 内。

## 写入安全

### 路径约束

所有输入和输出路径必须先：

1. 相对 `--cwd` 解析。
2. 规范化 `.` 和 `..`。
3. 对已存在的父目录做 realpath/symlink 解析。
4. 验证 canonical path 位于允许根目录内。

具体约束：

- mock config、artifact、Mockoon 和 Whistle 输出必须直接位于 `<page-dir>/mockoon-gen`。
- API code artifact/config 必须位于 `<page-dir>/api-code-gen`。
- API code 输出必须位于 project 内和 confirmed output plan 范围内。
- 仅检查目录 basename 不足以通过校验。
- `../outside/mockoon-gen`、symlink 到 project 外或绝对 project 外路径必须拒绝。

### `init` 行为

- 配置不存在：创建默认配置。
- 配置已存在：退出成功，打印“已存在，未修改”，不覆盖任何字段。
- `--force`：显式重置默认配置，但仍执行路径约束。

### `from-openapi` 行为

- artifact 不存在：创建 draft artifact。
- artifact 已存在且 OpenAPI hash 相同：退出成功，打印“artifact 已基于当前 OpenAPI，未修改”。
- artifact 已存在且 OpenAPI hash 不同：返回非零，不修改文件，并提示先备份 review 内容。
- `--force`：显式替换 artifact；命令必须清楚打印会丢失已有人工修改。
- config policy 变化但 artifact 已存在时，不自动更新 artifact；需要明确替换或未来的 refresh 设计。

### 派生输出行为

- 输出不存在：正常写入。
- 输出内容与本次生成结果完全相同：no-op，退出成功。
- 输出存在且内容不同：拒绝覆盖并返回非零。
- `--force`：允许替换派生输出，但不允许绕过路径、schema、hash 或 readiness 校验。
- 多文件 API 输出必须先完成全部 preflight 和冲突检查，再原子化提交；不能写一半后失败。

## 旧 Artifact 策略

不自动迁移 `schemaVersion: 0.2.0` 的 `api-artifact.json`。

行为：

- 用户将旧 artifact 传给任一新 CLI 时，CLI 返回明确 unsupported schema 错误。
- `mockoon-gen from-openapi` 写新 `mock-artifact.json`，不删除旧 `api-artifact.json`。
- 如果同目录发现旧 artifact，可以打印 migration warning，但不能静默读取或修改。
- `api-code-gen` 从 OpenAPI 创建自己的新 artifact，不尝试提取旧 artifact 的 API code 状态。

推荐人工流程：

1. 备份旧 artifact。
2. 从原 OpenAPI 分别生成两个新 artifact。
3. 将仍有效的 host、port、group、scenario 和 API output plan 人工转录到对应新 artifact。
4. 重新处理 review items。
5. validate 通过后再导出。

本阶段不设计自动 merge，因为无法可靠区分派生字段、人工确认和过期内容。

## OpenAPI 支持边界与 Diagnostic

第一阶段不承诺完整 OpenAPI 支持，但必须避免静默生成明显错误结果。

共享 reader 负责解析；各目标负责声明支持范围。

通用规则：

- 支持 OpenAPI 3.x YAML/JSON 基础结构。
- 支持当前 generator 已实现的 GET、POST、PUT、PATCH、DELETE。
- success response 从 status code 升序选择首个带 `application/json` inline schema 的 2xx response，不再只读取 200。
- 多个不同成功 schema 产生 warning，报告实际选中的 status。
- 重复 operationId 或生成后重复 endpoint id 是 fatal。

未支持结构处理：

- `$ref`、`allOf`、`oneOf`、`anyOf` 等当前不能正确展开的 schema 产生 fatal unsupported diagnostic。
- `api-code-gen` 遇到当前生成器不能表达的 request body 或 query parameter 时产生 fatal，而不是忽略输入。
- 缺少可支持 success schema 时，不能生成伪装成有效契约的空 DTO；应产生 fatal 或明确的 no-content 分支。
- Mockoon 可安全生成的 no-content endpoint 可以使用显式空 body 场景，但不得假装存在 JSON DTO。

Mock 模板修复：

- integer/number Faker 结果必须以 JSON number 输出。
- boolean Faker 结果必须以 JSON boolean 输出。
- enum 保持原始 JSON 类型。
- string 才使用 JSON 字符串引号。

## CLI 矛盾及解决方法

| 当前矛盾 | 解决方法 |
| --- | --- |
| Whistle format 阻塞 artifact/Mockoon | 删除 `whistleFile`，在 `export whistle --format` 时选择 |
| Skill 示例同时运行两个互斥 Whistle export | 只保留一个带 format 的命令 |
| `generate`/`export` 可绕过 validate | 所有正式输出调用统一 preflight |
| `validate --strict` 才报告部分问题 | 删除 strict；validate 始终表示 target readiness |
| `reviewItems` 被 schema 保存但 validator 忽略 | preflight 强制消费所有开放 fatal/needsReview |
| generated OpenAPI 被写成 imported/confirmed | origin 与 reviewStatus 分离，新 artifact 默认 unreviewed |
| API code 是派生输出，却又可 sync 回 artifact | 删除 sync，恢复单向生成 |
| mock CLI 名称下包含 API code 生成 | 拆成独立 `api-code-gen` skill/CLI/artifact |
| `sourcePattern`/`targetPath` 与 endpoint path 重复 | 从 endpoint path 唯一推导，不存副本 |
| targetPort 每条 route 重复 | 统一使用 `outputs.mockoon.port` |
| `whistleFile` 后缀同时承担模式和路径 | 显式 format 参数，输出文件名固定推导 |
| `openapiFile` 配置被校验但命令使用参数 | 删除配置字段，保留命令参数 |
| `mockoonFile` 配置被校验但 artifact 忽略 | 删除配置字段，固定 page-local 文件名 |
| `transformResponse` 配置存在但 artifact 硬编码 true | 移到 API skill，并把实际值冻结进 API artifact |
| `splitApiOutput` 存在但无行为 | 保留在 API skill，定义单文件/项目惯例拆分语义 |
| `confirmPlacement` 没有实际门禁 | 删除，改用 output plan reviewStatus 和 preflight |
| guard 可跳过、非 Git 环境静默失效 | 删除 guard；CLI 内部直接限制允许写入路径 |
| path 检查只验证 basename | canonicalize 并校验允许根目录 |
| from-openapi/generate 会静默覆盖人工内容 | 实施 no-clobber、hash 检查和显式 force |
| Mockoon 三场景/列表数量只在默认生成时存在 | preflight 校验 effective policy 和场景完整性 |
| API/Mock 文档宣称范围超过实现 | skill description 明确支持边界，unsupported 输入产生 diagnostic |
| 源码、bundle 和已安装版本可漂移 | 同 PR bundle、CI diff 校验和独立版本测试 |

## Skill 文档设计

### `mockoon-gen/SKILL.md`

目标长度约 80 到 100 行，只保留：

- 适用场景和不适用场景。
- OpenAPI、mock artifact 和派生输出的 source-of-truth。
- page directory 确认门禁。
- loose docs 到 reviewed OpenAPI 的流程。
- draft artifact、人工 review、target validate 和 export。
- Mockoon/Whistle target 的最小 readiness 条件。
- Whistle format 仅在导出时选择。
- 最少命令示例。

删除：

- API code、DTO、VO、mapper、sync 和 guard 说明。
- 多处重复的 output semantics 和 review rules。
- 同时运行两种 Whistle export 的示例。
- 可由 CLI 确定推导的 matcher 细节。
- README 已覆盖的安装和用户指导内容。

Whistle pattern 背景和故障排查移到：

```text
skills/mockoon-gen/references/whistle-patterns.md
```

正常生成不必读取该 reference；只有匹配异常或新增 pattern 能力时才读取。

### `api-code-gen/SKILL.md`

保留：

- 只接受 reviewed OpenAPI。
- page directory 和输出位置确认。
- draft API artifact review。
- DTO 正确性与 VO/mapper 不确定性处理。
- `splitApiOutput=true` 时检查项目既有 API 目录和 export 惯例。
- 找不到明确惯例时暂停并询问用户。
- output plan confirmed 后才 generate。
- 不支持 reverse sync。

项目目录识别细节可放入 reference，避免核心 skill 每次加载全部说明。

两个 skill 的 frontmatter description 只负责发现，不包含完整工作流摘要。

## 测试策略

### 共享 OpenAPI Reader

- YAML/JSON 读取。
- 非对象、缺 openapi、缺 paths、非法 path item。
- hash 稳定性。
- 文件路径归一化。
- parser diagnostic 不包含目标业务规则。

### Mock Artifact 与生成器

- `0.3.0` schema 接受新结构并拒绝旧 API code 字段。
- schema 中不存在 `sourcePattern` 和 `targetPath`。
- static/dynamic Whistle rule 推导。
- 多 path param 按顺序生成 `$1...$n`。
- host-only、group、port 和 endpoint reference 校验。
- JSON/CJS format 分支及固定输出文件。
- 不生成 `Default` group。
- success、empty、error 场景门禁。
- list itemCount 为 10、20、30 的输出。
- list policy disabled。
- 多 top-level array property 产生 needsReview。
- numeric/boolean/enum/string 模板类型。

### API Code Artifact 与生成器

- `0.1.0` schema 不包含 mock 字段。
- 单文件 plan。
- 拆分 plan 的 endpoint 完整覆盖、重复检测和未知 endpoint 检测。
- project 既有目录 plan 被 artifact 固化，CLI 不自行扫描。
- index file 导出全部模块。
- output plan pending 时 generate 拒绝。
- transformResponse true/false 真正影响输出。
- 现有 DTO、VO、mapper、path param 和 request function 测试迁移后保持通过。
- sync command 不再出现在 CLI help。

### 统一 Preflight 与安全

- export/generate 无法绕过 preflight。
- 开放 fatal/needsReview 阻塞，warning 不阻塞。
- imported OpenAPI 不自动 confirmed。
- OpenAPI hash drift 阻塞所有正式输出。
- `init` 已存在配置时不修改。
- `from-openapi` 相同 hash no-op、不同 hash 拒绝、force 显式替换。
- 输出相同 no-op、不同拒绝、force 显式替换。
- project 外绝对路径、`..` 和 symlink escape 被拒绝。
- 多文件输出发生任一冲突时零部分写入。
- 旧 `0.2.0` artifact 被明确拒绝且原文件不变。

### Skill 行为测试

使用原始用户请求和原始项目材料，不提前告诉测试 Agent 预期结论。覆盖：

- page directory 不明确。
- loose docs 尚未 review。
- Whistle format 尚未选择，但用户只要求生成 artifact 或 Mockoon。
- 用户催促跳过 review。
- OpenAPI 已变化。
- 现有 artifact 包含人工修改。
- `splitApiOutput=true` 且项目有明确 API 目录惯例。
- `splitApiOutput=true` 但项目没有明确惯例。
- 用户提供现有 TypeScript API 文件给 `api-code-gen`。
- 用户试图让 `mockoon-gen` 生成 API code。

行为测试验证 Agent 的实际动作、文件 diff、CLI 结果和停止点，而不是只检查回答措辞。

## Bundle、版本与发布

版本规划：

- `mockoon-gen` CLI：`0.2.0`
- `mock-artifact` schema：`0.3.0`
- `api-code-gen` CLI：`0.1.0`
- `api-code-artifact` schema：`0.1.0`

发布要求：

- 源码变更的同一个 PR 中生成并提交对应 skill bundle。
- CI 从源码重新 bundle，并执行 `git diff --exit-code`；存在差异即失败。
- 不再在 main 合并后另开 automation PR 才同步 bundle。
- CI 分别运行两个 package 的 unit、CLI、e2e 和 typecheck。
- CI 分别执行两个 skill bundle 的 `--help` 和 `--version`。
- CLI help 必须与 spec 的命令集合一致。
- package version、bundle version 和 skill release metadata 必须一致。
- 两个 skill 独立安装和升级；更新一个 skill 不要求更新另一个。

## 实施顺序

1. 创建最小 `openapi-reader`，迁移共享读取与 hash 测试。
2. 创建 `api-code-gen-cli` 和 `api-code-gen` skill，迁移现有 API code generator。
3. 实现 `api-code-artifact` 0.1.0、单文件 plan 和拆分 plan。
4. 从 `mockoon-gen` 删除 API code、sync、guard 和相关配置/schema。
5. 实现 `mock-artifact` 0.3.0 和旧 schema 拒绝行为。
6. 将 Whistle matcher 改成从 endpoint 唯一推导，并延迟 format 选择。
7. 实现 mock policy 和列表 itemCount。
8. 实现两个 CLI 的统一 preflight、no-clobber 和 canonical path 安全。
9. 修复 OpenAPI provenance、2xx response 选择和 mock JSON 类型。
10. 精简 `mockoon-gen` 文档并新增 `api-code-gen` 文档。
11. 更新 bundle workflow、版本和一致性校验。
12. 完成负向测试、e2e 和 skill 行为测试。

## 验收标准

### Mockoon Gen

- `mockoon-gen` CLI help 不再包含 generate、sync 或 guard。
- 未选择 Whistle format 时可以 init、from-openapi、validate mockoon 和 export mockoon。
- `export whistle` 必须显式指定 json 或 cjs。
- 新 artifact 不含 API code、VO、mapper、sourcePattern 或 targetPath。
- Whistle 动态 route 在不读取派生副本的情况下正确生成 capture。
- list itemCount 可以通过 config 默认值进入 artifact，并由 artifact 决定输出。
- 所有 export 都不能绕过 readiness。

### API Code Gen

- 新 skill 只消费 reviewed OpenAPI。
- API code artifact 不含 mock/Whistle/Mockoon 字段。
- 现有可支持的 API code 生成行为迁移后保持可用。
- sync command 不存在。
- 单文件和项目惯例拆分计划均被 CLI 确定性执行。
- 项目惯例不明确时 skill 不猜测输出结构。

### 安全与一致性

- 重复 init/from-openapi 不会静默丢失用户修改。
- 路径逃逸和 symlink escape 被拒绝。
- 不同内容的派生输出不会被静默覆盖。
- 旧 artifact 不被自动迁移或删除。
- OpenAPI provenance 不再自动 confirmed。
- 开放 review item 可以阻止实际 export/generate。
- 源码与两个 bundle 在 CI 中保持字节级可重建一致性。

## 后续设计候选

以下能力明确不属于本 spec 的实施范围，需要未来单独设计：

- 旧 artifact 到两个新 artifact 的辅助迁移工具。
- OpenAPI 变化后的 review-preserving refresh/merge。
- 完整 `$ref` 和组合 schema 解析。
- request body、query、header 和错误响应 API code。
- 项目级 request adapter 模板。
- AST 驱动的安全 round-trip 编辑；如果重新考虑该能力，应作为独立功能设计，不能恢复当前正则 sync。
- 自定义 Whistle matcher override。
