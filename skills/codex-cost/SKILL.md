---
name: codex-cost
description: Delegate substantial coding, code reading, testing, debugging, or browser validation through small, bounded assignments. Not for trivial work.
---

# Fresh-Context Delegation and Cost Control

Optimize for reliable completion and a small parent context. Treat Luna's model-call cost as negligible for this workflow: do not preserve a long worker conversation merely to save tokens or agent startups. The parent owns requirements, scope, key decisions, scheduling, and final acceptance; workers own bounded execution and local validation.

## 1. Choose Delegation and Models

Judge delegation benefit once for the overall task. Substantial exploration, cross-file work, tests, debugging, logs, or browser evidence normally belong in workers. Trivial local edits and small analysis/documentation tasks can stay with the parent. Naming a worker constrains model selection, but does not force delegation of an otherwise trivial task.

Once delegation is worthwhile, actually delegate. Do not repeat the benefit calculation for every small assignment or pull those assignments back into the parent simply because each is now small.

- Honor explicit user model, agent-role, reasoning, and selection constraints. Keep the current parent model and reasoning settings.
- Default non-visual work to the configured Luna worker; use the model actually configured for that role rather than a hard-coded model version.
- Frontend visual, layout, and styling work, including visual acceptance, must not go to Luna. Split visual and non-visual portions and use an eligible non-Luna worker for the visual portion. Non-visual frontend logic can still go to Luna.

