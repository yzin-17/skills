# Review

This reference owns the planning preflight and the single final consistency Review. Reuse these checks; do not add duplicate review tasks without a distinct acceptance purpose.

## 1. Planning preflight

Run after authoring or revising Specs/Tasks. Document-only work is not complete until reviewed. For a bounded re-plan, inspect affected tasks, contracts, dependencies, AC mappings, and gate relationships rather than reopening unrelated completed work.

### 1.1 Coverage and ownership

Check that every material requirement and AC assertion has concrete implementation and sufficient verification ownership. Every task must reference real ACs, and no task may introduce an unauthorized non-goal.

For ACs spanning components, distinguish the assertions each task proves and the product-level gate that checks the combined behavior. Many task IDs against one AC, or a final task claiming all ACs, does not by itself establish coverage.

### 1.2 Granularity and integration

Check that each task has one primary deliverable, a clear boundary, and evidence achievable for that boundary. Apply the right-sizing triggers in `task-planning.md` without mechanically splitting by layer or file count.

Look for both failure modes:

- an oversized vertical task combining persistence, runtime, lifecycle, API, client, and acceptance;
- excessive technical fragments that cannot be independently accepted and defer their own tests.

Where components converge, identify an owner, entry point, and early real-semantic integration path. Required safety invariants must not be delayed into optional enhancements. Check that the final gate has not become a new container for independent migration, environment, recovery, performance, and integration deliveries.

### 1.3 Dependencies and contracts

Check that start dependencies truly block safe execution; no necessary prerequisite is absent; and unrelated tasks are not artificially serialized. Verified contract milestones may permit consumer work before a producer's full delivery.

Check acceptance dependencies separately when present. Detect cycles, especially between a task's completion and a gate that requires that task to be complete.

For parallel work, verify authoritative contracts, readiness evidence, consumer consistency, write ownership, and integration responsibility. Matching type names are not enough when state, timing, errors, or side effects remain undefined. A reusable helper recorded in implementation evidence must agree with the declared dependency boundary.

### 1.4 Decisions, migration, and environments

Check that required inventories occur before their mandated decision points, retention is not inferred from row existence, and irreversible changes have explicit prerequisites and authorization requirements.

Respect project non-goals over generic migration or deployment templates. Optional workers, queues, adapters, or compatibility mechanisms must not become mandatory gates without an approved activation decision.

Define required environment readiness and selected runtime behavior. Identify missing routes, outdated source/images or migration state, unavailable data, and inaccessible services as bounded readiness blockers, not automatic proof of a domain defect.

### 1.5 Evidence design and unresolved questions

Check that verification methods identify meaningful assertions and evidence scope. Distinguish fixtures, static scans, targeted behavior tests, actual component integration, browser layout smoke, and required live/deployed scenarios. Do not label representative tests as full support-matrix coverage without justification.

Scan for unresolved instructions such as `TBD`, `TODO`, `later`, `处理细节`, `适当处理错误`, `补相关测试`, and `类似前一任务`. Templates may contain placeholders; executable plans may not use them instead of decisions.

Move material design uncertainty to Spec questions. Blocking Questions stop affected implementation; Non-blocking questions need a default and impact boundary. Missing environmental access must not silently waive required acceptance.

### Planning-review conclusion

Record one of:

- `Ready`: reviewed scope is internally consistent and implementation-ready.
- `Ready with non-blocking assumptions`: explicit defaults permit implementation without changing the contract.
- `Blocked`: affected scope has unresolved decisions, missing contracts, invalid task boundaries, or unmet start prerequisites.

State the reviewed scope and separate planning readiness from outstanding runtime validation. A locally executable plan can be ready while a later deployment gate is still unavailable; that gate remains mandatory.

## 2. Final consistency review

The orchestrating agent owns this review. Inspect relevant code changes and inspectable evidence, not only task checkboxes or worker conclusions. Use risk-based targeted verification rather than automatically duplicating every test.

The review may inspect partial progress, but must not issue a full pass until every required assertion and gate for the claimed scope is satisfied.

Check implementation against goals, ACs, non-goals, shared contracts, state/data/permission semantics, and compatibility. Verify that evidence supports the specific claimed behavior and still applies to the relevant source/configuration/environment. Distinguish implementation milestones from feature acceptance.

Check that all checked tasks are valid; necessary local tests were not deferred without ownership; required integration/runtime gates passed; conditional tasks were correctly activated or excluded; and missing core implementation was not hidden in gate work.

Confirm synchronized Spec/Task status, current versus historical baseline descriptions, acceptance mappings, tests, configuration, documentation, and authorized commit handling. Reuse prior evidence where still valid; invalidate only the affected scope when later changes disprove it.

Maintain one final-review section in the task document:

```md
## 最终一致性 Review

- [ ] Spec 的全部验收断言均有明确实现与适当验证
- [ ] 所有已勾选任务满足自身完成条件且证据仍有效
- [ ] 必要集成、真实运行态与条件性门禁均已通过或有合法不适用依据
- [ ] 启动依赖、验收依赖与契约就绪证据正确且无循环
- [ ] 跨任务接口、类型、状态、时间、错误与副作用语义一致（如适用）
- [ ] 不存在未解决的 Blocking 问题、占位要求或未定义契约
- [ ] 实现未超出 Spec 范围，未把可选设施变成强制要求
- [ ] 证据类型、场景覆盖、代码版本与目标环境支持所声明的验收结果
- [ ] 测试、配置、文档、Spec/Task 状态与实际实现一致
- [ ] 必要实施 Step 已验证；提交处理符合授权且保留既有用户修改
- [ ] 未发现未处理的实现、Spec、任务或验收证据不一致

### Review 结论

- 结论：<通过 / 不通过 / 阻塞；注明验收范围>
- 已确认的问题及责任任务：
- 尚未通过的必要门禁与阻塞原因：
- 遗留风险或已确认的后续范围：
- 验证命令/过程、结果与证据引用：
```

Use `不通过` for established nonconformance and `阻塞` for missing required decisions, access, or evidence. Neither permits a full completion claim. Do not check items simply because the workflow reached the final phase.

Document-only work ends with planning review, not a fabricated implementation-review pass. A file-format or link check proves document integrity, not that future agents will always follow the workflow.

## 3. Handoff requirements

For document-only work, report paths, planning-review conclusion, source/verification limits, Blocking Questions, and remaining planning risks. Do not imply generated rules were installed or project code was changed.

For implementation, also report completed and incomplete deliverables, required outstanding gates and real blockers, actual validation results, final-review conclusion, and relevant commit status. Keep local implementation, integration acceptance, and target-runtime readiness distinguishable without duplicating their authoritative statuses.
