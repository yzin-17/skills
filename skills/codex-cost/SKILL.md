---
name: codex-cost
description: Use when gpt-5.6-sol is the active parent and a coding task is likely to consume substantial Sol context through broad code reading, cross-file implementation, testing, debugging, repeated fixes, logs, or browser validation. Delegates worthwhile execution to Luna or Terra while Sol retains scope, key decisions, and final review. Do not use for simple, local, low-risk work.
---

# Sol Delegation and Cost Control

Reduce `gpt-5.6-sol` token usage and model-call cost without weakening task reliability.

Keep Sol focused on task interpretation, scope, necessary architecture decisions, risk judgment, and final acceptance. Delegate token-intensive execution to a lower-cost worker only when the context switch is worthwhile.

## Applicability

Apply this workflow only when the active parent model is `gpt-5.6-sol`.

Do not impose this delegation policy on a Luna or Terra parent unless the user or a more specific project rule explicitly requires it.

## 1. Decide whether delegation is worthwhile

Delegate only when the expected savings in Sol tokens, tool calls, or execution effort clearly exceed worker startup, context transfer, coordination, and final-review overhead.

Prefer delegation when one or more of these are materially present:

- broad or repeated code reading across multiple files;
- cross-file implementation;
- implementation plus tests or repeated test/fix cycles;
- large searches, logs, traces, build output, or debugging evidence;
- repeated review fixes;
- browser validation or UI-state inspection;
- straightforward execution that a cheaper model can handle reliably but that would consume substantial Sol context.

Keep the work in the current Sol when it is:

- simple, local, and low-risk;
- a small edit requiring little context;
- pure analysis or a small documentation change;
- cheaper to complete directly than to describe, delegate, and verify.

As a practical heuristic, delegate when Sol would otherwise spend most of the task reading, implementing, testing, debugging, or inspecting execution evidence rather than making decisions.

Do not split one cohesive task into separate workers merely because it spans Server, Desktop, modules, phases, implementation, review, or validation.

### Avoid exploratory duplication

Once Sol has enough information to define the objective, boundaries, settled decisions, and required validation, stop broad implementation-detail exploration and delegate.

Do not fully investigate implementation details in Sol merely to prepare a worker that will need to investigate the same details again.

## 2. Choose the worker

Use this order:

1. **Luna by default.** Use Luna whenever it is reasonably capable of completing the assignment reliably.
2. **Terra only when Luna is clearly insufficient before delegation.** Choose Terra only when the task can already be identified as requiring stronger reasoning or execution reliability than Luna can reasonably provide.
3. **Never create another Sol worker.** If a lower-cost worker is not suitable, the current Sol completes the work directly.

Do not choose Terra merely because the task is important, large, or spans many files.

Prefer Luna when the main difficulty is token volume, code reading, implementation, testing, logs, repetitive repair, or browser work.

## 3. Give the worker one self-contained assignment

Before spawning a worker, provide one concise, self-contained assignment. Do not rely on the worker reconstructing the parent conversation or rediscovering decisions Sol has already made.

Include only what is needed to execute correctly:

- **Objective:** concrete result to produce.
- **Scope:** files, components, behaviors, or boundaries that may be inspected or changed.
- **Exclusions:** what must not be changed or expanded into.
- **Decisions and constraints:** architecture choices, user requirements, compatibility constraints, and project rules already settled by Sol.
- **Permissions:** whether the worker may edit code, tests, docs, run commands, or use browser tooling.
- **Validation:** minimum tests, checks, or browser paths required.
- **Return contract:** concise evidence Sol needs for final review.
- **Stopping condition:** what constitutes completion and what blockers require returning control to Sol.

Do not forward the entire parent history when a concise assignment is sufficient.

Use this compact contract when useful:

```text
Role: implementation worker
Objective: <concrete outcome>
Scope: <allowed files/components/behaviors>
Do not: <explicit exclusions>
Decisions/constraints: <already-settled requirements>
Permissions: <allowed edits/tools/commands>
Validation: <required checks/tests/browser paths>
Return: <changed areas, key diff, validation, risks, blockers>
Stop when: <completion condition or blocker>
```

Treat Sol's supplied scope, decisions, verification requirements, and stopping condition as authoritative unless they conflict with higher-priority instructions.

## 4. Keep one implementation worker through the lifecycle

Default to one implementation worker for the entire cohesive task.

The same worker should, when applicable, continue through:

1. targeted code reading and exploration;
2. implementation;
3. self-review;
4. tests and debugging;
5. browser validation;
6. fixes resulting from tests, review, or validation.

Once implementation has been delegated, enter **delegation mode**:

