# API Mockgen Skill 与 CLI 设计

## 目标

构建一个低侵入的前端 API mock 提效流程，把接口文档转换成可审查、可生成、可交接的 API 契约和 mock 配置。

这个方案由两部分组成：

- Codex skill：处理不确定、需要人工参与的工作，比如阅读松散接口文档、生成 OpenAPI、建议 VO 字段、标记待确认项。
- 确定性 CLI：处理可重复生成的工作，比如 TypeScript API 代码、OpenAPI 文件、whistle 规则、Mockoon 环境文件。

整体采用 artifact-first 架构。生成代码和 mock 文件都是派生产物，不是唯一事实来源。

## 设计目标

- 将松散接口文档和半结构化导出转换成 OpenAPI。
- 生成前端请求代码，并支持 DTO、VO、可选 mapper 防腐层。
- DTO 表达后端原始契约，VO 表达前端视图模型。
- 生成 whistle 使用的 `txt` 规则文件，把接口请求转发到 Mockoon。
- 生成 Mockoon JSON，body 使用 Mockoon 支持的模板语法，并覆盖多种测试场景。
- 尽量降低项目侵入；代码位置、host、转发路径、Mockoon 端口等都由人工或项目配置确认。
- 生成结构化 `api-artifact.json`，供其他 skill 或人工在代码生成前 review。
- OpenAPI 变化后能检测 artifact 是否过期。

## 非目标

- MVP 不生成 MSW、Express、Vite mock handler 等额外 mock runtime 代码。
- 不强制把生成的 API 代码放进某个固定项目目录。
- 不从 proxy chain 推断最终网络事实。
- 不把低置信度的大模型猜测当成已确认业务逻辑。

## 推荐方案

采用 artifact-first 的双层架构。

skill 处理不确定输入。它读取 Markdown、飞书/语雀复制文本、旧 Swagger、Apifox、YApi、Postman 导出等内容，生成 OpenAPI 和 `api-artifact.json` 草案。

CLI 处理确定性生成。它读取 OpenAPI 或 `api-artifact.json`，导出代码、mock 文件和校验报告。

OpenAPI 是后端接口契约。`api-artifact.json` 是前端协作契约。生成文件都是派生产物。

如果 OpenAPI 与 `api-artifact.json` 在后端 DTO 结构上冲突，以 OpenAPI 为准。CLI 应拒绝过期或冲突的 artifact，而不是静默合并或覆盖后端契约字段。

当 OpenAPI 由 skill 从松散文档生成时，严格生成前必须先人工 review OpenAPI。否则流水线会把未确认的大模型理解放大成稳定后端契约。

## 架构

### Skill 智能层

skill 负责：

- 解析松散或半结构化接口文档。
- 生成 OpenAPI 3.x。
- 创建 `api-artifact.json` 草案。
- 建议 VO 字段和 mapper 规则。
- 将不确定的枚举、字段含义、输出位置、host、路径、端口、header 标记为待确认项。
- 与页面代码生成 skill 或人工协作，确认最终 VO 和 mapper。

skill 可以使用大模型做理解，但必须把不确定性保留在 artifact 中，不能偷偷把猜测写成事实。

### Artifact 协议层

`api-artifact.json` 是稳定交接格式，连接：

- API 文档转换 skill。
- CLI 生成器。
- 前端页面生成 skill。
- 人工 review。

它保存 source 列表、endpoint 元信息、DTO/VO 建议、mapper steps、mock 场景、输出配置、source hash、schema migration 信息和 review items。

OpenAPI 派生字段必须携带足够 provenance，让 CLI 能检测漂移。至少需要保存 OpenAPI 文件路径和内容 hash。

### CLI 生成层

CLI 必须是确定性的。同一个 artifact 和配置应生成同样的输出。

CLI 输出：

- `openapi.yaml` 或 `openapi.json`
- 默认 `api.generated.ts`，或由人工/项目配置确认的自定义路径
- `whistle.txt`
- `mockoon.json`
- 校验报告

CLI 不做业务语义猜测。它可以生成草稿和待确认项。

## 默认目录结构

默认结构只是建议，不是强约束：

```text
.mockgen/
  api-artifact.json
  openapi.yaml
  mockoon.json
  whistle.txt

src/api/generated/
  api.generated.ts
```

