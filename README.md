# yzin skills

Yzin 的个人 skill 库，供 Codex 及其他支持 `SKILL.md` 的 agent 使用。仓库面向个人工作流优化，而非公开产品目录：skill 可以假设 yzin 偏好的工具、review 习惯与本地开发约定。仓库同时打包为 agent plugin（见 `plugin.json` 与 `.agents/plugins/marketplace.json`）。

## Skills

按触发方式分为两类：

- **自动触发**：请求内容匹配 skill 的 description 时，由 agent 自行激活。
- **手动触发**：仅在用户显式输入调用指令（`$<skill-name>`）时运行。这些 skill 在 `agents/openai.yaml` 中声明了 `policy: allow_implicit_invocation: false`，任务再复杂、再相关也不会自动激活。

### 自动触发

#### spec-driven-workflow

**用途**：为非平凡改动维护持久的 Spec 与任务文档契约：稳定验收标准、有界交付物、验证证据和一致性 review。

**适用场景**：

- 重构、迁移、多任务特性开发等需要稳定验收标准的非平凡改动。
- 实施中途发现验收边界漂移，需要重新规划任务而不推翻仍有效的证据。
- 不适用：一般文档、简单提问、常规低风险编辑、一行改动、明确免计划的工作。

**教程**（完整流程见 [SKILL.md](skills/spec-driven-workflow/SKILL.md)）：

1. 判断当前请求是纯文档工作还是包含实施。
2. 检查相关许可来源与现状约束，识别必须在实施前完成的环境检查或决策。
3. 选定 Spec 边界，创建带日期的 Spec 与关联任务文档。无仓库约定时使用 `docs/specs/YYYY-MM-DD-<task-id>.md` 和 `docs/tasks/<task-id>.md`；Spec 首建日期与文件名在后续修订中保持稳定。
4. 给验收标准分配稳定 ID，把每条实质性断言映射到实施负责人与充分的验证方式；本地证据不足时命名产品级 gate。
5. 规划有界交付物、真实依赖、可并行部分，以及多组件必须衔接时的早期真实语义集成路径。
6. 运行 planning preflight review，解决文档缺陷并报告真实阻塞。
7. 纯文档工作在 planning review 后停止；实施工作按 implementation 参考在已验证的依赖边界上执行，Blocking Question 只停受影响的工作。
8. 验收边界漂移时先更新 Spec（稳定契约），再重新规划受影响任务；保留需求、已有改动和仍有效的证据。
9. 声称完成前，先通过最终一致性 review。

#### codex-cost

**用途**：以小任务、新上下文、无冲突并行和最终统一 review 控制长任务的上下文累积。父代理负责需求、范围、关键决策、调度与最终验收；worker 负责有界执行和局部验证。Luna 调用成本按可忽略处理，不再为了省调用而维持长会话。

**适用门槛**：仅顶层非 Luna 编排者使用；任何模型的被委派 worker 都直接执行任务，不再触发本 skill 或创建子代理。父模型与推理设置沿用用户选择。

**适用场景**：大量代码阅读、跨文件实现、测试、调试、日志或浏览器验证。简单本地低风险修改、小分析或小文档改动仍可直接完成。先对整体任务判断一次委派收益，拆小后不再逐项重复判断；用户点名模型只约束委派时的选择。

**教程**（完整规则见 [SKILL.md](skills/codex-cost/SKILL.md)）：

1. 每个任务只保留一个可验证交付物和一个主要执行面，列出精确可写路径、稳定只读输入、依赖、共享资源及局部检查；边界模糊或写集重叠时继续拆分，不把数据库、API、客户端和整体验收塞进一个大任务。
2. 沿用用户指定模型、角色和推理档位；非视觉工作默认 Luna，前端视觉、布局、样式及视觉验收禁止交给 Luna。按当前角色配置解析实际模型与支持的推理档位，不写死模型版本。
3. 复用现有 spec/task 文档记录目标、约束、基线、写入归属、任务状态、产物和证据；共享清单只由父代理更新，worker 使用任务专属报告路径。新 worker 只读自身任务与必要依赖，不复制完整历史对话。
4. 每个任务新建 worker 上下文；依赖已满足且写集、资源不冲突的任务可并行，不再固定单 worker 上限。完成或安全交接后关闭对应线程；可以复用角色配置，不复用会话。无法确认禁止历史继承时报告限制，不冒充已隔离。
5. 同一文件只允许一个活跃写入者，即使修改不同行或使用不同 worktree；公共类型、锁文件、导出入口、生成文件和共享测试环境明确归属或隔离。共享契约先落实，产物进入下游工作区后才调度依赖任务；不能证明安全时，只串行冲突部分。
6. worker 完成局部自检后返回简短状态。父代理只检查状态、写入归属、必要证据和阻塞并继续调度，不逐份审查 diff 或重跑测试；失败依赖、契约变化及写入冲突立即暂停受影响任务。取消 worker 后确认写入停止再移交归属，不覆盖他人改动。
7. 全部实施产物集成后，新 worker 对记录下来的稳定状态执行必要集成/回归验证；父代理随后统一 review 真实改动、跨任务契约和最新证据。`worker_done` 不等于最终验收通过。
8. 最终 review 发现的问题拆成小修复任务，用全新 worker 按相同归属规则处理，修复批次完成后统一复核。检查未通过、验证缺失或仍有阻塞时不得声称整体完成。

