# Mockoon Faker 语义映射设计

## 目标

让 Mockoon 成功响应中的字符串字段能够使用与业务语义匹配的 Faker.js 表达式，而不是一律输出 `string.sample`。推断由外部大模型完成，决策直接存储在已有的 `mock-artifact.json` 中；Mockoon 导出阶段不调用模型，因此输出可复现。

## 范围

- 支持 OpenAPI 字符串字段的 `format` 约束和 artifact 内的语义映射。
- 支持中英文、任意业务领域的字段名：模型可利用字段路径、名称、标题、描述和结构上下文做判断。
- 同一映射必须一致地应用于默认成功场景和列表成功场景。
- 保留现有未映射字段的安全回退行为。

不在本次范围内：内置模型调用、API Key 管理、单独的模型决策文件、复制 Faker.js 官方文档到仓库。

## Artifact 扩展

在每个 endpoint 的 `mock` 对象中增加可选的 `semanticMappings`：

```json
{
  "semanticMappings": [
    {
      "path": "data.items[].productName",
      "faker": "commerce.productName"
    }
  ]
}
```

`path` 是相对于成功响应根对象的稳定字段路径；对象字段使用 `.`，数组项使用 `[]`。`faker` 是不带 Mockoon 花括号的 Faker.js 方法路径。

不新增字段级或全局状态：

- `semanticMappings` 缺少某个路径，表示该字段没有模型决策。
- `faker: "string.sample"` 表示模型明确确认使用通用字符串。
- 现有 `openapi.reviewStatus` 与 `reviewItems` 继续承担全局 OpenAPI 审阅和异常追踪职责。

## 渲染优先级

渲染器针对每个字符串字段按以下顺序选择表达式：

1. OpenAPI `format` 的确定性映射；它是硬约束，优先于 artifact 语义映射。
2. 与字段路径精确匹配的 `semanticMappings[].faker`。
3. `string.sample`。

顶层字符串没有字段路径时，仍先使用 `format`，否则回退。数字、布尔、枚举、对象、数组和现有错误/空响应的行为保持不变。

## 模型协作流程

1. 调用方从 artifact 的 `openapi.file` 读取原始 OpenAPI，并将字段路径、字段名、`title`、`description`、`format`、父对象名称和相邻字段提供给模型；这些上下文不复制进 artifact。
2. 外部大模型只修改同一份 artifact 的 `semanticMappings`，填写已验证的 Faker.js API。
3. 新增 `render-templates` CLI 动作，从 artifact 记录的 OpenAPI 文件和语义映射重新渲染所有成功场景模板。该名称明确表示它更新的是 artifact 内已物化的 `bodyTemplate`，而非刷新最终 `mockoon.json`。
4. 导出 Mockoon 前继续运行既有校验；未映射字段不阻塞导出，无效 `faker` 值则报出定位到 mapping 的诊断。

模型输出不直接修改 `bodyTemplate`。这确保默认场景、列表场景与嵌套数组中的同一字段始终采用相同的表达式。

## 校验与安全性

- 仅允许安全的 Faker.js 方法路径语法（`module.method`）；不维护狭窄的本地 API 白名单，以便模型可使用 Faker.js 的完整 API。
- `format` 值使用固定映射，例如 `email`、`uuid`、`date-time`、URL/IP 等；模型不能覆盖这些约束。
- `semanticMappings` 的路径必须指向字符串字段；不存在、重复或非字符串路径都产生可定位的校验错误。方法是否存在由 Mockoon 运行模板时最终解析。
- artifact 模式保持严格校验，防止未知字段悄然写入。

## 测试

- `format` 覆盖语义映射，包括 `id` 加 `format: email` 的场景。
- 英文和中文字段路径均可由模型写入同一种映射结构。
- 嵌套对象、顶层数组和对象内列表场景能一致地使用同一映射。
- 缺失映射回退 `string.sample`，显式 `string.sample` 被接受。
- 非法 API、重复路径、错误路径和非字符串字段映射均被拒绝。
- 重建 CLI 和实际 `skills/mockoon-gen/bin/mockoon-gen.mjs` 的端到端输出覆盖。
