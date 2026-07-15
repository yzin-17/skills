# Mockoon 独立随机空数据响应设计

## 目标

开启随机空数据模式时，保留所有既有成功响应的契约型正常数据，并新增一个专门用于故障注入的随机空数据响应。调用方通过场景参数主动选择该响应，而默认调用行为不发生变化。

## 场景规则

- `success-default` 始终使用正常的数据渲染逻辑：字符串长度随机为 `0` 到 `20`，整数覆盖默认或 OpenAPI 声明的范围，但不生成 `null`、空对象或其他空态分支。
- `success-empty` 保持现有确定性空列表语义。
- `success-list-*` 保持正常的多条列表数据，不生成随机空态。
- 启用 `randomEmptyData` 时，额外生成 `success-random-empty`；其模板随机生成标量 `null`、空串、空数组、空对象等空态。
- 未启用该选项时，不生成 `success-random-empty`。

## 选择与兼容性

所有 endpoint 继续采用既有 `scenario` 查询参数选择机制，默认场景保持 `success-default`。因此未传参数的调用，以及已显式选择 `success-default`、`success-empty` 或 `success-list-*` 的调用，均与随机空数据功能加入前一致。

`randomEmptyData` 继续作为 artifact 的持久化策略。`render-templates` 必须依据该策略补充或更新 `success-random-empty`，同时不得改变人工维护的场景。

## 测试

- 开启模式后，断言默认、空列表、多条列表与随机空数据场景同时存在，且默认与列表模板不含随机空态分支。
- 断言随机空数据场景包含 `null`、空串、空数组和空对象分支。
- 关闭模式后，断言不存在 `success-random-empty`。
- 验证重新渲染、Mockoon 导出和打包后的 CLI 均保留场景名称与默认选择行为。
