# Implementation

Apply only when the current request includes implementation. Document-only work stops after its planning review.

## 1. Implementation gate

Before editing, load the assigned leaf's execution packet, applicable Spec assertions/invariants, ready contracts, and current worktree state. Check its inputs, exclusions, write ownership, local validation, and stopping point against the sizing gate in `task-planning.md`. Read named sections and entry points first, not all sibling tasks or historical logs. The affected plan must pass preflight and have no unresolved Blocking Question that materially changes implementation or acceptance.

Work only on the verified dependency frontier described in `task-planning.md`: required tasks are complete, or an explicitly named contract milestone has sufficient readiness evidence. Do not treat an unchecked prerequisite as satisfied because parallel work is desirable.

Perform required inventories and readiness checks before the decisions they govern. Missing deployment/data access may block a required runtime gate without blocking safe, independent local work. Never treat an unavailable environment as a passed check.

Preserve user changes. Avoid speculative refactoring and unrequested external mutations, migrations, deployments, or commits. A required destructive operation still needs the applicable authorization.

## 2. Execution-time granularity review

Recheck the sizing gate before each leaf and whenever its objective, required context, runtime, or write/verification boundary changes. Stop expansion and report `needs_split` when independent deliveries emerge, debugging branches into unrelated hypotheses, repeated repairs produce no new evidence, or broad re-exploration is needed to recover constraints. Do not wait for compaction or an exhausted context window. A missing dependency, environment, permission, or contract decision is `blocked`, not a reason to keep guessing.

Record the checkpoint below before re-planning. Adding Steps, workers, or a bigger context window does not repair an invalid task boundary; a long-running test alone does not require splitting when its scope is still bounded.

When splitting is necessary:

1. Pause expansion of the affected scope; preserve code, worktree changes, and evidence. Independent dependency-ready work may continue.
2. Retain the original ID as a group or mark it explicitly as split. Create bounded child tasks without renumbering unrelated history.
3. Map every original completion obligation and AC assertion to a child task or explicit gate. Do not delete requirements, lower evidence standards, or move them outside feature acceptance to make checkboxes pass.
4. Declare the real start/acceptance dependencies, contract milestones, integration owner, and required environments. Do not introduce a dependency cycle.
5. Map existing implementation and evidence to the new boundaries. Inherit only evidence that still proves the current assertions for the relevant source/configuration; do not mark children complete by inference from the old checkbox.
6. Run planning preflight on the affected subgraph and resume from the verified frontier.

Update only Tasks when the change is sequencing or acceptance ownership with unchanged feature obligations. Update the Spec first when behavior, interfaces, state/data/permission semantics, compatibility, or acceptance standards change.

Re-scoping preserves completed work and unaffected evidence; it does not justify redoing them or creating extra commits. Remaining child tasks are separate execution packets. Follow the active delegation policy for fresh-thread creation and do not send the whole remaining group back as one assignment.

### Durable checkpoint and fresh-context continuation

At task completion, blockage, scope growth, or before a planned context switch, persist a compact record in the existing task ledger. During delegation, its designated owner updates the ledger; workers return the record and write detailed evidence only to their assigned artifact paths.

```text
Task / state: <ID; running, worker_done, blocked, or needs_split as applicable>
Output / baseline: <changed paths; revision or preserved uncommitted patch/workspace>
Evidence: <checks and results; relevant environment; durable report references>
Decisions / remaining: <settled constraints; unfinished assertion; exact blocker or next action>
Ownership / live work: <worker/workspace and any still-running process or reserved resource>
```

These are execution states, not substitutes for acceptance: `worker_done` reports local completion and never proves feature acceptance. Keep original requirements in the Spec/Task, not solely in a summary. Store logs outside the active ledger; return decisions and evidence pointers rather than transcripts.

For a new leaf, prefer fresh task context and pass only its packet and relevant settled facts. When delegation is selected, use the fresh-worker rules of the existing policy (for example `codex-cost`); do not resume an old worker for unrelated work. Use only history controls actually exposed by the active tools, and report when clean history cannot be established. A new thread ID, model switch, or worktree is not proof of a clean conversation. Without delegation, keep one bounded leaf active and checkpoint for the next available fresh-context continuation; do not pretend a Markdown instruction reset the current session.