项目可以覆盖这些路径。生成 API 代码是独立放置，还是与现有 API 代码放在一起，由人工或项目配置决定。

## CLI 命令

初始命令形态：

```bash
mockgen init
mockgen from-openapi ./.mockgen/openapi.yaml
mockgen generate --from .mockgen/api-artifact.json
mockgen export whistle
mockgen export mockoon
mockgen validate
```

松散文档解析属于 skill 工作流，不属于确定性 CLI。CLI 只接受 OpenAPI、`api-artifact.json` 等结构化输入。`generate`、`export`、`validate` 应保持确定性。

常用参数：

```bash
mockgen generate --api-output src/api/generated/api.generated.ts
mockgen export mockoon --mockoon-port 3100
mockgen export whistle --mockoon-port 3100
mockgen validate --strict
```

## 配置

示例配置：

```ts
export default {
  artifactDir: ".mockgen",
  openapiFile: ".mockgen/openapi.yaml",
  mockoonFile: ".mockgen/mockoon.json",
  whistleFile: ".mockgen/whistle.txt",
  apiOutput: "src/api/generated/api.generated.ts",
  splitApiOutput: false,
  transformResponse: true,
  mockoonPort: null,
  confirmPlacement: true
};
```

配置可以提供默认值，但 artifact 中仍需记录关键值是推断、人工确认还是待确认。

## Artifact Schema 草案

简化结构：

```json
{
  "schemaVersion": "0.2.0",
  "sources": [
    {
      "id": "src-001",
      "type": "url | file | text | export",
      "uri": "https://example.com/api-docs/user",
      "title": "用户模块接口文档",
      "sha256": "source-content-hash",
      "retrievedAt": "2026-07-07T10:00:00+08:00",
      "origin": "imported | generated | inferred | manual",
      "reviewStatus": "unreviewed | needs-change | confirmed"
    }
  ],
  "openapi": {
    "file": ".mockgen/openapi.yaml",
    "sha256": "openapi-content-hash",
    "origin": "generated | imported | manual",
    "reviewStatus": "unreviewed | needs-change | confirmed"
  },
  "reviewItems": [
    {
      "id": "review-001",
      "severity": "fatal | needsReview | warning",
      "scope": "global | openapi | endpoint | field | mapper | mock | output",
      "path": "endpoints[0].vo.fields[0]",
      "message": "status 枚举含义不明确",
      "suggestion": "确认 1/0 是否表示启用/停用",
      "proposedChange": {
        "path": "endpoints[0].mapper.steps[1]",
        "value": {}
      },
      "resolutionStatus": "open | resolved | ignored",
      "resolvedBy": "human | page-skill | api-skill",
      "resolvedAt": null
    }
  ],
  "endpoints": [
    {
      "id": "ep-get-user-list",
      "operationId": "getUserList",
      "method": "GET",
      "path": "/api/users",
      "summary": "用户列表",
      "origin": "generated | imported | inferred | manual",
      "reviewStatus": "unreviewed | needs-change | confirmed",
      "dto": {
        "request": "GetUserListRequestDTO",
        "response": "GetUserListResponseDTO"
      },
      "vo": {
        "name": "UserListVO",
        "owner": "page-skill | human | api-skill",
        "origin": "generated | inferred | manual",
        "reviewStatus": "unreviewed | needs-change | confirmed",
        "fields": [
          {
            "name": "displayName",
            "type": "string",
            "sources": [
              {
                "path": "response.body.first_name",
                "role": "firstName"
              },
              {
                "path": "response.body.last_name",
                "role": "lastName"
              }
            ],
            "confidence": "high | medium | low",
            "origin": "inferred",
            "reviewStatus": "unreviewed | needs-change | confirmed",
            "description": "用户展示名",
            "reason": "由 first_name 和 last_name 组合成视图展示字段"
          }
        ]
      },
      "mapper": {
        "name": "toUserListVO",
        "enabled": true,
        "origin": "generated | inferred | manual",
        "reviewStatus": "unreviewed | needs-change | confirmed",
        "steps": [
          {
            "id": "step-001",
            "order": 1,
            "operation": "concat | rename | enum-label | date-format | amount-unit | default-value | assign | custom",
            "inputs": [
              "response.body.first_name",
              "response.body.last_name"
            ],
            "output": "$displayName",
            "params": {
              "separator": " "
            },
            "description": "组合用户姓名",
            "confidence": "high | medium | low",
            "reviewStatus": "unreviewed | needs-change | confirmed"
          },
          {
            "id": "step-002",
            "order": 2,
            "operation": "assign",
            "inputs": ["$displayName"],
            "output": "vo.displayName",
            "params": {},
            "description": "写入 VO 字段",
            "confidence": "high",
            "reviewStatus": "unreviewed | needs-change | confirmed"
          }
        ]
      },
      "mock": {
        "origin": "generated | inferred | manual",
        "reviewStatus": "unreviewed | needs-change | confirmed",
        "selection": {
          "mode": "random | query | header | manual",
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
            "reviewStatus": "unreviewed | needs-change | confirmed",
            "enabled": true
          }
        ]
      },
      "reviewItems": []
    }
  ],
  "outputs": {
    "apiCode": {
      "suggestedFile": "src/api/generated/api.generated.ts",
      "placement": "pending-confirmation",
      "integrationMode": "standalone",
      "transformResponse": true,
      "lastGeneratedSha256": "generated-file-content-hash",
      "origin": "generated | manual",
      "reviewStatus": "unreviewed | needs-change | confirmed"
    },
    "whistle": {
      "file": ".mockgen/whistle.txt",
      "routes": [
        {
          "endpointId": "ep-get-user-list",
          "operationId": "getUserList",
          "method": "GET",
          "apiHost": "pending-confirmation",
          "sourcePath": "/api/users/{id}",
          "sourcePattern": "/api/users/*",
          "targetPort": 3100,
          "targetPath": "/api/users/:id",
          "origin": "generated | inferred | manual",
          "reviewStatus": "unreviewed | needs-change | confirmed"
        }
      ]
    },
    "mockoon": {
      "file": ".mockgen/mockoon.json",
      "port": "pending-confirmation",
      "defaultHeaders": {
        "Content-Type": "application/json; charset=utf-8"
      },
      "origin": "generated | inferred | manual",
      "reviewStatus": "unreviewed | needs-change | confirmed"
    }
  }
}
```

