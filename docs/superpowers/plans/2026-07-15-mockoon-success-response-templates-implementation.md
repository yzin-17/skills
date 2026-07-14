# Mockoon 成功响应模板实施计划

> 依据：[Mockoon 成功响应模板设计](../specs/2026-07-15-mockoon-success-response-templates-design.md)

## 目标

让 Mockoon 成功响应基于 OpenAPI schema 生成随机模板数据；列表接口同时生成单条和多条成功场景；无法可靠推断时创建开放的 `needsReview` 项并阻止导出。

## 任务 1：扩展 OpenAPI schema 解析能力

- [x] 在 shared reader 类型中声明 `components.schemas`。
- [x] 新增本地 `$ref` 解析工具，支持 `#/components/schemas/<name>`。
- [x] 检测外部引用、缺失引用和循环引用，并返回可供审阅项使用的原因。
- [x] 为本地、嵌套、外部和循环引用编写测试。

## 任务 2：先编写成功响应 artifact 测试

- [x] 覆盖顶层 `string`、`number`、`integer`、`boolean`、枚举、对象和数组响应。
- [x] 覆盖对象属性和数组元素中的本地 `$ref`。
- [x] 断言数组和对象包裹列表各有单条成功场景与多条成功场景，且多条数量大于 1。
- [x] 断言缺 schema、未解析 `$ref`、循环引用和组合 schema 会创建开放的 `needsReview` 项。

## 任务 3：实现递归 Mockoon 模板生成

- [x] 将 artifact 创建函数改为接收完整 OpenAPI 文档，用于解析 schema 引用。
- [x] 递归生成对象、数组和基本类型的 JSON Mockoon 模板。
- [x] 保留枚举的原始 JSON 类型；数值与布尔值不加字符串引号。
- [x] 为根数组和对象中的列表分别生成单条与多条成功场景。
- [x] 将多条列表策略限制为大于 1；不满足时产生 `needsReview` 而非静默生成。

## 任务 4：接入审阅门槛

- [x] 将 schema 推断问题写入 artifact `reviewItems`，范围为 `endpoint`，状态为 `open`。
- [x] 复用既有 preflight 逻辑，使开放的 `needsReview` 阻止 Mockoon 导出。
- [x] 确保受支持的本地 `$ref` 和基本类型不会产生多余审阅项。

## 任务 5：验证与提交

- [x] 运行 shared reader 与 Mockoon 包的定向测试。
- [x] 运行 `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm bundle`。
- [x] 使用生成的 artifact 导出 Mockoon JSON，断言成功 body 含随机模板且列表有单条/多条场景。
- [x] 将完成项勾选并以单独提交交付。
