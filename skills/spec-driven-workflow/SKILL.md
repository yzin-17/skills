---
name: spec-driven-workflow
description: Use when creating, updating, reviewing, or implementing from software Specs and linked implementation task documents. Apply especially when the user asks to write or revise a feature Spec, technical Spec, implementation plan, or task document that should follow spec-driven conventions. Also use for non-trivial code changes, refactors, or migrations that need a stable Spec, independently verifiable tasks, evidence, and consistency review. Do not use for general documentation, README edits, simple questions, routine low-risk edits, one-line changes, or explicitly plan-free changes.
---

# Spec-Driven Workflow

Use this skill primarily to create and maintain durable Spec and task-document contracts. Implementation is optional and should only begin when it is part of the current request.

## Reference routing

Read only the references required for the current phase:

- Creating or revising a Spec: [references/spec-authoring.md](references/spec-authoring.md)
- Creating or revising implementation tasks: [references/task-planning.md](references/task-planning.md)
- Reviewing Spec/task documents or performing consistency review: [references/review.md](references/review.md)
- Implementing approved work: [references/implementation.md](references/implementation.md)

For document-only work, do not load implementation rules unless they are needed to judge whether a task is executable. For a full Spec → Task → implementation workflow, read references progressively as each phase begins.

## Operating contract

- Treat the current user request, applicable project rules, and confirmed project context as authoritative. References are process guidance, not permission to expand scope, mutate external systems, or commit.
- Preserve existing worktree changes. Separate confirmed requirements, current-state facts, assumptions, and unresolved decisions.
- Reuse the repository's terminology, document locations, interfaces, and test entry points when compatible.
- If no repository convention exists, default to `docs/specs/YYYY-MM-DD-<task-id>.md` and `docs/tasks/<task-id>.md`. Use the Spec's first creation date in `YYYY-MM-DD` form and keep that filename stable on later revisions.
- Keep the Spec focused on stable intent, domain boundaries, and externally observable behavior. Keep the task document concrete about implementation scope, dependencies, completion conditions, validation, and status.
- A Spec and its linked task document form one planning unit. If the request contains independently deliverable subsystems, prefer multiple planning units instead of one oversized Spec.

## Workflow

1. Determine whether the request is document-only or includes implementation. Document authoring is a valid completed outcome; do not continue into code unless implementation is requested.
2. Inspect the project context needed to write accurate documents: relevant code, domain models, terminology, ADRs, interfaces, compatibility paths, and test seams.
3. Decide whether the request should remain one Spec unit or be split into independently deliverable Spec units.
4. For each Spec unit, create or update one dated Spec and one linked task document using the same stable task ID.
5. Give acceptance criteria stable IDs such as `AC1`, `AC2`, and explicitly map every acceptance criterion to one or more tasks.
6. Run the planning preflight defined in `references/review.md`: Spec coverage, placeholder scan, dependency checks, cross-task contract consistency, and unresolved-question status. Fix the documents before considering planning complete.
7. If the request is document-only, stop after the planning review and report the document paths plus any Blocking Questions or residual planning risks.
8. If implementation is requested, do not begin while an unresolved Blocking Question can materially change behavior, interfaces, data semantics, compatibility, testing, or acceptance criteria. Then follow `references/implementation.md`.
9. If feedback changes stable behavior or acceptance, update the Spec first, then synchronize affected tasks, tests, documentation, and implementation.
10. After implementation, perform the final consistency review in `references/review.md` before reporting completion.

## Handoff

For document-only work, the final response must state:

- Spec and task-document paths;
- planning-review conclusion;
- Blocking Questions, if any;
- remaining planning risks or follow-up items.

For implementation work, also state:

- completed and incomplete tasks;
- dependency or blocking status;
- validations that were run and their results;
- final consistency-review conclusion;
- remaining implementation risks or explicitly accepted follow-up items.