重要网络决策都在 route 级别。`apiHost` 属于每条 whistle route，因为不同接口可能请求不同 host。

artifact 统一使用 `origin` 和 `reviewStatus` 表达来源与 review 状态：

- `origin` 表示这个节点怎么来的，可取 `generated`、`inferred`、`imported`、`manual`。
- `reviewStatus` 表示这个节点是否已 review，可取 `unreviewed`、`needs-change`、`confirmed`。

人工 review 后，如果内容无需修改，应把对应节点标为 `confirmed`。如果需要修改，应把节点标为 `needs-change`，并通过 `reviewItems` 指明问题位置、建议改法和状态。修改完成后，对应 `reviewItem.resolutionStatus` 改为 `resolved`；如果明确接受风险，则改为 `ignored` 并保留原因。

`sources` 使用数组而不是单个 `source`，因为接口文档可能来自多个文件、链接、粘贴文本或平台导出。链接来源应记录 `uri`、`retrievedAt` 和 `sha256`，避免远端内容变化后无法追踪。

artifact 还应配套 JSON Schema，用于校验枚举值、必填字段、review item 结构、VO field source 结构、mapper step 结构、mock scenario 结构和 route 级 whistle 字段。

artifact schema 变化时应尽量自动 migrate。如果 migration 会丢信息，CLI 应以 `fatal` 停止，并说明需要人工处理的字段。

## DTO、VO、Mapper 与 API 代码

DTO 表达后端接口契约，必须严格由 OpenAPI 生成。

VO 表达前端视图模型，可以由 API mockgen skill、页面代码生成 skill 或人工建议。

VO 字段的 `sources` 必须支持多个来源。简单字段可以只有一个来源；组合字段可以引用多个 DTO 路径，并通过 `role` 说明每个来源在视图字段中的作用。

Mapper 是 DTO 到 VO 的防腐层，负责：

- 字段重命名。
- 枚举值转展示文案。
- 日期时间格式化。
- 金额和单位转换。
- 空值和默认值兜底。
- 已确认的结构拍平或聚合。

