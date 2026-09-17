# Follow-up TODO Tracking

Track implementation that has been explicitly confirmed for later follow-up without creating a second source of requirements, acceptance, or task status.

## 1. Contract and location

A repository TODO document is a lightweight index of unresolved follow-up implementation. It answers “what confirmed work still needs to be picked up?” and points back to the authoritative documents.

Follow an existing repository convention. Otherwise use `docs/TODO.md`.

The linked Spec and Task remain authoritative for behavior, acceptance criteria, dependencies, completion conditions, validation, and status. The TODO index must not duplicate a full plan or silently redefine those contracts.

Use relative links where practical. Prefer a Task reference with its stable task ID; also link the Spec or AC when it materially improves traceability.

## 2. Eligibility

Add an item only when all of these are true:

- the implementation outcome is concrete enough to identify later;
- the user, accepted plan, or authoritative project document explicitly confirms that it should be implemented in a later follow-up;
- the source Spec/Task preserves the requirement or follow-up scope and provides a durable reference;
- treating it as follow-up does not waive an acceptance obligation that is still required for the currently claimed scope.

Do not add:

- unresolved design decisions, Blocking Questions, or requirements that still need confirmation;
- speculative ideas, generic technical debt, or optional improvements that have not been accepted as future work;
- a current-scope task merely because it is incomplete, blocked, expensive, or inconvenient;
- vague placeholders such as `TODO`, `later`, `补测试`, or “完善错误处理” without a bounded authoritative source.

If a current acceptance criterion still requires the work, keep its Task/gate incomplete. Adding or linking it in TODO never makes that criterion pass.

## 3. Recording sequence

When follow-up work is confirmed:

1. Update or retain the authoritative Spec/Task first. Give task-level work a stable Task ID where the task document owns it; keep relevant AC references intact.
2. Confirm the current acceptance boundary. If the work is still required now, it is not a deferral and cannot be moved out of the active completion path.
3. Create or update one TODO entry that summarizes the outcome and links to the authoritative source. Deduplicate by source document plus stable Task/AC identity.
4. Record only enough context to explain why the item is present. Do not copy implementation steps, dependency graphs, acceptance criteria, or validation evidence into TODO.

Recommended compact form:

```md
# TODO

本文件仅索引已确认但尚未完成的后续实施事项。Spec / Task 是需求、范围、验收与状态的权威来源。

## 后续实施

- [ ] <简短结果描述>
  - 来源：[<Task 文档>](tasks/<task-id>.md) `Tn`；[<Spec>](specs/YYYY-MM-DD-<task-id>.md) `ACn`（如需要）
  - 记录原因：<为何明确留到后续实施；保持一句话>
```

The checkbox is only a visible unresolved marker. Do not infer completion from manually checking it; authoritative Task/gate evidence decides completion.

Do not add priority, owner, dependencies, validation, or a second task ID unless the repository already uses those fields and they solve a real coordination need.

## 4. Resuming implementation

A TODO entry is not sufficient implementation context. Before implementing it:

1. Read the linked Spec, Task, and relevant current repository state.
2. Confirm that the referenced requirement, acceptance boundary, dependencies, and interfaces are still current.
3. Re-plan through the normal workflow if the source contract or task boundary changed.
4. Implement and validate against the authoritative Task/Spec, not the TODO summary.

If a link is stale or the referenced Task was split, update the TODO reference to the current stable Task IDs. Do not copy old requirements into TODO as a workaround.

## 5. Lifecycle and synchronization

Keep the index focused on unresolved confirmed follow-up work:

- If the source Task is split, renamed, or its stable reference changes, update the TODO link and summary without inventing a parallel task hierarchy.
- If implementation begins, the TODO entry may remain as the cross-document reminder while the work is unresolved; the source Task owns the actual status.
- When the authoritative work is completed and its required validation passes, remove the active TODO entry. Git history and the source Task retain history; do not maintain a second completed-work archive by default.
- When follow-up work is explicitly canceled or superseded, update the authoritative source first and then remove or replace the TODO entry.
- If a later decision makes the item mandatory for the current acceptance scope, restore that obligation to the active Task/gate path. The TODO entry cannot carry or satisfy the obligation by itself.

Before a planning or final consistency claim for a request that affected TODO entries, check that:

- every changed TODO item has a valid authoritative source;
- no required current-scope acceptance work was hidden in TODO;
- no completed, canceled, duplicated, or stale affected entry remains;
- TODO wording does not contradict the linked Spec/Task.

## 6. Handoff

When this workflow changes the TODO index, report the TODO path plus the entries added, updated, or removed. Keep the handoff concise and point readers to the original Spec/Task for full implementation detail.