After interruption or compaction, reload the applicable criteria and ledger, inspect actual changes, and reconcile live workers/processes and ownership before dispatching again. Confirm the necessary outputs are present in the current workspace. Do not duplicate still-running work, reset the worktree, or rerun valid completed tasks. Compaction is a continuity mechanism, not a substitute for task sizing or durable state.

## 3. Task and Step execution

A Step is a meaningful implementation-and-validation unit inside one small task, not an independent task or mandatory commit boundary. Expand only the active dependency-ready leaf into detailed Steps. If a Step has a different independently verifiable outcome or context boundary, promote it to a child task rather than growing the leaf.

A Step should have a concrete result and suitable validation. Combine related mechanical edits; do not create isolated import, formatting, rename, or unvalidated half-change Steps merely to inflate progress.

Example of one bounded persistence task:

```text
Tn：冻结输入后可按标识读取且不可覆盖
  Step 1：实现写入/读取路径和行为覆盖 → 定向验证
  Step 2：补齐原子发布与错误路径 → 失败场景和回归验证
  Task 验证：当前边界的全部完成条件成立
后续真实运行态联通由已命名的关联门禁负责，不隐藏在本任务末尾。
```

Implement required safety invariants with the minimal path. Do not postpone atomicity, isolation, identity, or duplicate protection when the chosen execution model requires them for correctness. Spec-required enhancements may be separate deliveries, but are not optional merely because the early path runs.

## 4. Validation ladder and evidence

Validate each completed Step and Task at the level needed to prove its declared result. Possible evidence includes targeted tests, contract or component integration, type/static checks, builds, regressions, and manual checks when automation is impractical.

Use a risk-based ladder:

- run targeted behavior and failure checks for the changed boundary;
- run affected package/contract checks when relevant changes are coherent;
- run required integration, broader regression, browser, or target-runtime gates at their declared boundaries.

Do not run the full repository, full browser journey, or the same expensive suite after every Step or in every subagent solely for procedural symmetry. Reuse sufficient evidence when its inputs and relevant implementation remain unchanged. Rerun affected checks after changes to covered code, contracts, configuration, fixtures, dependencies, or environment assumptions.

Evidence should identify the assertion, command or procedure, result, evidence kind, and enough source/environment information to establish applicability. For cross-repository or runtime evidence, identify the relevant source/deployed revisions or image IDs, migration state, selected adapter, and configuration differences. Do not expose secrets.

When changes are uncommitted, say so and identify the tested worktree scope rather than claiming a clean commit was tested. Use references to durable logs or reports for long output; keep task evidence concise.

```md
- [ ] Tn：<交付目标>
  - 实现状态：已实现
  - 定向验证：通过；<命令/过程>；<关键断言>；<代码或工作区基线>
  - 证据边界：<例如：真实领域逻辑 + 固定输入；不证明在线 Provider 可用>
  - 剩余条件：<本任务仍缺的必要检查及阻塞原因>
  - 关联门禁：<仅在有独立产品级门禁时引用>
```

Use accurate results: `通过`, `失败`, `未执行`, `阻塞`, or `不适用`. Give the reason for the latter four. `不适用` requires a real scope/conditional-activation basis; it cannot waive a required criterion. Skipped or blocked checks never count as passed.

Test counts, successful builds, and static scans support only their actual assertions. Browser layout checks do not prove persistence or execution. Fixtures do not prove live data access. Healthy containers do not prove the intended feature version or routes are deployed. Verify readiness before diagnosing application behavior from a mismatched environment.

A required package check blocked by another parallel change must be isolated and rerun, or retained as outstanding with an explicit owner/gate. It cannot disappear into an unassigned "rerun later" note. Move a product-level check to a gate only through an explicit acceptance-preserving plan update; required local validation still blocks local completion.

## 5. Parallel execution and review ownership

