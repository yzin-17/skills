---
name: spec-driven-workflow
description: Use when creating, updating, reviewing, or implementing software Specs and linked task documents, including re-scoping tasks that become difficult to verify during execution. Also use for non-trivial changes, refactors, or migrations that need stable acceptance criteria, bounded deliverables, verification evidence, and consistency review. Do not use for general documentation, simple questions, routine low-risk edits, one-line changes, or explicitly plan-free work.
---

# Spec-Driven Workflow

Maintain durable Spec and task-document contracts. Implementation begins only when the current request includes it.

## Reference routing

Read only the references required for the current phase:

- Spec authoring or stable-contract changes: [references/spec-authoring.md](references/spec-authoring.md)
- Task planning, dependencies, acceptance boundaries, or re-scoping: [references/task-planning.md](references/task-planning.md)
- Planning preflight or final consistency review: [references/review.md](references/review.md)
- Implementation, evidence, delegation handoff, or execution-time re-planning: [references/implementation.md](references/implementation.md)

Load references progressively. For document-only work, read implementation guidance only when needed to assess executability. When re-scoping during implementation, consult the affected planning and review sections rather than restarting the entire workflow.

## Operating contract

- Follow the current request, applicable project rules, and confirmed context. These instructions do not authorize scope expansion, external mutations, deployment, destructive migration, or commits.
- Respect the requested source boundary. Distinguish confirmed requirements, source-reported facts, directly verified facts, assumptions, and unresolved decisions. Do not claim to have inspected unavailable code or environments.
- Preserve existing worktree changes. Reuse project terminology, interfaces, document locations, and test entry points.
- Without a repository convention, use `docs/specs/YYYY-MM-DD-<task-id>.md` and `docs/tasks/<task-id>.md`. Keep the Spec's first-creation date and filename stable on later revisions.
- The Spec owns stable intent, domain boundaries, behavior, and acceptance. Tasks own implementation scope, dependencies, local completion conditions, evidence, and status.
- Prefer separate Spec units for independently deliverable subsystems. Multiple runtimes or many tasks alone do not justify separate Specs; a cohesive Spec may contain several bounded tasks and explicit gates.
- A task completes its own declared acceptance loop. The feature completes only after all required integration and runtime gates pass. Neither an oversized task nor a catch-all final gate may hide independent deliverables.
- Do not choose models, require subagents, or impose fixed file, token, task, or commit counts through this skill. Apply the existing delegation policy separately.

## Workflow

1. Determine whether the request is document-only or includes implementation.
2. Inspect the relevant permitted sources and current-state constraints. Identify inventories, environment checks, or decisions that must precede dependent implementation or irreversible changes.
3. Choose Spec boundaries; create or update each dated Spec and its linked task document.
4. Give acceptance criteria stable IDs. Map each material assertion to an implementation owner and sufficient verification; name product-level gates where local evidence is insufficient.
5. Plan bounded deliverables, real dependencies, contract-ready parallelism, and an early real-semantic integration path where multiple components must connect.
6. Run the planning preflight in `references/review.md`. Resolve document defects and report any genuine blockers.
7. For document-only work, stop after the planning review. Do not continue into implementation or installation.
8. For implementation, follow `references/implementation.md` on the verified dependency frontier. Unresolved Blocking Questions stop affected work; unrelated dependency-ready work need not stop.
9. If the acceptance boundary drifts, re-plan affected tasks before extending them or adding parallel workers. Preserve requirements, existing changes, and still-valid evidence. Update the Spec first when the stable contract changes.
10. Complete the final consistency review before claiming the requested feature or implementation scope is complete.

## Handoff

For document-only work, report the generated or revised paths, planning-review conclusion, Blocking Questions, and residual planning risks. State when only files were generated and nothing was installed or applied.

For implementation, also report completed and incomplete deliverables, outstanding integration/runtime gates, actual validations and limitations, final-review conclusion, and commit status when relevant. Do not equate written code, fixture tests, browser layout checks, and real-runtime acceptance.
