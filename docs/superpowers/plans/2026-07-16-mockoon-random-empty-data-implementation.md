# Mockoon 随机长度与空数据实施计划

## 1. 扩展配置与 CLI 入口

修改 `packages/mockoon-gen-cli/src/artifact/types.ts`、`schema.ts` 和 `cli.ts`：

- 在 `policies` 下加入 `randomEmptyData` 布尔值，默认 `false`，并保持 `schemaVersion` 为 `0.3.0`，使旧 artifact 在读取时自动采用关闭状态。
- `from-openapi` 加入显式 `--random-empty-data` 参数；它是无交互 CLI 的确定性开关。
- 在 `skills/mockoon-gen/SKILL.md` 的 `from-openapi` 前加入硬性询问步骤：Agent 必须先询问用户是否开启随机空数据模式，再根据确认结果决定是否传该参数。
- 添加 CLI 与 schema 测试，验证默认关闭、显式开启、重新渲染时保留开关。

## 2. 集中实现标量边界渲染

重构 `packages/mockoon-gen-cli/src/artifact/from-openapi.ts` 的 `render` 相关逻辑为小型、可测试的值模板构造函数：

- 读取 `minLength`、`maxLength`、`minimum`、`maximum`，并做数值类型与区间规范化。
- 未声明字符串长度时，生成可取 `0` 到 `20` 的表达式；指定边界时优先采用 OpenAPI 约束。
- 未声明整数范围时，生成覆盖负数、`0`、正数的区间；显式范围时使用声明范围，并妥善处理安全整数限制。
- 保持 `format > semanticMappings > string.sample` 的 Faker 方法选择顺序，只将长度参数包装到最终字符串调用。
- 删除或复用 `openapi/mock-support.ts` 中重复的默认模板规则，避免两个入口的边界策略分叉。

## 3. 实现随机空数据模板

在同一渲染层以 `policies.randomEmptyData` 为输入生成可解析的 Mockoon 模板：

- 标量在正常值和 `null`（字符串另包含空串）之间进行随机选择。
- 数组在正常内容和 `[]` 之间选择；对象在正常属性集合和 `{}` 之间选择。
- 对象字段省略仅在能够由 Mockoon 模板在逗号处理正确、且生成结果始终为有效 JSON 时实现；否则使用 `null`，并以针对该限制的测试锁定行为。
- `success-empty` 继续保持现有确定性空数组语义，不把随机空数据模式混入该场景；`success-default` 与列表成功场景承担随机值与随机空态。
- `refreshMockArtifactTemplates` 将保留 `policies.randomEmptyData`，确保从 artifact 重建时输出一致。

## 4. 覆盖测试与打包验证

扩展 `tests/artifact/from-openapi.test.ts`、`tests/openapi/mock-support.test.ts`、`tests/cli/cli.test.ts` 与 `tests/cli/e2e.test.ts`：

- 断言字符串 `0`、`1`、`20` 的默认/显式长度边界表达式。
- 断言整数默认范围、负数、`0` 和安全整数极值，以及显式上下限优先。
- 断言 `null`、空串、空数组、空对象与（若安全实现）省略字段对应的模板分支。
- 使用 Mockoon 支持的 Faker/模板语法做可执行或集成验证，确保生成 JSON 不会因条件分支而失效。
- 运行 `pnpm --filter mockoon-gen test`、`pnpm --filter mockoon-gen typecheck`、`pnpm --filter mockoon-gen build` 和 `pnpm --filter mockoon-gen bundle`，最后执行生成的 `skills/mockoon-gen/bin/mockoon-gen.mjs` 的端到端测试。