### 手动触发

#### mockoon-gen

**触发方式**：显式调用 `$mockoon-gen`（`agents/openai.yaml` 已声明 `policy: allow_implicit_invocation: false`，请求内容匹配 description 也不会自动激活）。

**用途**：把松散的 API 文档或已 review 的 OpenAPI 转成页面本地的 Mockoon 与 Whistle mock 产物，覆盖 mock 产物 review、语义 Faker 映射、随机空数据模式、Mockoon 导出与 Whistle 转发规则（`json`/`cjs`）。

**适用场景**：

- 后端接口未就绪时，前端需要按契约生成页面级 mock 数据与代理规则。
- 手里只有松散接口文档，需要先规范化为 OpenAPI 并经过人工 review 再生成。
- 联调阶段需要生成 Whistle 转发规则（`json` 或 `cjs` 格式二选一）。
- 需要用随机空数据场景验证前端对缺字段、空数组、`null` 等非契约响应的容错。

**教程**（完整流程见 [SKILL.md](skills/mockoon-gen/SKILL.md)）：

1. 确认项目与页面目录；目录不明确时先停下询问。
2. 把松散文档规范化为 `<page-dir>/mockoon-gen/openapi.yaml`；未经明确的人或项目 review 决策，不得标记为 reviewed。
3. 生成产物前一次性确认两个选项：是否开启随机空数据模式；Whistle 导出格式 `json` 还是 `cjs`。
4. 初始化配置并创建产物：

   ```bash
   node <skill-dir>/bin/mockoon-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
   node <skill-dir>/bin/mockoon-gen.mjs from-openapi <openapi-file> --origin <generated|imported|manual> --page-dir <page-dir> --cwd <project-dir> [--random-empty-data]
   ```

5. 对每个成功响应中的每个原始字段（string / integer / number / boolean / 日期类）做语义 Faker 决策，写入该 endpoint 的 `mock.semanticMappings`，然后渲染进生成场景：

   ```bash
   node <skill-dir>/bin/mockoon-gen.mjs render-templates --from <page-dir>/mockoon-gen/mock-artifact.json --cwd <project-dir>
   ```

   渲染优先级为 `semanticMappings > OpenAPI format > 类型默认回退`；语义不明的字段保持不映射，交给类型回退。
6. 导出前校验目标：

   ```bash
   node <skill-dir>/bin/mockoon-gen.mjs validate --from <page-dir>/mockoon-gen/mock-artifact.json --target <all|mockoon|whistle> --cwd <project-dir>
   ```

7. 校验通过后导出。Whistle 格式必须来自第 3 步的显式确认，未确认时 skill 会在导出前停下来只问这一个选择：

   ```bash
   node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from <artifact> --cwd <project-dir>
   node <skill-dir>/bin/mockoon-gen.mjs export whistle --format <json|cjs> --from <artifact> --cwd <project-dir>
   ```

   端口、场景 review、列表策略、Whistle 分组名或 apiHost 未解决时不得导出；不要用 `--force` 绕过 hash、review、路径与 no-clobber 门禁。

#### api-code-gen

**触发方式**：显式调用 `$api-code-gen`（`agents/openai.yaml` 已声明 `policy: allow_implicit_invocation: false`，请求内容匹配 description 也不会自动激活）。

**用途**：从已 review 的 OpenAPI 生成 TypeScript DTO、VO、mapper 和请求函数，支持产物 review 与单文件/拆分输出计划。

