# Implementation

This reference applies only when the current request includes implementation. Document-only work should normally stop after the planning review.

## 1. Implementation gate

Before editing code:

- the Spec and task document must be internally reviewable;
- the planning preflight must pass;
- no unresolved Blocking Question may materially change behavior, interfaces, data semantics, compatibility, testing, or acceptance criteria.

Implement only the current dependency frontier: Tasks whose declared dependencies are already complete.

Avoid speculative refactoring. Add a prerequisite refactor only when it directly serves the approved Spec.

## 2. Task and Step execution

A Task may be broken into implementation Steps.

A Step is an execution-and-validation unit, not an independent Task and not a mandatory commit boundary.

Each Step should:

- correspond to a meaningful code change;
- have a concrete result;
- include validation appropriate to that result;
- be small enough to make failures understandable and corrective work bounded.

Do not create Steps for meaningless mechanics such as an isolated import edit, formatting-only pass, trivial rename, or an unvalidated half-change.

Several mechanical edits may belong to one Step when together they form a coherent implementation result.

## 3. Validation

Validate every completed Step and every completed Task at a level appropriate to the change.

Possible evidence includes:

- targeted automated tests;
- broader regression tests;
- type checking or static analysis;
- build or package validation;
- manual behavior checks when automation is not practical.

Never mark a Task complete because code was written. Completion requires the corresponding validation evidence.

## 4. Commit boundaries

Commit creation requires authorization from the current request or applicable project rules.

Use this distinction:

> Step is the implementation and validation unit; commit is an authorized version-control and Review boundary.

A commit may cover one Step or several closely related verified Steps when they form one coherent Review unit.

Do not create commits merely to satisfy the workflow or to reach a target count.

If commits are not authorized:

- leave the work uncommitted;
- preserve validation evidence;
- optionally record a sensible suggested commit boundary in the handoff.

Example:

```text
T2：支持 SELL 部分平仓

Step 1：补充部分平仓领域行为覆盖
→ 验证

Step 2：实现部分平仓领域逻辑
→ 验证

Step 3：接入 API
→ 验证

Step 4：接入 UI
→ 验证

如已获提交授权：
- Step 1 + Step 2 可以形成一个领域行为 commit；
- Step 3 + Step 4 仅在共同构成一个 coherent review unit 时合并。
```

## 5. Task status maintenance

During implementation:

- work on one Task or a clearly related set of dependency-ready Tasks at a time;
- dependency-free, non-conflicting Tasks may run in parallel;
- change `- [ ]` to `- [x]` only after implementation and validation both pass;
- record validation evidence under each checked Task;
- keep partially completed Tasks unchecked and record remaining work;
- add a Task when real required work was omitted;
- update a Task when its scope or completion conditions change;
- update `依赖` when new information changes the real dependency graph;
- synchronize affected Tasks when a cross-task contract changes;
- restore an already checked Task to incomplete if later changes invalidate its evidence, then revalidate it.

### Validation evidence example

```md
- [x] T1：任务描述
  - 覆盖验收标准：AC1
  - 依赖：无
  - 涉及范围：
  - 完成条件：
  - 验证方式：
  - 验证证据：
    - `<验证命令>`：通过
    - 人工检查：<检查内容与结果>
```

## 6. Plan drift

If implementation reveals that the approved documents are wrong or incomplete, update the documents rather than silently diverging.

Update the Spec first when the discovered change affects stable behavior, business rules, interfaces, state, permissions, compatibility, testing acceptance, or acceptance criteria.

For implementation-only details that do not alter the Spec contract, update the affected Task without forcing an unnecessary Spec revision.
