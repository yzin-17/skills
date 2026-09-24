# Task Planning

Turn a Spec into bounded, independently reviewable deliverables without over-fragmentation or hidden final integration.

## 1. Task document and execution packet

Link the Spec and retain stable Task IDs. Follow repository paths; otherwise use `docs/specs/YYYY-MM-DD-<task-id>.md` and `docs/tasks/<task-id>.md`. Keep the Spec's first-creation date stable. Use this task document as the authoritative execution ledger, not a second plan or conversation transcript.

Each executable leaf must carry enough information for a fresh-context executor to start, finish its bounded outcome, and report evidence without replaying prior chats. State its AC assertion, ready dependencies, focused context entry points, primary execution surface, allowed writes/exclusions, completion conditions, and validation. Include necessary tests, configuration, and documentation within that same outcome.

Store shared baseline, invariants, and environment defaults once and reference them. Link precise Spec sections, contracts, paths, or symbols; do not copy the whole Spec or repository into every task. Record task-specific exceptions explicitly. File ownership limits writes; it is not a substitute for behavioral acceptance.

### Compact template

```md
# <任务名称>实施任务

对应 Spec：<相对链接>
> 状态：<本地实施进度；尚未通过的必要门禁>
> 共享执行约束：<工作区/基线；必须保留的修改；适用约束与环境入口>

## 任务

- [ ] T1：<一个具体、可验证的交付结果>
  - 覆盖验收标准：AC1（<本任务证明的具体断言>）
  - 启动依赖：<无，或已验证的任务/契约里程碑>
  - 上下文入口：<必要 Spec 小节、只读契约、代码/测试入口>
  - 执行边界：<主要执行面；可写路径，含测试/生成文件；不包含的范围>
  - 完成条件：<本任务可独立证明的结果，不依赖未完成的后续实现>
  - 验证方式：<具体命令/过程、环境、关键断言>
  - 执行记录：<执行后填写：状态、输出/基线、证据、阻塞或下一步>

## 验收映射（多个任务共同覆盖同一 AC 时使用）
| AC / 断言 | 实现责任任务 | 验证责任任务或门禁 |
| --- | --- | --- |
| AC1 / <具体断言> | T1 | T1；必要时关联 I1 |

## 最终一致性 Review
<采用 references/review.md 中的单一检查清单与结论结构>
```

The default stop condition for every leaf is: its checks pass, a prerequisite/authorization is missing, or its declared scope can no longer contain the remaining work. Add a narrower stop condition when needed. The executor must not silently take the next task or expand its write set.

Add `验收依赖`, `关联门禁`, or specific environment details only where needed. Before parallel dispatch, also name the owner/workspace, disjoint writable paths or narrow globs, shared mutable resources, and output transfer owner. Keep the task packet short; do not require empty coordination fields for serial local work.

Do not leave implementation instructions such as `TBD`, `TODO`, `later`, `处理细节`, `适当处理错误`, `补相关测试`, or `类似 T1`. Put unresolved requirements in the Spec's open questions. Template placeholders must be resolved or omitted in executable plans; evidence is recorded only after actual execution.

## 2. Mandatory sizing gate

A leaf is a small execution unit, not a feature-sized milestone. Before dispatch, verify that it has:

- one concrete result, without independently acceptable deliveries hidden in Steps;
- one primary execution surface and a narrow write/verification boundary;
- enough known inputs for a focused read–implement–self-review–validate run, without broad discovery, repeated compaction, or carrying unrelated task history;
- a local completion check and an explicit stopping point.

If any condition fails, split or run bounded discovery before implementation. Do not wait until a task spans three runtimes, consumes most of a context window, or has already run for a long time. A larger context window, more workers, or a longer Step list does not make an oversized leaf ready.

Split at a substantive change in outcome, runtime, required knowledge, write ownership, or verification environment. Even work inside one runtime may need separate tasks for independent behaviors, migrations, recovery semantics, or broad consumer batches. Split wide repetitive changes into independently validated batches.

Do not split mechanically by file or technical layer. A small synchronous behavior may touch adjacent local layers when its context and validation remain bounded; retain it with a concrete boundary explanation. Keep its necessary success/error coverage and safety invariants together. No fixed duration, file count, or token threshold proves that a task is small.

When uncertainty prevents a bounded implementation packet, first create a discovery task with a precise question, read scope, and observable output such as a reproduction, verified contract, or code-path map plus proposed child boundaries. It supports named ACs but does not itself prove their product behavior. Resolve its findings into the affected Spec/Tasks before dependent implementation; do not combine open-ended investigation and an unknown repair into one leaf.

