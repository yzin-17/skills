---
name: codex-cost
description: Use for substantial coding, code reading, testing, debugging, or browser validation when the top-level orchestrator is not Luna. Do not activate as a delegated worker. Split delegated work into small, serial assignments, each with a fresh worker context. Default non-visual work to Luna; never assign frontend visuals, layout, or styling to Luna. Keep durable task state and defer parent review until the complete task set is ready.
---

# Fresh-Context Delegation and Cost Control

**Applicability:** Only the top-level, non-Luna orchestrator uses this skill. Luna, including GPT-6 Luna, executes directly when it is the parent. A delegated worker of any model executes its assignment directly and must not invoke this skill or create sub-agents.

Optimize for reliable completion and a small parent context. Treat Luna's model-call cost as negligible for this workflow: do not preserve a long worker conversation merely to save tokens or agent startups. The parent owns requirements, scope, key decisions, scheduling, and final acceptance; workers own bounded execution and local validation.

## 1. Choose Delegation and Models

Judge delegation benefit once for the overall task. Substantial exploration, cross-file work, tests, debugging, logs, or browser evidence normally belong in workers. Trivial local edits and small analysis/documentation tasks can stay with the parent. Naming a worker constrains model selection, but does not force delegation of an otherwise trivial task.

Once delegation is worthwhile, actually delegate. Do not repeat the benefit calculation for every small assignment or pull those assignments back into the parent simply because each is now small.

- Honor explicit user model, agent-role, reasoning, and selection constraints. Keep the current parent model; do not assume the parent must be Sol or change its reasoning mode to enable delegation.
- Default non-visual work to the configured Luna worker. On GPT-6 setups, `gpt-6-luna` is an example model ID, not permission to override a user-selected model or an existing role configuration.
- Frontend visual, layout, and styling work, including visual acceptance, must not go to Luna. Split visual and non-visual portions and use an eligible non-Luna worker for the visual portion. Non-visual frontend logic can still go to Luna.
- Resolve the effective worker configuration before spawning; a role name alone does not prove which model runs. Report unavailable models, unsupported settings, or a requested Luna/visual conflict. Do not silently substitute models, inherit the parent's expensive model, or invent model IDs.

Read [Codex runtime notes](references/codex-runtime.md) only when migrating configuration or diagnosing model, concurrency, or context-isolation behavior.

## 2. Split by Small, Verifiable Outcomes

Each assignment has one concrete deliverable, one primary execution surface, explicit dependencies, and a local completion check. Keep its necessary reading, implementation, self-review, and focused tests together while they remain small.

Split at changes in objective, runtime, contract, or required context. Do not give one worker an entire feature spanning database, queue, runtime, API, client, and end-to-end acceptance. For example, separate a persistence change, an API change, client state logic, visual layout, and integration validation, with explicit contracts between them. Do not split mechanically by individual file or tool call.

When exploration is needed to establish scope, make it a bounded discovery assignment first. When debugging grows into several hypotheses, repeated failed repairs, or unrelated areas, checkpoint the facts and return `needs_split`; do not wait for compaction or loss of earlier constraints. The parent narrows the remaining work into new assignments rather than resuming an unbounded loop.

## 3. Persist the Plan, Not the Conversation

Before the first worker starts, use the existing spec/task document as the authoritative task ledger. If none exists, create one small project-appropriate task file; do not introduce a second competing plan.

Record the overall objective and acceptance criteria, settled decisions and exclusions, working directory and change baseline, and a compact task table:

```text
ID | Outcome / scope | Dependencies | Status | Output / evidence | Blocker / next step
```

Use `pending`, `running`, `worker_done`, `blocked`, and `needs_split`. `worker_done` means execution and required local checks were reported complete, not that the parent accepted the result. Track final acceptance separately.

Persist changes, contract details needed by dependents, validation commands/results and artifact locations, and unresolved issues before closing a worker. Preserve existing user edits and distinguish them from this task's changes. Artifacts and evidence must be accessible from the next worker's workspace; transfer isolated-worktree output before scheduling its dependents. A fresh conversation must not reset the working tree.

Keep only the objective, active decisions, ledger location, current task ID, and short status in the parent conversation. Before final review or after parent compaction, reload the authoritative criteria and ledger. Give workers only their assignment and relevant decision/dependency excerpts, not the whole ledger history or previous transcripts.

## 4. One Assignment, One Fresh Worker

