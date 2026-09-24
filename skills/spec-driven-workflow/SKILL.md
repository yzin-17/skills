---
name: spec-driven-workflow
description: Plan, review, or implement non-trivial software changes, refactors, and migrations through Specs and small verifiable tasks. Re-split oversized work, preserve task handoffs, track confirmed TODOs, and archive completed work. Not for simple questions, routine low-risk edits, general documentation, or explicitly plan-free work.
---

# Spec-Driven Workflow

Maintain durable Spec and task contracts. Each executable leaf must fit a focused read–implement–validate run, not merely be understandable in a fresh context. Implementation begins only when the current request includes it.

## Reference routing

Load only the references needed for the current phase:

- Spec authoring or stable-contract changes: [references/spec-authoring.md](references/spec-authoring.md)
- Task sizing, execution packets, dependencies, or re-scoping: [references/task-planning.md](references/task-planning.md)
- Implementation, checkpoints, evidence, or delegation handoffs: [references/implementation.md](references/implementation.md)
- Planning preflight or final consistency review: [references/review.md](references/review.md)
- Confirmed follow-up implementation and TODO synchronization: [references/todo-tracking.md](references/todo-tracking.md)
- Completed-task archival: [references/archive-handling.md](references/archive-handling.md)

An assigned executor reads its task, applicable Spec assertions/invariants, ready contracts, and relevant implementation guidance; it does not restart Spec authoring or load every reference, sibling task, and historical log. During re-planning, read only affected planning/review sections. Never omit an applicable constraint merely to shorten context.

## Operating contract

- Follow the request, project rules, and confirmed context. This skill does not authorize scope expansion, external mutations, deployment, destructive migration, or commits.
- Respect source boundaries. Distinguish requirements, reported facts, directly verified facts, assumptions, and unresolved decisions; do not claim unavailable code or environments were inspected.
- Preserve worktree changes. Reuse project terminology, interfaces, paths, and test entry points. Otherwise use `docs/specs/YYYY-MM-DD-<task-id>.md` and `docs/tasks/<task-id>.md`; keep the Spec's first-creation date and filename stable.
- The Spec owns stable intent, boundaries, behavior, and acceptance. The linked task document owns executable scope, dependencies, context entry points, evidence, and status. Reuse it as the execution ledger rather than creating a competing plan.
- A cohesive Spec may contain many small tasks. Separate Specs only for independently deliverable subsystems, not merely because tasks cross runtimes.
- A leaf owns one concrete outcome, one primary execution surface, bounded inputs/write scope, and its own validation. Independently verifiable deliveries need separate leaves, not more Steps under a large checkbox. Stop and re-split remaining work when this boundary fails.
- Local completion and feature acceptance are distinct. All required integration/runtime gates remain mandatory; neither a large task nor a catch-all final gate may hide independent deliveries.
- TODO indexes confirmed follow-up implementation, not unresolved design, speculative ideas, or incomplete current-scope work. Active source Specs/Tasks remain authoritative; archived sources are provenance only. Never move current acceptance obligations into TODO/archive to claim completion.
- Archive a task document only after its entire claimed scope and final consistency review pass and it owns no unresolved work. Transfer valid future work to TODO or an active successor first. Transferred historical references do not block archival; still-current Specs remain active.
- Keep this skill model-neutral. Apply the existing delegation policy for models, fresh worker threads, and concurrency; do not require subagents or fixed file, time, token, task, or commit counts. Small tasks must remain usable without a particular runtime configuration.

## Workflow

1. Identify document-only versus implementation scope and inspect the relevant permitted sources. Resolve prerequisite inventories, environment checks, and contract decisions before dependent work; use bounded discovery when the implementation boundary is unknown.
2. Create/update the Spec and linked task document. Give ACs stable IDs and map each material assertion to an implementation owner and sufficient verification.
3. Plan fresh-context executable leaves using `task-planning.md`: precise inputs, exclusions, write ownership, local checks, and stop conditions. Record real dependencies and an early real-semantic integration path. Expand only a dependency-ready leaf into detailed Steps, not the whole feature into a long execution script.
4. Run planning preflight. Re-split oversized leaves before dispatch. Document-only work stops here unless lifecycle cleanup was requested; unresolved Blocking Questions stop affected implementation, not unrelated ready work.
5. Execute on the verified dependency frontier. Keep local implementation, self-review, and focused checks together. Checkpoint at completion, interruption, blockage, or scope growth; re-plan only remaining affected work while preserving valid evidence and original AC obligations. Change the Spec first when its stable contract changes.
6. Synchronize confirmed follow-up items through `todo-tracking.md` when they arise or change. Keep execution failures and current-scope checkpoints in the active task document, not TODO.
7. Before claiming completion, reconcile the ledger with actual changes and evidence, synchronize affected TODO entries, and run the single final consistency review. Review large results in bounded sections against a stable baseline, not by loading the whole execution history.
8. Apply `archive-handling.md` only when the operating contract's archival conditions pass. Preserve evidence and source links and update active entry points.

## Handoff

Report affected paths, planning/final-review conclusion appropriate to the phase, completed and incomplete scope, blockers, actual validations and limitations, TODO/archive changes, and authorized commit status when relevant. State when only files were generated and nothing was installed or applied. Do not equate written code, fixture tests, browser layout checks, or worker completion reports with feature acceptance.