## 3. Small slices, enabling tasks, and task groups

Prefer a small behavior or contract slice. Independently acceptable enabling tasks are valid: a tested producer/consumer contract, a migration with compatibility invariants, a bounded persistence/runtime capability, or a client interaction against a ready contract. Tests stay with the implementation they validate, not in a final “补测试” task.

A complete product journey is usually a task group plus explicit integration gates, not permission to bundle Schema, runtime, API, client, lifecycle, and deployment into one checkbox. A task must prove its **own declared result** without later implementation. A named gate can separately prove the **combined feature**; do not redefine missing local acceptance as gate work after the fact.

Illustrative decomposition, only for capabilities actually required by the Spec:

```text
T12  异步执行能力（分组，不直接派发）
  T12.1 输入/终态契约 + 非法输入与状态约束测试
  T12.2 持久化能力 + 原子写入/按标识读取测试
  T12.3 最小真实领域执行 + 必需安全约束与失败路径测试
  T12.4 创建/查询 API 行为 + 契约测试
  I1    前述必要产物就绪后的早期真实语义联通验证
  T12.5 客户端交互 + 定向状态/交互验证
  I2    Spec 要求的目标环境用户路径验证
```

Assign actual dependencies and owned paths before using this outline; the numbering is not a dependency graph. API/client work may start against a verified contract, while I1 requires the real connected implementations. Add separate migration, visual, cancellation, or recovery tasks only when required and independently verifiable; safety needed by the minimum path cannot be postponed. Split any leaf or gate further if it fails the sizing gate. Groups organize scope, not a queue for one executor to consume indefinitely.

## 4. Early integration and explicit gates

When several components must connect, assign an integration owner and executable entry point before parallel implementation. Schedule the first useful integration as soon as its real prerequisites are ready, not after all enhancement tasks finish.

A typical early path is:

```text
输入 → 执行一次真实领域语义 → 持久化明确终态 → 查询结果
```

Use the real domain implementation, not a hardcoded successful result. Controlled input facts may be fixtures when clearly labeled; that proves fixture-based integration, not live provider availability. The path need not wait for the full client UI or every supported scenario.

Keep safety-critical identity, isolation, minimum state transitions, atomic result publication, and duplicate protection in this path when required by the Spec or execution model. Retry, cancellation, recovery, progress, and diagnostics may become separate tasks only where delaying them does not invalidate the minimum safe path. All Spec-required lifecycle behavior remains mandatory before feature completion.

Create an explicit gate when acceptance involves independent integration ownership, a distinct environment, an irreversible transition, or materially different verification setup. A gate records:

- the precise assertion and required scenario coverage;
- prerequisites, required environment, and who owns its execution;
- the entry point and sufficient evidence;
- what fails or remains blocked if evidence is unavailable.

Do not automatically create separate tasks for every browser check, cross-package command, performance test, or fault case. Reuse a coherent gate or existing test entry when its acceptance boundary matches. Do not replace one oversized implementation task with one oversized final gate containing all integration, isolation, migration, performance, and release work.

Integration work may wire completed components and fix bounded seam defects. Missing core capabilities return to an explicit implementation task. The existing final consistency Review is the final review gate; do not create a second task that repeats the same review without a distinct purpose.

## 5. Dependencies and parallel readiness

`依赖` means a prerequisite that prevents safe start, not a preferred order. Preserve this default for ordinary tasks.

When starting against a contract is safe, depend on a **named, verified contract deliverable or milestone**, not on the producer's entire unfinished implementation. Record the milestone's owner, stable contract reference, and readiness evidence. A vague claim that an interface is "basically ready" is not a dependency exemption.

Distinguish only when needed:

- `依赖`: required before work can safely start.
- `验收依赖`: may arrive during implementation but must be satisfied before this task's own completion.
- `关联门禁`: accepts the combined feature after local deliverables complete; does not automatically block their local completion.

Consumers may implement against a ready shared contract or fixture before the producer is deployed. Do not infer real interoperability from this. The integration gate must depend on both implementations and the required environment.

Check start and acceptance relationships for cycles. In particular, do not make task completion depend on a gate that itself requires that task to be complete; reassign the assertions to remove the cycle.