**适用场景**：

- 接口契约 review 完成后，需要生成可直接接入项目的 TS 类型与请求层代码。
- 项目有既定的 API 目录结构，需要按约定做拆分输出（每个 endpoint 恰好分配到一个文件）。
- 需要保证生成代码只从契约单向产出，不受手改污染。

**教程**（完整流程见 [SKILL.md](skills/api-code-gen/SKILL.md)）：

1. 确认页面目录；需要拆分输出时，先查看项目内相邻 API 代码的约定。
2. 初始化配置并从已 review 的 OpenAPI 创建产物：

   ```bash
   node <skill-dir>/bin/api-code-gen.mjs init --page-dir <page-dir> --cwd <project-dir>
   node <skill-dir>/bin/api-code-gen.mjs from-openapi <openapi-file> --origin <imported|manual> --reviewed --page-dir <page-dir> --cwd <project-dir>
   ```

3. Review DTO/VO 字段、mapper 步骤和输出计划；拆分输出时把每个 endpoint 恰好分配一次，并确认文件清单与可选 index。
4. 校验后生成：

   ```bash
   node <skill-dir>/bin/api-code-gen.mjs validate --from <page-dir>/api-code-gen/api-code-artifact.json --cwd <project-dir>
   node <skill-dir>/bin/api-code-gen.mjs generate --from <artifact> --cwd <project-dir>
   ```

   review 项未关闭、输出计划未确认、OpenAPI hash 变化、检测到不支持的输入或路径越界时都会停下。

> **共享约束**：`mockoon-gen` 与 `api-code-gen` 只共享已 review 的 OpenAPI 输入。`mock-artifact.json` 与 `api-code-artifact.json` 相互独立，互不为反向输入；生成文件是派生物，不做反向同步。

#### to-chatgpt

**触发方式**：显式调用 `$to-chatgpt`（`agents/openai.yaml` 已声明 `policy: allow_implicit_invocation: false`）。任务难度、规模、风险或"可能受益于更强模型"都不会触发它；显式调用后，Codex 也不会因为觉得自己能解决而跳过委派。

**用途**：把显式委派的任务交给当前 ChatGPT 页面上用户指定的模型/模式/推理等级；未指定的选择项才默认使用当前实际可用的最高档。Codex 始终是唯一协调者和最终验收者，外部 ChatGPT 是有能力但不可信的资深工程师。

**适用场景**：

- 想借当前账号可用的 ChatGPT 模型做深度分析、根因调查、架构 review 或代码 review，并按需要指定模型、模式或推理等级。
- 已发布 PR 的外部 review（ChatGPT 能访问 PR diff 时优先直接给 PR URL）。
- 未发布或私有代码，通过最小脱敏源码包（内置 secret 扫描）送出去分析。

**教程**（完整流程见 [SKILL.md](skills/to-chatgpt/SKILL.md)）：

1. 显式调用，可附任务描述，也可显式指定当前账号可选的模型/模式和推理等级：

   ```text
   $to-chatgpt review 当前 PR，重点检查架构、并发和测试缺口
   $to-chatgpt 推理强度 <等级> review 当前 PR
   $to-chatgpt 使用 <模型/模式>，推理强度 <等级> 分析这个难以复现的并发问题
   ```

2. Codex 打开用户当前的 ChatGPT 页面，只按 UI 实际可选的选项判断模型、模式和推理等级。用户明确指定的项按指定值选择；某一项未指定时，才对该项选择当前 UI 实际可用的最高档。可用的用户指定等级不会因为存在更高等级而被覆盖；指定项不可用时才使用兼容替代项并报告替代情况。
3. 建立本地事实：读仓库指令（`AGENTS.md` 等）、确认分支/HEAD/工作区状态、需要时用 GitHub/`gh` 解析 PR 真实信息；绝不为了干净的基线重置用户改动。
4. 选择最小上下文通道：已发布的 PR 直接给 URL；本地/未发布代码用 `prepare_source_bundle.py` 生成最小脱敏源码包。永不携带 `.env`、凭据、token、私钥、数据库、用户数据；secret 扫描失败时排除命中文件而不是绕过。
5. 发送任务简报（目标、基线、边界、交付物、验收标准、禁止谎称执行过不可用的命令/环境）；实施任务要最小完整补丁，review 任务要可执行结论而非推测性重写。
6. 独立验收：逐条 review ChatGPT 的改动建议，本地实际运行适用的格式化/lint/类型/测试/构建检查；ChatGPT 声称"测试通过""已执行"不构成本地证据。
7. 本地验证失败时，带具体证据（失败命令、脱敏日志、位置、违反的验收标准）回到同一会话要求最小修正；反复修正不收敛时重新评估方案。
8. 最终报告：所选模型/模式/推理等级、用户显式指定项及是否发生替代、会话 URL、采纳与拒绝的建议、实际变更、实际跑过的本地验证及结果、遗留风险。

