# Task Planning

This reference defines how to turn a Spec into independently verifiable implementation tasks without over-fragmenting the work.

## 1. Task document contract

The task document must link its corresponding Spec and use Markdown checklist items.

If the repository has no naming convention:

- Spec: `docs/specs/YYYY-MM-DD-<task-id>.md`
- Tasks: `docs/tasks/<task-id>.md`

`YYYY-MM-DD` is the Spec's first creation date. Later Spec revisions keep the same filename.

The Spec's acceptance criteria must use stable IDs such as `AC1`, `AC2`. Every Task must explicitly declare which acceptance criteria it covers, and every AC must be covered by at least one Task.

### Recommended template

```md
# <任务名称>实施任务

对应 Spec：[`../specs/YYYY-MM-DD-<任务标识>.md`](../specs/YYYY-MM-DD-<任务标识>.md)

## 任务

- [ ] T1：任务描述
  - 覆盖验收标准：AC1
  - 依赖：无
  - 涉及范围：
  - 完成条件：
  - 验证方式：

- [ ] T2：任务描述
  - 覆盖验收标准：AC2、AC3
  - 依赖：T1
  - 涉及范围：
  - 完成条件：
  - 验证方式：

## 最终一致性 Review

- [ ] Spec 中的全部验收标准均有对应实现
- [ ] 所有已勾选任务均有验证证据
- [ ] 所有任务依赖均已满足且无错误阻塞关系
- [ ] 跨任务接口、类型和命名保持一致（如适用）
- [ ] 不存在未解决的 Blocking 问题、占位描述或未定义的实现契约
- [ ] 实现未超出 Spec 声明的范围
- [ ] 测试策略、测试实现与验证结果一致
- [ ] 测试与文档已同步更新
- [ ] 必要实施 Step 均已验证；如已获提交授权，已形成合理 commit，否则已记录提交状态或建议边界
- [ ] 未发现实现、Spec 与任务文档之间的不一致

### Review 结论

- 结论：
- 发现的问题：
- 遗留风险：
- 验证命令与结果：
```

Each Task must:

- have a stable unique ID such as `T1`, `T2`;
- produce an independently verifiable implementation result;
- state `覆盖验收标准`, dependencies, scope, completion conditions, and validation method;
- be granular enough to determine whether it is complete;
- contain the implementation-and-validation loop needed for that deliverable;
- include necessary configuration, scaffolding, tests, and documentation rather than mechanically splitting them into separate tasks;
- be understandable in principle by an Agent starting from a fresh context;
- be valuable enough to justify an independent reviewer gate.

Avoid unverifiable descriptions such as `完成开发` or `处理细节`.

Do not use placeholders in place of decisions, including:

- `TBD`, `TODO`, `later`;
- `添加适当的错误处理`;
- `处理边界情况`;
- `补充相关测试`;
- `类似 T1`;
- other wording that requires the implementer to guess the real requirement.

If a requirement is genuinely unresolved, move it back to the Spec's open-question section.

Unlike the Spec, the task document may name concrete modules, directories, or files when that helps execution.

## 2. Task right-sizing

Tasks are not better merely because they are smaller.

Use this definition:

> A Task is the smallest implementation unit that can carry a complete validation cycle and is worth an independent Review decision.

When splitting work:

- include setup, configuration, scaffolding, tests, and documentation in the delivery task that needs them;
- split two Tasks only when a reviewer could reasonably accept one and reject the other;
- end each Task with an independently testable or verifiable result;
- do not turn one natural delivery loop into many tiny tasks with no independent acceptance value;
- prefer Tasks that can fit within one fresh context window for an implementation Agent.

## 3. Prefer vertical slices

Default to independently verifiable end-to-end vertical slices rather than technical-layer slices.

Prefer:

```text
T1：完成一个可使用、可验证的最小行为闭环
    ├─ Schema
    ├─ Domain
    ├─ API
    ├─ UI（如需要）
    └─ Tests
```

Avoid defaulting to:

```text
T1：修改 Schema
T2：修改 Server
T3：修改 Desktop
T4：补测试
```

A vertical slice should:

- cover the layers required for that behavior;
- be independently demonstrable, testable, or regression-verifiable when complete;
- not require a later task merely to prove that the current task is correct;
- remain small enough to be implemented safely.

If a behavior cannot form a complete vertical slice, declare its prerequisite explicitly.

## 4. Dependencies

Every Task must declare `依赖`.

A dependency means only:

> This Task cannot safely begin until the named Task is complete.

Do not create dependencies merely to express a preferred order.

Example:

```md
- [ ] T3：支持部分平仓后的 Trade 投影
  - 依赖：T1、T2
```

Tasks with no dependency relationship may be implemented in parallel when they do not conflict.

During implementation, only tasks whose dependencies are complete belong to the current dependency frontier.

If implementation reveals an inaccurate dependency graph, update the task document.

## 5. Cross-task contracts

Record a cross-task contract only when separate Tasks depend on a stable interface, Schema, type, event, or data structure.

Example:

```md
- [ ] T2：接入 Trade 投影
  - 依赖：T1
  - 接口契约：
    - Consumes：T1 产出的 `TradeProjection`
    - Produces：供后续查询使用的 Trade read model
```

Do not force every Task to declare `Consumes / Produces`.

Record only the contract needed for coordination. Do not enumerate ordinary internal details.

Later Tasks must use the same interface, field, type, and event semantics established by prerequisite Tasks. If that contract changes, synchronize all affected Tasks.

## 6. Wide-refactor exception

Do not force a mechanical wide refactor into artificial vertical feature slices.

Examples include:

- shared field or type renames;
- wide DTO / Schema migrations;
- public package interface replacement;
- module moves that affect many callers at once.

Prefer Expand / Migrate / Contract:

```text
Expand
  ↓
Migrate A ─┐
Migrate B ─┼→ Contract
Migrate C ─┘
```

### Expand

- introduce the new form;
- preserve temporary compatibility with the old form;
- keep existing callers functional.

### Migrate

- migrate by package, directory, domain, or another bounded blast radius;
- validate each batch independently;
- keep CI passing after each batch when practical.

### Contract

- remove the old form only after all migration Tasks are complete;
- depend on every required migration Task;
- confirm that no legacy callers remain before removal.

If a migration batch cannot stay independently verifiable, an explicit integration Task may be used, but its reason and final validation boundary must be stated.
