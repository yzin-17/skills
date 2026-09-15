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

**用途**：基于角色分工的委派与成本控制：父编排者负责需求理解、范围、关键决策与最终验收，worker 负责有界执行；同一时刻只允许一个 worker 执行。

**适用门槛**：仅当当前父/编排模型不是 Luna 时使用；Luna 无论是作为父模型还是被委派的 worker，都不应再触发本 skill 或开启新一轮委派。

**适用场景**：

- 值得委派：跨多文件的大量代码阅读、跨文件实现、实现后的测试/调试/修复循环、大量日志或浏览器证据需要吸收。
- 不值得委派：简单本地低风险修改、小编辑、纯分析或小文档改动——直接做比委派再验证更省。
- 用户点名某个子 agent 或模型，只约束"委派时用哪个模型"，不等于强制委派。

**教程**（完整规则见 [SKILL.md](skills/codex-cost/SKILL.md)）：

1. 先判断委派收益是否大于 worker 启动、上下文转移、协调与终审开销；确认值得委派后要真正创建并委派，而不是口头计划后继续在父上下文里干。
2. 选择 worker：用户未指定时，非 UI 工作默认交给 Luna；前端视觉、布局或样式工作不得交给 Luna，需换其他 worker。同一任务可在这类边界上顺序切换 worker，但不允许并行多个 worker。
3. 委派前给出自包含的任务契约：目标、范围、排除项、已定决策与约束、允许的编辑与工具、验证要求、返回内容、停止条件。
4. 同一执行类型内复用原 worker；发现问题时把具体发现退回给负责该范围的原 worker，而不是新开一个同类 worker。
5. worker 吸收大量执行上下文（搜索结果、日志、DOM、Console/Network 输出），只返回变更区域、关键 diff、验证结果、风险与阻塞。
6. 浏览器验证只在改动影响可见 UI 或交互时进行，由 worker 覆盖直接受影响的关键路径；父编排者仅在结果可疑、证据冲突或高风险时做小规模独立复核。
7. 每个委派任务必须经过父编排者的最终 review 才算完成：确认目标与范围达成、检查关键 diff、确认约束未被破坏、复核测试与浏览器验证结果；发现问题退回修复后再审。

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

#### delegate-to-chatgpt

**触发方式**：显式调用 `$delegate-to-chatgpt`（`agents/openai.yaml` 已声明 `policy: allow_implicit_invocation: false`）。任务难度、规模、风险或"可能受益于更强模型"都不会触发它；显式调用后，Codex 也不会因为觉得自己能解决而跳过委派。

**用途**：把显式委派的任务交给当前 ChatGPT 页面上实际可选的最强模型/模式；Codex 始终是唯一协调者和最终验收者，外部 ChatGPT 是有能力但不可信的资深工程师。

**适用场景**：

- 想借当前账号可用的最强 ChatGPT 模型做深度分析、根因调查、架构 review 或代码 review。
- 已发布 PR 的外部 review（ChatGPT 能访问 PR diff 时优先直接给 PR URL）。
- 未发布或私有代码，通过最小脱敏源码包（内置 secret 扫描）送出去分析。

**教程**（完整流程见 [SKILL.md](skills/delegate-to-chatgpt/SKILL.md)）：

1. 显式调用，可附任务描述，也可显式指定当前账号可选的模型/模式：

   ```text
   $delegate-to-chatgpt review 当前 PR，重点检查架构、并发和测试缺口
   $delegate-to-chatgpt 使用 <模型/模式> 分析这个难以复现的并发问题
   ```

2. Codex 打开用户当前的 ChatGPT 页面，只按 UI 实际可选的选项判断模型可用性，选最高能力档；有推理强度控制则选最高档；所选选项不可用时退到 UI 实际可选的次高档并报告替代情况。
3. 建立本地事实：读仓库指令（`AGENTS.md` 等）、确认分支/HEAD/工作区状态、需要时用 GitHub/`gh` 解析 PR 真实信息；绝不为了干净的基线重置用户改动。
4. 选择最小上下文通道：已发布的 PR 直接给 URL；本地/未发布代码用 `prepare_source_bundle.py` 生成最小脱敏源码包。永不携带 `.env`、凭据、token、私钥、数据库、用户数据；secret 扫描失败时排除命中文件而不是绕过。
5. 发送任务简报（目标、基线、边界、交付物、验收标准、禁止谎称执行过不可用的命令/环境）；实施任务要最小完整补丁，review 任务要可执行结论而非推测性重写。
6. 独立验收：逐条 review ChatGPT 的改动建议，本地实际运行适用的格式化/lint/类型/测试/构建检查；ChatGPT 声称"测试通过""已执行"不构成本地证据。
7. 本地验证失败时，带具体证据（失败命令、脱敏日志、位置、违反的验收标准）回到同一会话要求最小修正；反复修正不收敛时重新评估方案。
8. 最终报告：所选模型/模式及是否被替代、会话 URL、采纳与拒绝的建议、实际变更、实际跑过的本地验证及结果、遗留风险。

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

`spec-driven-workflow` 和 `codex-cost` 在请求匹配描述时自动触发；`mockoon-gen`、`api-code-gen`、`delegate-to-chatgpt`、`writing-style-yzin` 声明了 `policy: allow_implicit_invocation: false`，只在显式调用 `$<skill-name>` 时运行。

```text
$mockoon-gen 根据已 review 的 OpenAPI 生成 Mockoon 和 Whistle 配置
$api-code-gen 根据已 review 的 OpenAPI 生成 TypeScript API 代码
$delegate-to-chatgpt review 当前 PR，重点检查架构、并发和测试缺口
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
