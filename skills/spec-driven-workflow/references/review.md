# Review

This reference defines the planning preflight for Spec/task documents and the final consistency review after implementation.

## 1. Planning preflight

Run this review after the Spec and task document are drafted or revised. Document-only work is not complete until this preflight has been performed.

### 1.1 Spec coverage

Check:

- every material Spec requirement and every `AC<n>` is implemented by at least one concrete Task;
- every Task's `覆盖验收标准` points to a real AC;
- no acceptance criterion is orphaned;
- no Task introduces scope that the Spec does not authorize.

Fix mapping gaps before declaring the plan ready.

### 1.2 Placeholder and undefined-contract scan

Check for wording such as:

- `TBD`;
- `TODO`;
- `later`;
- `处理细节`;
- `适当处理错误`;
- `补相关测试`;
- `类似前一任务`;
- any other instruction that requires the implementer to guess the real requirement.

Move genuinely unresolved design decisions back to the Spec's open-question section instead of hiding uncertainty in Tasks.

### 1.3 Dependency review

Check:

- each declared dependency really blocks safe execution of the dependent Task;
- no necessary dependency is missing;
- Tasks that can safely run in parallel have not been artificially serialized;
- Wide Refactor Tasks use a correct Expand / Migrate / Contract relationship when applicable.

### 1.4 Open-question gate

Check:

- whether any unresolved Blocking Question remains;
- whether each remaining Non-blocking question has an explicit default assumption and impact boundary;
- whether any Task secretly depends on an unconfirmed design decision.

For document-only work, unresolved Blocking Questions may be reported as planning blockers unless the user requires an implementation-ready plan.

For implementation work, an unresolved Blocking Question is a hard stop before coding.

### 1.5 Cross-task consistency

When cross-task contracts exist, check:

- downstream Tasks use the same interface, type, method, field, and event names defined by prerequisites;
- one domain concept is not represented by competing names without justification;
- Schema, API, Domain, and UI descriptions agree on the semantics of shared fields.

Correct document inconsistencies before implementation begins.

### Planning-review conclusion

A useful handoff records one of:

- `Ready`: documents are internally consistent and implementation-ready;
- `Ready with non-blocking assumptions`: implementation may proceed using the recorded defaults;
- `Blocked`: one or more Blocking Questions or missing contracts must be resolved first.

## 2. Final consistency review

After all requested implementation Tasks are complete, verify:

1. implementation satisfies the Spec goals and every acceptance criterion;
2. implementation did not accidentally deliver a declared non-goal;
3. every checked Task is truly complete and has validation evidence;
4. Task dependencies reflect the real execution constraints;
5. cross-task interfaces, types, fields, and event semantics remain consistent;
6. no placeholder, undefined contract, or stale Task statement remains;
7. no implemented scope change is missing from the Spec or task document;
8. tests cover key behavior, boundaries, compatibility, and regression risks appropriate to the change;
9. actual validation remains consistent with the Spec's test strategy;
10. documentation, configuration, interfaces, and compatibility notes are synchronized;
11. necessary implementation Steps are verified, and commit handling matches the authorization status.

The task document should maintain this section at its end:

```md
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

Do not check an item merely because the workflow reached the final phase. Each checked item must reflect actual evidence.

## 3. Handoff requirements

### Document-only work

The final response must state:

- Spec document path;
- task document path;
- planning-review conclusion;
- Blocking Questions, if any;
- remaining planning risks or follow-up items.

### Implementation work

Also state:

- completed and incomplete Tasks;
- dependency or blocking status;
- validations that were run and their results;
- final consistency-review conclusion;
- remaining implementation risks or explicitly accepted follow-up items.
