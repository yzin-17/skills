---
name: spec-driven-workflow
description: Use when creating, updating, reviewing, implementing, or closing software Specs and linked task documents, including re-scoping tasks that become difficult to verify during execution, tracking confirmed follow-up implementation in a repository TODO index, and archiving completed task documents without losing historical traceability. Also use for non-trivial changes, refactors, or migrations that need stable acceptance criteria, bounded deliverables, verification evidence, consistency review, and document lifecycle handling. Do not use for general documentation, simple questions, routine low-risk edits, one-line changes, or explicitly plan-free work.
---

# Spec-Driven Workflow

Maintain durable Spec and task-document contracts. Implementation begins only when the current request includes it.

## Reference routing

Read only the references required for the current phase:

- Spec authoring or stable-contract changes: [references/spec-authoring.md](references/spec-authoring.md)
- Task planning, dependencies, acceptance boundaries, or re-scoping: [references/task-planning.md](references/task-planning.md)
- Confirmed follow-up implementation, TODO index synchronization, or resuming TODO work: [references/todo-tracking.md](references/todo-tracking.md)
- Completed-task archival and post-completion document lifecycle: [references/archive-handling.md](references/archive-handling.md)
- Planning preflight or final consistency review: [references/review.md](references/review.md)
- Implementation, evidence, delegation handoff, or execution-time re-planning: [references/implementation.md](references/implementation.md)

Load references progressively. For document-only work, read implementation guidance only when needed to assess executability. When re-scoping during implementation, consult the affected planning and review sections rather than restarting the entire workflow.

## Operating contract

- Follow the current request, applicable project rules, and confirmed context. These instructions do not authorize scope expansion, external mutations, deployment, destructive migration, or commits.
- Respect the requested source boundary. Distinguish confirmed requirements, source-reported facts, directly verified facts, assumptions, and unresolved decisions. Do not claim to have inspected unavailable code or environments.
- Preserve existing worktree changes. Reuse project terminology, interfaces, document locations, and test entry points.
- Without a repository convention, use `docs/specs/YYYY-MM-DD-<task-id>.md` and `docs/tasks/<task-id>.md`. Keep the Spec's first-creation date and filename stable on later revisions.
- The Spec owns stable intent, domain boundaries, behavior, and acceptance. Tasks own implementation scope, dependencies, local completion conditions, evidence, and status.
- A formal TODO document is only an index of confirmed follow-up implementation. While its source Spec/Task is active, that source remains authoritative. An archived source is provenance only and must not become the current implementation contract.
- Never move a current-scope acceptance obligation into TODO or archive to make the current scope appear complete.
- Prefer separate Spec units for independently deliverable subsystems. Multiple runtimes or many tasks alone do not justify separate Specs; a cohesive Spec may contain several bounded tasks and explicit gates.
- A task completes its own declared acceptance loop. The feature completes only after all required integration and runtime gates pass. Neither an oversized task nor a catch-all final gate may hide independent deliverables.
- Archive a task document only after its entire claimed scope is complete and the final consistency review passes. A completed child task, partial milestone, blocked gate, or unavailable runtime does not make the task document archival-ready.
- A Task document must not be archived while it still owns unresolved implementation work. Valid future work must first transfer to the repository TODO index or an active successor Spec/Task; a historical reference to transferred work does not itself block archival.
- Do not choose models, require subagents, or impose fixed file, token, task, or commit counts through this skill. Apply the existing delegation policy separately.

## Workflow

1. Determine whether the request is document-only or includes implementation.
2. Inspect the relevant permitted sources and current-state constraints. Identify inventories, environment checks, or decisions that must precede dependent implementation or irreversible changes.
3. Choose Spec boundaries; create or update each dated Spec and its linked task document.
4. Give acceptance criteria stable IDs. Map each material assertion to an implementation owner and sufficient verification; name product-level gates where local evidence is insufficient.
5. Plan bounded deliverables, real dependencies, contract-ready parallelism, and an early real-semantic integration path where multiple components must connect.
6. When a concrete implementation item is explicitly confirmed for later follow-up, preserve it in the authoritative Spec/Task and synchronize the repository TODO index through `references/todo-tracking.md`. Do not use TODO for unresolved design questions, speculative ideas, or current-scope work that is merely incomplete.
7. Run the planning preflight in `references/review.md`. Resolve document defects and report any genuine blockers.
8. For document-only work, stop after the planning review unless the request specifically includes lifecycle cleanup or archival of already-completed documents.
9. For implementation, follow `references/implementation.md` on the verified dependency frontier. Unresolved Blocking Questions stop affected work; unrelated dependency-ready work need not stop.
10. If the acceptance boundary drifts, re-plan affected tasks before extending them or adding parallel workers. Preserve requirements, existing changes, and still-valid evidence. Update the Spec first when the stable contract changes. Synchronize affected TODO references when confirmed follow-up scope changes.
11. Before claiming the requested feature or implementation scope complete, synchronize affected TODO entries with the authoritative Spec/Task state, then complete the final consistency review.
12. When a task document's entire claimed scope is complete and the final consistency review passes, first ensure it owns no unresolved work by transferring valid future items to TODO or an active successor, then apply `references/archive-handling.md`: preserve historical evidence, keep still-current Specs active, update affected TODO/source links, and remove completed execution documents from active task entry points according to repository convention.

## Handoff

For document-only work, report the generated, revised, or archived paths, planning-review conclusion, Blocking Questions, residual planning risks, and any TODO index changes. State when only files were generated or reorganized and nothing was installed or applied.

For implementation, also report completed and incomplete deliverables, outstanding integration/runtime gates, actual validations and limitations, final-review conclusion, TODO index changes, archival changes when relevant, and commit status when relevant. Do not equate written code, fixture tests, browser layout checks, and real-runtime acceptance.