Parallel tasks need ready prerequisites and exclusive write ownership, including tests, snapshots, generated output, formatting, and lockfile effects. Assign one owner for shared contracts/exports and the shared task ledger; workers return evidence rather than concurrently editing that ledger. Reserve or isolate mutable resources such as test databases, ports, browser profiles, and build directories. Worktrees do not replace ownership checks. If independence is unproven, serialize only the conflicting work; unvalidated sibling output is not a stable input.

If an implementation uses a helper from a task absent from its dependency record, check whether the helper is already a verified shared prerequisite or whether the graph is stale. Update the real dependency; do not infer safety from the original table.

## 6. Cross-task contracts

Record only contracts needed for coordination; do not force `Consumes / Produces` on every task.

Before contract-dependent parallel work, establish the relevant names, Schema/types, inputs/outputs, error behavior, and state, timing, identity, or side-effect semantics. Use a shared Schema, authoritative fixtures, contract tests, or another inspectable artifact. A list of type names alone may be insufficient.

Contract readiness does not require the producer's full implementation. Tests must demonstrate the relevant agreement; independently invented producer and consumer mocks are not shared evidence.

A frozen contract is a coordination baseline, not a ban on justified changes. Change its authoritative definition, update affected tasks and consumers, identify invalidated evidence, and rerun impacted checks. Do not let concurrent implementations guess incompatible contracts and defer reconciliation to the end.

## 7. Acceptance ownership and evidence scope

Every material AC assertion needs an implementation owner and an appropriate verification owner. They may be the same task. An AC spanning layers can have several owners for **different assertions**, not several undifferentiated claims that the whole AC is complete.

Do not use `AC1–AC30 → 最终任务` as a substitute for concrete acceptance ownership. The final Review audits coverage; it does not inherit all missing implementation and verification work.

Examples:

| 断言 | 本地证据 | 不能据此宣称的结果 |
| --- | --- | --- |
| Schema 拒绝非法配置 | 输入 fixture 与字段错误断言 | 已部署 API/UI 均拒绝 |
| 冻结数据可重放 | Artifact 读写、哈希和确定性测试 | 实时 Provider 已可用 |
| 无禁止依赖 | 静态边界检查 | 运行前后真实数据完全未变 |
| 编辑器可操作且无溢出 | 页面/组件 smoke | 创建、执行、持久化、查询闭环通过 |

Reference reusable evidence instead of repeating expensive checks solely because several tasks cite the same AC. Coverage and evidence validity, not test-count growth, determine completion.

## 8. Existing-system migration and conditional work

Perform required inventory at the point mandated by the Spec, and before any dependent irreversible decision. State the retention branch, permitted temporary compatibility, removal conditions, and rollback or recovery behavior.

For wide mechanical changes, prefer bounded Expand / Migrate-or-Cutover / Contract when compatible with the Spec:

- **Expand:** introduce the new form without prohibited or destructive side effects; preserve existing behavior only through permitted mechanisms.
- **Migrate/Cutover:** move bounded consumers or traffic/data under the approved retention policy; verify each batch.
- **Contract:** remove the old form only after required migrations, caller checks, retention decisions, and authorized removal conditions pass.

Do not introduce compatibility re-exports, conversion adapters, backfills, dual writes, or infrastructure merely because a generic template suggests them. If a retention decision requires a separate migration Spec, stop the affected Contract path rather than quietly implementing that migration here.

Performance-dependent infrastructure tasks are conditional. Record the activation decision and evidence. Validate the selected runtime's required behavior; the absence of an unselected optional component is not a failed gate.

## 9. Progress and re-planning

Use checkboxes for executable tasks and acceptance gates. Use headings or explicit group entries for parents; do not count both the parent and its children as completed work.

A task is checked only when its own required implementation and validation pass. Keep incomplete tasks unchecked with concise implementation, validation, and blocker details. Store shared integration/runtime gate status once and reference it from local tasks.

Report implementation progress separately from outstanding feature acceptance. A count such as `13/14` is a task count, not an estimate of remaining effort or proof of release readiness. After splitting, state the changed counting basis rather than implying progress increased through relabeling.

Keep stable IDs and original AC obligations when splitting. Use child IDs such as `T12.1`; map existing work and still-valid evidence without repeating completed work or unaffected tests. Follow `implementation.md` for checkpoints and re-planning. Treat unfinished children as separate execution packets; apply the existing delegation policy for fresh workers rather than preserving a long conversation to avoid a new thread. Splitting does not require extra commits or reopening accepted work.