Mapper 使用有序 `steps`，不再使用无序 `rules`。每个 step 通过 `order` 表达执行顺序，通过 `inputs` 和 `output` 表达数据流。`$xxx` 表示中间产物，`vo.xxx` 表示最终 VO 字段。

`operation` 保持枚举，方便 CLI 稳定生成。人工 review 时可以用自然语言描述复杂转换，但自然语言应放在 `description` 或 `params` 中；如果无法结构化，`operation` 使用 `custom`，并把表达式、说明和待确认项写清楚。

API 函数可根据 `transformResponse` 返回 VO 或 DTO。

当 `transformResponse` 为 `true` 时，API 函数请求 DTO，并通过 mapper 转成 VO 后返回。当 `transformResponse` 为 `false` 时，API 函数直接返回 DTO，同时仍导出 VO/mapper 建议，供页面阶段确认。

示例：

```ts
export interface UserDTO {
  id: number;
  user_name: string;
  status: number;
}

export interface UserVO {
  id: number;
  name: string;
  statusText: string;
}

export function toUserVO(dto: UserDTO): UserVO {
  return {
    id: dto.id,
    name: dto.user_name,
    statusText: dto.status === 1 ? "启用" : "停用"
  };
}

export async function getUser(): Promise<UserVO> {
  const dto = await request<UserDTO>("/api/user");
  return toUserVO(dto);
}
```

如果枚举含义或展示字段不明确，artifact 应记录 review item。生成器可以输出保守 mapper 或显式 `needsReview` 标记，但不能把低置信度业务语义硬编码成已确认逻辑。

## API 代码输出策略

默认输出单个 `api.generated.ts`。这能降低项目侵入，也方便 review。

DTO、VO、mapper、API 函数是否拆分成多个文件，应作为可选项目配置。

代码位置不由工具单方面决定。artifact 只记录建议位置和确认状态。

生成文件应包含 generated-file header 和内容 hash。如果用户修改了 `api.generated.ts`，CLI 应检测 hash mismatch，并把文件视为人工修改。默认行为是停止覆盖，并要求用户选择：保留当前编辑文件作为下一步来源、从 artifact 重新生成，或把手写代码移出生成文件。

这能保护用户的人工修改，同时保持严格生成的可重复性。strict 模式下，已被人工修改但未被 artifact 工作流接纳的生成文件是 `needsReview`。

MVP 不做 artifact 与人工修改 TypeScript 的字段级合并。用户需要为下一轮生成选择一个来源。

## Whistle 导出策略

whistle 输出为 `txt` 文件。

生成器只需要准确的 route 级字段：

- `endpointId` / `operationId`：引用对应 endpoint，便于从 whistle route 追溯到接口。
- `apiHost`：浏览器实际请求该接口时使用的 host。
- `sourcePath`：OpenAPI path template。
- `sourcePattern`：whistle-ready path pattern。
- `targetPort`：已确认的 Mockoon 端口。
- `targetPath`：Mockoon route path。

工具可以检查 Vite 配置、Webpack devServer proxy、package scripts、环境变量、nginx 配置、已有 whistle 文件等作为线索。但这些只是线索。如果 host 无法准确确定，whistle export 不应输出规则文件，而应报错说明缺少哪条 route 的 host。

artifact 不需要建模完整 proxy chain。具体 route 列表足够生成 whistle 规则。

规则草案形态：

```text
api.example.com/api/users http://127.0.0.1:3100/api/users
```

精确 whistle 语法应由专门 adapter 实现，并在真实项目中验证。

## Mockoon 导出策略

`mockoon.json` 由 OpenAPI 和 artifact mock scenarios 生成。

Mockoon 端口由人工确认或 CLI 参数传入，不能猜测。

Response body 应使用 Mockoon 支持的模板语法，并尽可能使用 Faker 风格动态值，而不是只生成静态 JSON。生成器必须以 Mockoon 实际模板语法为准，不能输出泛化的 Faker.js 调用。

每个接口在 schema 信息足够时应支持多个场景：

- `success-default`：常规成功响应。
- `success-empty`：空列表、空对象或无数据态。
- `success-boundary`：长文本、最大/最小数字、特殊字符、null、缺省可选字段。
- `error-business`：文档中定义的业务错误。
- `error-auth`：文档或全局配置暗示鉴权时生成 401/403。
- `error-server`：500 兜底错误。

