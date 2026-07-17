# Mockoon Gen 合并交互选项设计

## 目标

将 `random empty-data` 与 Whistle 导出格式的确认合并为创建 mock artifact 前的一次交互，避免同一任务内向用户询问两次。

## 交互与数据流

在已明确页面目录和 OpenAPI 来源后、执行 `from-openapi` 前，Agent 必须在同一条消息中让用户明确选择：

- 是否启用 `random empty-data`；
- Whistle 导出格式：`json` 或 `cjs`。

用户的两个选择均只对当前任务有效。启用随机空数据时，`from-openapi` 继续传入 `--random-empty-data`；未启用时不传入该参数。Whistle 格式仍仅作为 `export whistle --format <json|cjs>` 的导出参数，不写入配置或 artifact。

## 约束与异常处理

不得从文件名、示例、既有文档或默认值推断 Whistle 格式。若一次交互中缺少任一明确选择，Agent 应补问缺失项，且不得继续相应的生成或导出步骤。实际导出 Whistle 时，只校验本任务已经确认的格式，不得重复询问。

Mockoon 导出不依赖 Whistle 格式选择；随机空数据保持现有的独立 `success-random-empty` 场景语义，不影响 `success-default`。

## 修改范围与验证

仅更新 `skills/mockoon-gen/SKILL.md`：将随机空数据确认与 Whistle 格式硬门槛合并为单一任务前置确认，并调整步骤编号与表述。无需修改 CLI、artifact schema 或测试，因为命令参数和产物格式不变。

验证方式是审阅 skill 指令，确认其中仅存在一次合并询问、格式仍要求显式选择、且导出命令仍保留 `--format <json|cjs>`。
