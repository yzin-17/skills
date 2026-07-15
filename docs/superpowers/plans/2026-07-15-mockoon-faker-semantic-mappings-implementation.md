# Mockoon Faker 语义映射实施计划

> 依据：[Mockoon Faker 语义映射设计](../specs/2026-07-15-mockoon-faker-semantic-mappings-design.md)

## 目标

允许外部大模型直接在 `mock-artifact.json` 的 endpoint 内填写字符串字段的 Faker.js 语义映射，并在不调用模型的情况下，稳定地重建所有成功场景的 Mockoon 模板。OpenAPI `format` 始终优先；没有映射时保持 `string.sample` 回退。

## 任务 1：定义最小 artifact 扩展并保证兼容

- [x] 在 `packages/mockoon-gen-cli/src/artifact/types.ts` 的 endpoint mock 类型中加入可选 `semanticMappings`。
- [x] 映射项只含 `path` 与 `faker`；不增加字段级状态，也不增加新的全局状态。
- [x] 在 `packages/mockoon-gen-cli/src/artifact/schema.ts` 中为映射项添加严格 Zod schema，并允许旧 artifact 缺少该字段。
- [x] 约束同一 endpoint 内路径唯一、路径和 Faker 方法非空；非法结构在读取 artifact 时被拒绝。
- [x] 为 schema 兼容、重复路径和严格模式补充测试。

## 任务 2：抽取可重建的成功模板渲染器

- [x] 在 `from-openapi.ts` 中扩展 schema 解析、字段路径追踪和响应模板渲染。
- [x] 渲染上下文携带当前 JSON 路径；对象属性追加 `.field`，数组元素追加 `[]`。
- [x] 字符串选择顺序固定为：`format` 映射、artifact 路径映射、`string.sample`。
- [x] 保持枚举、数值、布尔、对象、数组、空场景、错误场景和列表数量策略的既有语义。
- [x] 将外部模型给出的 `faker` 原样包装成 Mockoon 的 `{{faker '…'}}`，同时在一个集中校验器中验证方法路径符合安全的 `module.method` 语法；不维护狭窄的本地 API 白名单。

## 任务 3：生成与刷新 artifact

- [x] `from-openapi` 新建 artifact 时为每个 endpoint 写入空 `semanticMappings`，使模型有稳定的编辑位置。
- [x] 将 `refresh-templates` 更名为 `render-templates --from <artifact> --cwd <cwd>`：读取 artifact 指向的 OpenAPI，验证其 SHA-256 与 artifact 一致，并仅重渲染各 endpoint 的成功场景 body template。
- [x] 刷新时保留 endpoint 的 `semanticMappings`、场景选择配置、端口、Whistle 配置及已有审阅项；只替换自动生成的成功场景内容。
- [x] 若 OpenAPI 中 endpoint/路径已不再匹配 artifact，产生明确错误，要求用户重新执行 `from-openapi`，避免静默丢失模型决策。
- [x] 更新 CLI 命令列表和端到端测试。

## 任务 4：加入语义与约束测试

- [x] 测试 `format` 覆盖映射：`id` 字段设置 `format: email` 时必须生成邮箱。
- [x] 测试英文和中文路径，例如 `items[].productName` 与 `商品.名称`，均能使用模型填写的 API。
- [x] 测试嵌套对象、根数组及对象包裹列表的默认和多条成功场景一致应用映射。
- [x] 测试无映射回退、显式 `string.sample`、非法方法语法、重复路径、错误路径和映射到非字符串字段。
- [x] 断言刷新不会覆盖手动/错误场景以及 artifact 的输出配置。

## 任务 5：构建、验证与交付

- [x] 运行 `pnpm --filter mockoon-gen test`、`pnpm --filter mockoon-gen typecheck`、`pnpm --filter mockoon-gen build` 和 `pnpm --filter mockoon-gen bundle`。
- [x] 运行根目录 `pnpm test`、`pnpm typecheck` 与 `pnpm bundle`。
- [x] 使用渲染后的 artifact 导出 `mockoon.json`，断言 bundle 中已包含语义映射逻辑，且产物中存在预期 Faker 模板。
- [x] 复查工作区只包含本任务文件，提交源代码、测试、bundle 和中文文档。
