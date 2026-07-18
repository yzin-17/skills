# mockoon-gen 基础类型语义映射设计

## 背景

当前 `mockoon-gen` 只接受字符串字段的 `semanticMappings`。数值型时间戳即使字段名为 `batchDate`、`createdAt`，也会生成无边界的 `number.int`，既不能表达时间戳语义，也可能得到不现实的值。

## 目标与范围

将成功 JSON 响应中的语义审查范围从字符串扩大到所有基础类型：`string`、`integer`、`number`、`boolean` 以及带日期语义的字段。映射必须同时遵守字段含义与 OpenAPI 类型。

本次不改变数组、对象、枚举和组合 schema 的现有策略，不自动从字段名创建或写回映射；语义决策仍由使用技能的模型明确写入 artifact。

## Artifact 契约

`mock.semanticMappings` 的条目扩展为以下形态：

```json
{
  "path": "batches[].batchDate",
  "faker": "number.int",
  "args": {
    "min": 0,
    "max": 1893456000000
  }
}
```

`args` 为可选字段，其值为 JSON 基础值；数值型 Faker 映射仅接受有限数值的 `min`、`max`。路径必须唯一，`faker` 继续限制为 `module.method`。渲染前将验证映射路径对应成功响应 schema 中的基础类型字段，并验证映射与字段类型相容。字段语义由路径、Faker 方法和参数表达，不额外存储冗余的 `meaning` 字段。

## 渲染规则

渲染优先级为：OpenAPI 明确约束（例如 `format`、`minimum`、`maximum`）与显式语义映射共同生效；映射提供的 Faker 和参数覆盖默认 Faker，但不得绕过 OpenAPI 的类型约束。

- `string`：继续使用字符串模板并正确转义；映射参数仅在受支持的字符串 Faker 上应用。
- `integer`：使用 `number.int`。显式 `args.min/max` 生效，并与 OpenAPI `minimum/maximum` 合并为有效边界。
- `number`：使用数值模板；不得因为语义映射被渲染为字符串。
- `boolean`：使用 `datatype.boolean`；仅接受与布尔类型兼容的映射。
- 数值型 Unix 毫秒时间戳：使用 `number.int min=0 max=1893456000000`。`0` 对应 1970-01-01T00:00:00Z，最大值对应 2030-01-01T00:00:00Z。

类型不匹配、无效参数或未知路径均以明确错误拒绝，避免悄然产生错误模板。

## 时间戳告警

对于字段名、路径、标题或描述明显表示日期/时间的 `integer` 或 `number` 字段，若最终使用无约束的 `number.int`，生成 artifact 时新增开放 `warning` 审阅项。消息说明字段看起来是时间戳但没有现实的最小/最大范围，并建议添加 OpenAPI 边界或带 `min/max` 的语义映射。

含有合理 `min/max` 数值映射或 OpenAPI 边界的字段不产生该告警。名称语义不明确的普通数值字段不告警。

## 技能说明

`SKILL.md` 要求在渲染或导出前审查每个成功 JSON 响应 schema 的所有基础类型字段。说明映射的 `args`、`meaning` 格式、数值时间戳示例、类型约束和未约束时间戳告警；同时把渲染优先级更新为适用于所有基础类型。

## 测试与验收

- schema 测试覆盖 `args`、`meaning`、重复路径、无效 Faker、无效数值范围。
- 生成测试覆盖嵌套数组中的 `batchDate` 映射，断言所有成功和列表场景使用 `number.int min=0 max=1893456000000`。
- 覆盖字符串、整数、数值、布尔映射的类型正确渲染与类型不匹配拒绝。
- 覆盖日期语义数值字段的无约束 warning，以及带边界或映射时不产生 warning。
- 运行包级 typecheck、测试与 bundle，确认发布的 `skills/mockoon-gen/bin/mockoon-gen.mjs` 同步支持该契约。