- the worker owns implementation-detail exploration, implementation, tests, debugging, normal browser validation, and repair cycles;
- Sol owns requirements, scope, necessary architecture decisions, risk judgment, final review, and final acceptance;
- Sol should not duplicate delegated implementation or validation work in parallel;
- if Sol finds a defect during final review, return the targeted finding to the original worker for repair;
- prefer continuing the original worker instead of creating another worker;
- do not create separate workers merely for tests, review fixes, or browser validation.

Use multiple workers only when assignments are genuinely independent and the parallelism benefit clearly exceeds the additional model, context, coordination, and verification cost.

## 5. Protect Sol context

Sol should read only the context needed for decisions and final verification.

Delegate high-volume material such as:

- repository-wide or broad code searches;
- implementation-detail exploration;
- long test or build output;
- logs and traces;
- repeated debugging evidence;
- DOM, screenshots, Console output, and Network output from browser validation.

The worker should return a concise result containing:

- changed files or affected areas;
- modification summary;
- key or high-risk diff information;
- validation performed and results;
- browser-validation conclusion when applicable;
- unresolved issues or blockers;
- material risks;
- only the evidence Sol needs for final review.

Do not return complete source files, complete logs, large DOM dumps, repeated screenshots, or long chronological process records unless Sol explicitly needs them to resolve a specific doubt.

Do not make Sol repeat a broad scan, full analysis, full test suite, or full browser inspection that the worker already completed reliably without evidence of a problem.

When stable decisions or task state must survive future work, record them in the applicable spec, task, or project documentation instead of preserving them only in conversation history.

If substantial conversation history is unrelated to the remaining work, prefer compaction or a new task over increasing Sol context merely to retain that history.

## 6. Final review and acceptance

**Every delegated task requires a final review by the parent Sol before acceptance. Worker self-review never substitutes for Sol's final review.**

Sol must verify that the worker's result actually satisfies the assignment rather than accepting the worker's completion claim at face value.

For delegated code or test changes, Sol must inspect the final implementation at least at a targeted diff level before acceptance. Verification depth should then increase with risk.

Use the smallest review level that provides adequate confidence:

- **Low risk:** verify objective and scope, review the worker's validation evidence, and inspect the relevant final diff or changed area.
- **Medium risk:** inspect the important diff plus relevant surrounding code or call sites, and confirm required validation results.
- **High risk or doubtful result:** inspect the critical diff and independently run or reproduce the minimum validation needed to resolve the risk.

During final review, Sol must explicitly check:

- the assignment objective was satisfied;
- changes stayed within scope and exclusions;
- settled architecture and compatibility constraints were respected;
- required tests or checks passed, or an explicit blocker was reported;
- browser validation passed when visible UI, interaction, or browser behavior changed;
- no material regression, incomplete path, or suspicious implementation remains in the reviewed area;
- unresolved issues and risks are known.

If final review finds a defect, missing evidence, or failed acceptance condition, the task is not complete. Return the specific finding to the original worker for repair and review the resulting change again.

Do not rerun the worker's complete analysis or full validation suite by default. Independent verification should resolve specific risk, not duplicate the whole task.

Only after Sol's final review passes may Sol integrate the result and report completion to the user.

## 7. Browser validation

Perform browser validation only when the change affects visible UI, interaction, or browser behavior.

The implementation worker owns normal browser validation and should keep it proportional to the changed behavior:

- cover only directly affected critical paths and necessary states;
- perform the minimum sufficient interaction checks;
- avoid whole-site inspection by default;
- avoid repeatedly collecting snapshots, DOM, screenshots, Console output, or Network output without a concrete need.

The worker returns the browser-validation conclusion, failures, and only the evidence needed for Sol's final review.

Sol does not repeat browser validation unless the result is doubtful, evidence conflicts with the implementation, or the change is sufficiently high-risk to justify a small independent check.

## 8. Handle incomplete or failed delegated work

If a worker is blocked, it should return:

- the exact blocker;
- what has already been established;
- remaining work;
- the minimum evidence Sol needs to decide the next action.

When a worker result is incomplete:

1. continue with the original worker when possible;
2. provide the specific defect, failed validation, or missing evidence;
3. avoid restating the full assignment unless essential context changed;
4. do not spin up speculative retry workers.

While the worker is actively handling the delegated task, Sol should not duplicate that implementation or validation work in parallel merely to finish faster.

## 9. Completion gate

Sol may report delegated work as completed only when all of the following are true:

- objective and scope are satisfied;
- required validation passed;
- required browser validation passed when applicable;
- material unresolved issues and risks are known;
- Sol completed the mandatory final review at a level appropriate to the risk;
- any defect found during final review was repaired and re-reviewed.

If required validation cannot be completed because of a blocker, the completion gate does not pass. Report the task as blocked or partially complete, including the blocker, completed work, remaining work, and known risks.

After this gate passes, Sol reports the final outcome to the user from the parent task.