Allow at most **one open worker at a time**, including discovery, implementation, validation, and repair workers. The primary thread is not a worker. Wait for completion or a safe checkpoint, persist the handoff, close the worker, then start the next one. Verify a cancelled worker has stopped before replacing it.

Create a **new worker thread for every assignment**, even when the model and agent role stay unchanged. Never resume a completed worker for a different assignment or for findings from the final review. Reuse role configuration, not conversation history.

Use the current runtime's supported fresh/no-history creation mode; disable conversation-history inheritance when that control exists. Do not fork the full parent transcript, replay old worker chats, or describe a resumed thread as fresh. A new thread ID alone does not establish a clean context. If clean-history creation cannot be confirmed or is unsupported, report the exact limitation before proceeding; do not invent a parameter, claim isolation, or silently substitute a history-inheriting run. A skill instruction cannot manufacture a runtime capability.

A worker may finish the small local implementation/test/repair loop inside its current assignment, but must stop at its stated completion condition or checkpoint boundary. No worker may pull the next task from the queue itself.

## 5. Self-Contained Assignment and Compact Return

Give each worker a short contract containing everything necessary to act without the parent transcript:

```text
Task: <ID and one concrete outcome>
Workspace / baseline: <directory, current state, existing edits to preserve>
Inputs / dependencies: <specific files, relevant decisions, available upstream output>
Scope / exclusions: <allowed changes and what must not change>
Constraints / permissions: <invariants, compatibility, allowed tools/actions>
Validation: <focused checks, required evidence, completion condition>
State / handoff: <ledger path and artifact locations>
Stop: <complete, blocked, or needs_split; no new scope or sub-agents>
Return: <ID, status, changed paths, checks/results, evidence links, risks, next step>
```

Once the parent can define this contract, stop duplicating implementation exploration. Workers absorb source searches, logs, traces, build output, DOM, Console, and Network evidence. Save detailed evidence to artifacts when necessary; return a compact status packet, not source dumps, full logs, screenshots, or a chronological narrative. Include reproduction details for blockers without flooding the parent.

## 6. Dispatch Without Per-Assignment Parent Review

During execution, the parent only receives the compact status packet, updates the ledger, and schedules the next dependency-ready assignment. Check the reported status, presence of required evidence, and blockers; **do not routinely read each diff, review the worker's reasoning, rerun its checks, or accept/reject its code after every return**.

Local validation is not deferred. Each worker self-reviews and runs its assigned checks before reporting `worker_done`. Validate producer/consumer contracts and add small integration checks at dependency boundaries so downstream work does not build on known failures. Dependent workers verify the particular inputs they consume, not review the whole upstream implementation.

A failed required check, missing dependency, contract conflict, scope expansion, or action requiring new authorization pauses affected dependents immediately. The parent resolves only the blocking decision or schedules a fresh bounded investigation/repair; unrelated ready work may continue serially. This is exception handling, not a routine intermediate review gate. Never reinterpret failed or missing validation as success to keep the queue moving.

Browser validation belongs to the eligible worker and covers directly affected UI, interaction, or browser behavior only. Do not inspect the whole site or repeatedly collect browser output without a specific need. The parent does not repeat routine browser validation mid-workflow.

## 7. One Consolidated Final Review Phase

Once the planned implementation assignments are `worker_done`, use fresh, bounded validation assignments for required integration/regression checks against the assembled final state. Do not infer integration success from isolated unit tests. Keep substantial validation out of the parent context.

When the entire task set, including required validation, is ready, the parent performs one consolidated review phase:

- Compare the actual final changes against the original objective, acceptance criteria, exclusions, and recorded baseline. Inspect the relevant final diffs and important call sites rather than trusting completion summaries.
- Check cross-task contracts, integration, compatibility, and regressions; confirm required test and browser evidence applies to the latest state. Inspect evidence selectively and independently check doubtful or high-risk areas as needed.
- Confirm all required outcomes are covered and no blocking defect, missing validation, or unresolved required task remains.

For a large diff, review bounded sections with a coverage checklist inside this final phase instead of loading everything into one prompt. This is a single acceptance phase, not a requirement to use one tool call or skip any task's coverage.

If review finds defects or missing evidence, create small repair/validation assignments with **fresh workers**. After that repair batch finishes, re-review the changed and affected areas and updated integration evidence. Do not reopen the original workers or reinstate per-assignment review.

Report completion only after required checks and the parent's final review pass. Otherwise report completed work, remaining work, the exact blocker, and known risks as blocked or partially complete; `worker_done` alone never means overall completion.