Resolve the effective model and reasoning effort once for each selected role/configuration; recheck after a configuration change or conflicting spawn result. Explicit `model` and `model_reasoning_effort` values in a custom agent file take precedence; otherwise, explicit spawn settings precede `[agents]` defaults, then parent settings. A model selected by spawn/default without an effort uses that model's default effort; a role that sets only `model` preserves the previously resolved effort. Confirm the result honors the user's constraints and the model supports the effort. Report mismatches, unavailable models, or a Luna/visual conflict instead of silently falling back or inventing model IDs. See the official [Subagents documentation](https://developers.openai.com/codex/subagents/) for configuration semantics.

## 2. Split by Small, Verifiable Outcomes

Each assignment has one concrete deliverable, one primary execution surface, explicit dependencies, a narrow write set, and a local completion check. Keep its necessary reading, implementation, self-review, and focused tests together while they remain small.

Split at changes in objective, runtime, contract, required context, or write ownership. Do not give one worker an entire feature spanning database, queue, runtime, API, client, and end-to-end acceptance. Separate persistence, API behavior, client state logic, visual layout, shared wiring, and integration validation as needed. Do not split mechanically by individual file or tool call, but split further whenever independently verifiable outcomes or overlapping write sets would otherwise remain bundled.

Before marking assignments parallel-ready, list exact writable paths (or demonstrably disjoint narrow globs), stable read-only inputs, upstream outputs, shared resources, and the completion check for each. Include tests and tool-generated changes. Vague scopes such as "finish the backend" or "handle the frontend" are not dispatchable. Shared types, manifests, lockfiles, registries, and export entrypoints need a named owner and explicit dependencies rather than several workers each "fixing the wiring".

When exploration is needed to establish scope, make it a bounded discovery assignment first. When debugging grows into several hypotheses, repeated failed repairs, or unrelated areas, checkpoint the facts and return `needs_split`; do not wait for compaction or loss of earlier constraints. The parent narrows the remaining work into new assignments rather than resuming an unbounded loop.

## 3. Persist the Plan, Not the Conversation

Before the first worker starts, use the existing spec/task document as the authoritative task ledger. If none exists, create one small project-appropriate task file; do not introduce a second competing plan.

Record the overall objective and acceptance criteria, settled decisions and exclusions, change baseline, and a compact task table:

```text
ID | Outcome | Dependencies | Write set / resources | Owner / workspace | Status | Output / checks / blocker
```

Use `pending`, `running`, `worker_done`, `blocked`, and `needs_split`. `worker_done` means execution and required local checks were reported complete, not that the parent accepted the result. Track integration readiness and final acceptance separately.

The parent alone updates the shared ledger and planning decisions during execution. Workers return compact status and persist evidence only to their assigned task-specific artifact paths, not a common report file. Before closing a worker, record its changed paths, dependency contracts, validation commands/results, output revision or patch, and unresolved issues. Preserve existing user edits and distinguish them from task changes. A fresh conversation must not reset the working tree.

Keep only the objective, active decisions, ledger location, active task IDs/ownership, and short status in the parent conversation. Before final review or after parent compaction, reload the authoritative criteria, ledger, and live worker state; reconcile ownership before dispatching again. Give workers their assignment and relevant decision/dependency excerpts, not the whole ledger history or previous transcripts.

## 4. Parallel Scheduling and Exclusive Ownership

There is no skill-level single-worker limit. Run independent, dependency-ready assignments in parallel within the user's constraints and configured concurrent-thread capacity (`agents.max_concurrent_threads_per_session`; see the [Configuration Reference](https://developers.openai.com/codex/config-reference/)). Do not change local configuration to enable delegation. Do not increase concurrency by weakening task boundaries or launching dependent work early. If independence cannot be established, split further or serialize only the conflicting assignments.

- **One active writer per path:** reserve write sets before dispatch. No two workers may modify the same repository-relative file concurrently, even in different line ranges or worktrees. Count create/delete/rename paths, tests, snapshots, generated files, formatting, and dependency-install effects. Shared files get one owner or a separate bounded prerequisite/integration assignment. The parent must not edit a worker-owned file concurrently.
- **Stable inputs and contracts:** read-only tasks may overlap on stable inputs, but never consume another worker's in-progress files. Wait for the required output to be locally validated and available in the consumer workspace, or use a recorded immutable input snapshot with a planned integration check. Establish shared contracts before parallel producer/consumer implementation; a contract change pauses affected consumers and invalidates affected evidence.
- **Shared resources count too:** reserve or isolate build output directories, test databases/fixtures, ports, browser profiles, and other mutable resources. Commands that touch unowned files or shared state are not allowed merely because the intended code edits are disjoint. Scope them narrowly, isolate their effects, or schedule them without conflicting work.
- **Respect workspace boundaries:** use isolated worktrees when available and useful; otherwise enforce disjoint writes in the shared workspace. Worktrees do not replace ownership or dependency checks. Only the designated integrator may mutate the shared integration branch/index; workers must not run broad Git staging, reset, clean, or merge operations that could capture or discard others' changes. Transfer task-specific output through bounded integration assignments with one writer to the target at a time. Downstream tasks wait for the integrated output they require.
- **Stop before expanding scope:** an unowned edit, unexpected concurrent change, or resource collision returns `blocked` or `needs_split` before further writes. Preserve all parties' changes; never resolve this by overwriting, reverting another worker, or choosing the last result. The parent pauses affected work, reassigns ownership or schedules a fresh repair, and releases a reservation only after confirming its worker and any mutating processes have stopped and the handoff is recorded. Unrelated ready work may continue.

These are scheduling rules, not a claim that prompts create filesystem locks or guarantee isolation. Unverifiable isolation requires serialization of the affected work, not optimistic concurrent writes.

## 5. One Assignment, One Fresh Worker

Create a **new worker thread for every assignment**, even when the model and agent role stay unchanged. Never resume a completed worker for a different assignment or for findings from the final review. Reuse role configuration, not conversation history. Close each worker after completion or a safe checkpoint and a recorded handoff; independent workers need not wait for that closure to start.

Use only fresh-thread/history controls exposed by the active tools. Disable parent-history inheritance when supported, and pass a self-contained assignment instead of a parent transcript or old worker chat. A new thread ID is not proof of clean history. When clean-history creation is unsupported or cannot be verified, report that limitation before dispatch rather than inventing flags, claiming isolation, or silently using inherited history.

A worker executes its assigned work directly, without creating further sub-agents. It may finish the small local implementation/test/repair loop, but must stop at its stated completion condition or checkpoint boundary. No worker may pull the next task from the queue itself.

## 6. Self-Contained Assignment and Compact Return

Give each worker a short contract containing everything necessary to act without the parent transcript:

```text
Task: <ID and one concrete outcome>
Workspace / baseline: <directory, revision/current state, existing edits to preserve>
Inputs / dependencies: <stable read-only inputs, settled contract, available upstream output>
Exclusive write set: <owned paths, including tests/generated files; everything else read-only>
Resources / integration: <isolated or reserved mutable resources, output transfer owner>
Constraints / permissions: <exclusions, invariants, compatibility, allowed tools/actions>
Validation: <focused checks, required evidence, completion condition>
State / handoff: <read-only ledger path, task-specific artifact destination>
Stop: <complete, blocked, or needs_split; no scope expansion or sub-agents>
Return: <ID, status, changed paths, output revision/patch, checks/results, evidence, risks>
```

Once the parent can define this contract, stop duplicating implementation exploration. Workers absorb source searches, logs, traces, build output, DOM, Console, and Network evidence. Save detailed evidence to assigned artifacts when necessary; return a compact status packet, not source dumps, full logs, screenshots, or a chronological narrative. Include reproduction details for blockers without flooding the parent.

## 7. Dispatch Without Per-Assignment Parent Review

During execution, the parent receives compact status, updates the ledger and ownership, and schedules dependency-ready, conflict-free assignments. Check reported status, changed-path ownership, required evidence presence, output availability, and blockers; **do not routinely read each diff, review the worker's reasoning, rerun its checks, or accept/reject its code after every return**. Scheduling and integration bookkeeping are not intermediate code-review gates.

Local validation is not deferred. Each worker self-reviews and runs its assigned checks before reporting `worker_done`. Validate producer/consumer contracts and add small integration checks at dependency boundaries so downstream work does not build on known failures. Dependent workers verify the particular inputs they consume, not review the whole upstream implementation.

A failed required check, missing dependency, contract conflict, write/resource collision, scope expansion, or action requiring new authorization pauses affected dependents immediately. The parent resolves only the blocking decision or schedules a fresh bounded investigation/repair; unrelated ready work may continue in parallel. Never reinterpret failed or missing validation as success to keep dispatch moving.

Browser validation belongs to the eligible worker and covers directly affected UI, interaction, or browser behavior only. Apply the same resource-ownership rules to browser sessions. Do not inspect the whole site or repeatedly collect browser output without a specific need. The parent does not repeat routine browser validation mid-workflow.

## 8. One Consolidated Final Review Phase

Once the planned implementation assignments are `worker_done` and their outputs are integrated, use fresh, bounded validation assignments for required integration/regression checks against a recorded, stable final state. Pause mutations to that state during validation/review or validate an immutable snapshot; later changes require affected checks to be rerun. Validation tasks may run in parallel only with independent resources. Do not infer integration success from isolated unit tests. Keep substantial validation out of the parent context.

When the entire task set, including required validation, is ready, the parent performs one consolidated review phase:

- Compare the actual final changes against the original objective, acceptance criteria, exclusions, and recorded baseline. Inspect the relevant final diffs and important call sites rather than trusting completion summaries.
- Check cross-task contracts, integration, compatibility, and regressions; confirm required test and browser evidence applies to the latest state. Inspect evidence selectively and independently check doubtful or high-risk areas as needed.
- Confirm all required outcomes are covered and no blocking defect, missing validation, or unresolved required task remains.

For a large diff, review bounded sections with a coverage checklist inside this final phase instead of loading everything into one prompt. This is a single acceptance phase, not a requirement to use one tool call or skip any task's coverage.

If review finds defects or missing evidence, create small repair/validation assignments with **fresh workers** under the same ownership and dependency rules. After that repair batch finishes, re-review the changed and affected areas and updated integration evidence. Do not reopen the original workers or reinstate per-assignment review.

Report completion only after required checks and the parent's final review pass. Otherwise report completed work, remaining work, the exact blocker, and known risks as blocked or partially complete; `worker_done` alone never means overall completion.