场景选择属于 endpoint 级 `mock.selection`，不放在每个 scenario 里重复声明。MVP 应支持 Mockoon 随机响应，以及通过 query/header 参数选择响应，方便前端开发主动测试默认、空、边界和错误状态。

默认 response headers 包含 JSON content type：

```json
{
  "Content-Type": "application/json; charset=utf-8"
}
```

如果文档或项目配置暗示 auth、trace id、CORS、自定义 header，artifact 应先标记为待确认，再导出最终配置。

## 校验与错误处理

错误分三类。

`fatal`：

- OpenAPI 不合法。
- strict 模式下，由松散文档生成的 OpenAPI 尚未 review。
- artifact schema 不合法。
- OpenAPI 内容 hash 变化，artifact 已过期。
- 无法写输出文件。
- artifact schema 无法无损 migrate。

`needsReview`：

- VO 字段低置信度。
- mapper step 枚举含义不明确。
- API 代码位置未确认。
- 生成的 API 文件被人工修改，且尚未被 artifact 工作流接纳。
- Mockoon 端口未确认。
- route 级 `apiHost` 未确认。
- 自定义 header 需要人工确认。

`warning`：

- 字段缺少描述。
- mock examples 不完整。
- operation 命名不理想。
- 缺少可选错误响应。

`mockgen validate` 应输出清晰 review 清单。默认生成可以产出草稿；`--strict` 遇到 `needsReview` 应失败。

## 测试策略

MVP 测试应是确定性的，基于 fixture。

覆盖：

- Markdown 示例 fixture 到 OpenAPI 草案的快照测试。
- OpenAPI 到 artifact 的 schema 校验。
- artifact 到 `api.generated.ts` 的快照测试。
- artifact 到 `mockoon.json` 的结构校验。
- artifact 到 `whistle.txt` 的生成测试。
- 低置信度 VO 或 mapper 建议是否进入 `reviewItems`。
- `reviewItems` 是否能通过 `path` 定位到具体节点。
- 多来源 VO 字段是否能生成有序 mapper steps。
- endpoint 级 mock selection 是否能导出到 Mockoon。
- whistle route 是否能通过 `endpointId` 追溯到 endpoint。
- route 级 `apiHost` 缺失时是否阻止 strict whistle export。
- Mockoon 端口缺失时是否阻止 strict Mockoon 或 whistle export。
- OpenAPI hash 漂移是否导致 artifact 校验失败。
- 生成 API 文件被人工修改时是否触发覆盖保护。
- `transformResponse: false` 是否生成返回 DTO 的 API 函数。

LLM 输出应在测试中固定为 fixture。CI 不依赖实时模型行为。

## MVP 范围

MVP 支持最小可用闭环：

- skill 辅助 Markdown/text 接口文档生成 reviewed OpenAPI 3.x。
- OpenAPI 3.x 生成带 source hash、review items、migration metadata 的 `api-artifact.json`。
- 在必要信息确认后，由 `api-artifact.json` 生成单文件 TypeScript API 代码、route 级 whistle `txt`、Mockoon JSON。

Apifox、YApi、Postman、旧 Swagger 等半结构化导入器，可在 artifact 和 generator 路径稳定后作为 adapter 增加。

## MVP 决策

- 生成 API 函数默认使用项目提供的 `request` 函数。如果项目不能提供，则生成一个小型 adapter placeholder，并要求 strict 校验前确认。
- Mockoon body 生成先支持一个小而明确的模板子集：字符串、数字、布尔、日期、枚举、数组、空值、null、边界值。更完整的 Faker helper 覆盖放到 MVP 之后。
- whistle 由专门 adapter 生成。MVP adapter 只覆盖 route 级 host + path 转发到 Mockoon，并在至少一个真实项目中验证后再视为稳定。
- 页面生成阶段负责最终 VO 确认。API mockgen skill 可以建议 VO 和 mapper，但最终视图模型由页面代码生成 skill 或人工确认。
- 核心成功指标是生成字段中无需人工修改的比例。第一阶段目标是减少字段人工修改，而不是消灭所有 review。
