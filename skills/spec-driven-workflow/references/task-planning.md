# Task Planning

Turn a Spec into bounded, independently reviewable deliverables without over-fragmentation or hidden final integration.

## 1. Task document contract

Link the Spec and retain stable Task IDs. Follow repository paths; otherwise use `docs/specs/YYYY-MM-DD-<task-id>.md` and `docs/tasks/<task-id>.md`. Keep the Spec's first-creation date stable.

Every executable task must state its AC coverage, dependencies, scope, completion conditions, and validation method. Its primary outcome and acceptance boundary must be unambiguous. Include the configuration, scaffolding, tests, and documentation needed for that outcome.

A fresh-context agent should be able to identify what to deliver, what not to change, and what proves completion without reading the entire execution history. Name concrete modules or paths when useful; do not turn file lists into acceptance criteria.

### Compact template

```md
# <任务名称>实施任务

对应 Spec：<相对链接>
> 状态：<实现进度；未通过的必要门禁>

## 任务

- [ ] T1：<一个主要交付目标>
  - 覆盖验收标准：AC1（<本任务证明的断言>）
  - 依赖：无
  - 涉及范围：<责任边界；必要时说明不包含的内容>
  - 完成条件：<可独立接受或拒绝的结果>
  - 验证方式：<入口、环境与关键断言>
  - 验证证据：<实施后记录；规划时可省略>

## 验收映射（多个任务共同覆盖同一 AC 时使用）
| AC / 断言 | 实现责任任务 | 验证责任任务或门禁 |
| --- | --- | --- |
| AC1 / <具体断言> | T1 | T1；必要时关联 I1 |

## 最终一致性 Review
<采用 references/review.md 中的单一检查清单与结论结构>
```

Add fields only when they resolve real coordination ambiguity: `接口契约`, `验收依赖`, `关联门禁`, `环境前提`, `责任方`, or a reference to existing evidence. Do not require a large schema for every small task.

Do not leave implementation instructions such as `TBD`, `TODO`, `later`, `处理细节`, `适当处理错误`, `补相关测试`, or `类似 T1`. Put unresolved requirements in the Spec's open questions. Template placeholders are not instructions to retain placeholders in a finished plan.

## 2. Right-size by acceptance, not file count

A Task is the smallest implementation unit that carries its own complete validation cycle and warrants an independent Review decision. This does not require a separate reviewer agent or commit.

Split when distinct deliverables can reasonably receive different acceptance decisions, especially when they have different ownership, completion conditions, failure boundaries, or required environments. Keep related success/error cases together when they establish one coherent behavior.

Review granularity when:

- work crosses three or more execution surfaces, such as persistence/migration, a queue/worker, a domain runtime, API, client, or deployment environment;
- one task changes multiple applications or repositories, many unrelated files, or requires verification across multiple packages;
- it combines several independently useful outputs or cannot be verified without several unfinished components converging;
- an implementation task is accumulating migration decisions, lifecycle enhancements, UI work, and final runtime acceptance;
- adding Steps or parallel agents is expanding the scope rather than resolving a bounded deliverable.

These are review triggers, not automatic split thresholds. Several code layers can be one small synchronous behavior; several failure cases can belong to one acceptance guarantee. Do not equate technical layers with independent runtimes.

After review, split if the task still contains independently acceptable deliveries, hides an integration responsibility, or has no bounded acceptance loop. Otherwise retain it with a brief boundary explanation. Aim for a task that can be understood in a fresh context, not a specific line count or context-window percentage.

## 3. Bounded vertical slices and enabling deliverables

Prefer a bounded vertical slice for one behavior. Include only the layers needed to prove that behavior, not every eventual consumer or release concern.

A vertical slice may span Schema, Domain, API, UI, and tests when that remains one small acceptance loop. It must not become the default justification for combining all persistence, runtime, lifecycle, client, and deployment work.

Independently acceptable enabling tasks are valid, including:

- a stable, testable Schema or producer/consumer contract;
- a migration with verifiable data and compatibility invariants;
- a storage, snapshot, or runtime capability with a bounded behavioral test;
- a client interaction proven against a ready contract, with deployed interoperability assigned to an explicit gate.

These are behavior or contract boundaries, not mechanical `修改 Schema → 修改 Server → 修改 UI → 补测试` slices. Tests remain with the implementation they validate.

A task must not need a later task to prove its **own declared result**. It may precede a separate gate that proves the **combined feature**. Name that gate and keep the distinction explicit; do not retrospectively redefine incomplete work as complete without re-planning its acceptance ownership.

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

Parallel tasks must have ready prerequisites, distinct deliverables, and non-conflicting write ownership. When sharing a worktree, coordinate shared schemas, package exports, migrations, generated files, lockfiles, and package-wide checks. Without isolation, an unrelated unfinished change can contaminate evidence.

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

Keep stable IDs and original AC obligations when splitting. Use child IDs such as `T12.1`; map existing work and still-valid evidence without automatically repeating it. Follow `implementation.md` for execution-time re-planning. Do not reopen all completed work or create new agents, conversations, commits, or tests merely because the plan was split.