Apply the existing delegation policy without adding model choices or a single-worker limit here. When delegation is selected, give each worker one executable leaf, not a feature/group or open-ended task queue. Use the task packet and checkpoint contract above; workers own local self-review and focused checks before returning.

Reserve writable paths and mutable resources before dispatch, including tool-generated changes. Shared contracts, migrations, exports, lockfiles, and the authoritative ledger have one designated writer. The parent must not edit worker-owned files concurrently. Use isolated workspaces where useful, but transfer validated outputs through an owned integration step and verify availability before consumers start. If a write/resource conflict or contract change appears, pause affected dependents before further writes; unrelated ready work may continue.

During execution, the orchestrator checks status, ownership, output availability, evidence presence, and blockers to schedule work. Do not turn every worker return into a mandatory parent diff review or repeated full test run. Missing/failed checks still block the affected dependency frontier; scheduling is not permission to ignore them.

The orchestrator owns the final consistency review of actual changes and evidence, especially cross-task seams, data safety, lifecycle races, and high-risk assertions. Reuse credible evidence; rerun affected or doubtful checks when stale, missing, ambiguous, or contaminated. A worker's “done” message is not acceptance, and delegation does not require a second model or duplicate review.

## 6. Task and feature status

- Check a task only when all of its declared completion conditions, required verification, and acceptance dependencies pass.
- Keep partial tasks unchecked and record the remaining condition precisely. Code written is not task completion.
- Keep integration/runtime gate status in one authoritative place; link rather than duplicating four phase states under every task.
- Local tasks may complete before associated product gates, but the feature remains incomplete while any required gate is outstanding.
- A failed integration gate does not invalidate every local result. Reopen only tasks whose own behavior or evidence was disproved; assign missing behavior explicitly.
- Update dependencies and consumers when an actual contract or helper dependency changes. Restore affected checked tasks to incomplete when their evidence is invalidated, then revalidate.
- Keep Spec status, task summaries, AC mapping, and final Review consistent. Treat baseline descriptions as historical when appropriate.

Retain enough historical evidence to explain decisions, but do not grow the active task document into a full command transcript. A completion ratio measures task count, not remaining work or readiness.

## 7. Commit boundaries

Commit creation requires authorization from the request or project rules. A Step is an implementation/validation unit; a commit is an authorized version-control and Review boundary.

One commit may contain one or several closely related verified Steps forming a coherent reviewable change. Task splitting does not require one commit per child, and parallel execution does not require one large combined commit. Do not target a commit count or include unrelated user changes.

Without authorization, leave changes uncommitted, preserve evidence, and report that state. A suggested commit boundary is optional; never create commits merely to satisfy the workflow.

## 8. Drift and completion

When implementation contradicts the documents, update the affected plan rather than silently diverging. Apply the Spec-first rule for stable contract changes and the re-planning procedure for execution-only changes.

Run the final consistency review in `review.md` before claiming completion. Review large changes in bounded sections with coverage tracking against a stable integrated baseline; later mutations invalidate affected evidence. Findings become small repair/validation tasks, followed by review of the changed and affected scope, not a revived unbounded worker conversation. Report outstanding tasks/gates, actual validations, scope limits, review conclusion, and authorized commit status. An implementation milestone is not full feature acceptance.

## Codex documentation basis

Checked against the official documentation on 2026-09-24:

- [Subagents](https://developers.openai.com/codex/subagents/): bounded delegation, concise returned results, and caution with concurrent writers.
- [Developer commands](https://developers.openai.com/codex/cli/slash-commands/): in the CLI, `/new` starts a fresh chat, `/fork` copies the current conversation, and `/compact` summarizes it. These are client commands, not assumed agent-callable tools.
- [ExecPlans](https://developers.openai.com/cookbook/articles/codex_exec_plans): durable, self-contained plans and observable progress. Reuse the existing Spec/Task ledger; do not require an additional `PLANS.md`.

The sizing gate and checkpoint rules are this workflow's policy, not vendor-enforced limits. Runtime capabilities must still be checked in the active client.