#### writing-style-yzin

**触发方式**：显式引用 `$writing-style-yzin`（`agents/openai.yaml` 已声明 `policy: allow_implicit_invocation: false`）；写技术文章、博客、教程或案例时也不会自动触发。

**用途**：把 Yzin 偏好的风格应用到对外发布的中文技术文章。

**适用场景**：

- 对外发布的中文技术文章、博客、教程、案例复盘。
- 内部文档和普通对话回复不需要触发。

**教程**（完整规则见 [SKILL.md](skills/writing-style-yzin/SKILL.md)）：

1. 在写作请求中显式引用 `$writing-style-yzin`，agent 即按以下风格约束产出。
2. 默认中文写作；API 名、代码、配置键等技术术语保留原文。
3. 开头直接给结论或真实问题；公开文章以 `## 背景` 开始，用具体的项目阻塞、尝试过的方案及其机制与影响引入，不用工具定义或抽象结论开头。
4. 分层解释：机制、实现、验证、取舍。技术决策先讲机制、收益与成本，再讲操作步骤。
5. 主流程围绕读者任务组织：`input → manual review → user decision → artifacts → integration testing`；输入文档要成为契约时，人工 review 必须是显式门禁，不能暗示生成器可以替代 review。
6. 引用外部事实时在语句后紧跟编号引用 `[[1]](url)`，文末加 `## 参考文献`；优先官方文档、规范、源码、论文等一手来源。
7. 语气直接、具体、技术化；不做推广式表述，不把未验证的说法当事实，区分文档行为、实验结果和推断。

## 安装

从 GitHub 安装 skill：

```bash
npx skills@latest add yzin-17/skills
```

安装或更新后重启 Codex，让新的 skill 元数据加载。

`spec-driven-workflow` 和 `codex-cost` 在请求匹配描述时自动触发；`mockoon-gen`、`api-code-gen`、`to-chatgpt`、`writing-style-yzin` 声明了 `policy: allow_implicit_invocation: false`，只在显式调用 `$<skill-name>` 时运行。

```text
$mockoon-gen 根据已 review 的 OpenAPI 生成 Mockoon 和 Whistle 配置
$api-code-gen 根据已 review 的 OpenAPI 生成 TypeScript API 代码
$to-chatgpt review 当前 PR，重点检查架构、并发和测试缺口
$writing-style-yzin 按我的风格写这篇 mockoon-gen 公开文章
```

## 仓库结构

```text
skills/       Skill bundles：SKILL.md、agents/openai.yaml、打包好的 CLI（bin/）、references/ 和 scripts/
packages/     pnpm workspace：openapi-reader、mockoon-gen-cli、api-code-gen-cli
docs/         设计 Spec、实施计划与文章
.github/      CI workflow：测试、类型检查、打包并对比 skill 内二进制
plugin.json   Agent plugin 元数据
```

两个代码生成 skill 自带独立打包的 CLI（`skills/mockoon-gen/bin/mockoon-gen.mjs`、`skills/api-code-gen/bin/api-code-gen.mjs`），agent 无需安装 TypeScript workspace 即可运行。CLI 在 `packages/` 下用 esbuild 开发打包；GitHub Actions 会在每次 push 到 `main` 时跑测试、类型检查和打包，若已提交的二进制与包出现漂移会自动开更新 PR。

## 开发

需要 pnpm。在仓库根目录：

```bash
pnpm build       # 构建所有 workspace 包
pnpm bundle      # 先构建，再把 CLI 打包进 skill 的 bin/ 目录
pnpm test        # 运行各包的 vitest 测试
pnpm typecheck   # 先构建 openapi-reader，再对全部包做类型检查
```

`packages/openapi-reader` 是两个 CLI 包共享的 OpenAPI 读取库。改动任何包之后，运行 `pnpm bundle` 保持已提交的 skill 二进制同步，并让 CI 确认结果。
