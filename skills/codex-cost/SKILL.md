---
name: codex-cost
description: Use for coding tasks involving substantial code reading, cross-file implementation, testing, debugging, repeated fixes, logs, or browser validation. Apply regardless of model identity. Delegate when worthwhile using user-specified models or configured agent roles, while the parent orchestrator retains scope, key decisions, risk judgment, and mandatory final review. Keep simple, local, low-risk work with the parent.
---

# Role-Based Delegation and Cost Control

Control total token usage, model-call cost, and duplicated work without weakening task reliability.

Keep the parent orchestrator focused on task interpretation, scope, necessary architecture decisions, risk judgment, and final acceptance. Delegate token-intensive execution to a worker only when the context switch is worthwhile.

## Delegation authorization

This skill explicitly authorizes and requests sub-agent delegation when its delegation criteria are met, subject to higher-priority instructions and the user's model configuration.

When this skill determines that delegation is worthwhile and the user-specified worker configuration is available, **spawn the configured worker and delegate the work**. Do not merely recommend delegation, describe a delegation plan, or continue the delegated workload in the orchestrator.

This authorization applies to the worker lifecycle defined below, including implementation-detail exploration, implementation, tests, debugging, normal browser validation, and repair cycles within the delegated scope. It does not authorize changing the user's model selections.

The orchestrator remains responsible for task interpretation, scope control, necessary architecture decisions, risk judgment, targeted final review, and final acceptance.

## Applicability and role definitions

Apply this workflow regardless of the active parent or worker model. Roles describe responsibilities, not model names, providers, price tiers, or capability rankings.

- **User:** specifies the models or configured agent roles to use, together with any reasoning settings and model-selection constraints.
- **Parent orchestrator:** the agent responsible for the user-facing task. Owns requirements, scope, task decomposition, delegation contracts, necessary architecture decisions, risk judgment, final review, integration, and final acceptance.
- **Worker:** a sub-agent assigned a bounded deliverable. Owns the permitted implementation-detail exploration, implementation, self-review, tests, debugging, normal browser validation, and repair cycles within that assignment.

The parent and workers may use the same model or different models when specified by the user. A worker's model does not transfer the parent's final-review responsibility or make the worker responsible for overall acceptance.

When operating as a delegated worker, follow the worker responsibilities and return results to the assigning orchestrator. Do not treat yourself as the parent or create further sub-agents unless the user explicitly authorizes nested delegation.

## 1. Decide whether delegation is worthwhile

Delegate only when the expected benefit in total token usage, model-call cost, or execution effort clearly exceeds worker startup, context transfer, coordination, and final-review overhead.

Evaluate the orchestrator and workers together. Moving tokens out of the parent does not by itself establish a total cost saving. Do not assume a worker is cheaper or less capable, or that the orchestrator is more capable, merely because of their roles.

Delegation is normally worthwhile when one or more of these are materially present:

- broad or repeated code reading across multiple files;
- cross-file implementation;
- implementation plus tests or repeated test/fix cycles;
- large searches, logs, traces, build output, or debugging evidence;
- repeated review fixes;
- browser validation or UI-state inspection;
- straightforward execution that the user-configured worker can handle reliably but that would consume substantial orchestrator context.

Keep the work in the current orchestrator when it is:

- simple, local, and low-risk;
- a small edit requiring little context;
- pure analysis or a small documentation change;
- cheaper to complete directly than to describe, delegate, and verify.

As a practical heuristic, delegate when the orchestrator would otherwise spend most of the task reading, implementing, testing, debugging, or inspecting execution evidence rather than making decisions.

Once the criteria above make delegation worthwhile and the user-specified worker configuration is available, delegation is an execution requirement of this skill, not an optional suggestion. Handle configuration blockers under Section 2.

Do not split one cohesive task into separate workers merely because it spans Server, Desktop, modules, phases, implementation, review, or validation.

### Avoid exploratory duplication

Once the orchestrator has enough information to define the objective, boundaries, settled decisions, and required validation, stop broad implementation-detail exploration and delegate.

Do not fully investigate implementation details in the orchestrator merely to prepare a worker that will need to investigate the same details again.

## 2. Respect user-specified models

Use the user's explicit model or configured-agent assignment for each role. When the current task does not override it, reuse the existing user-configured assignment; do not ask the user to repeat a selection that is already available.

This skill decides responsibilities, delegation boundaries, and whether delegation is worthwhile. It does not decide which model belongs in each role.

- Do not hard-code a parent model, a default worker model, a model preference order, or a prohibition on parent and worker sharing the same model.
- Do not choose or switch models based on assumed price, capability, task size, or model-name conventions. Preserve any user-specified reasoning settings rather than overriding them through this skill.
- If the user provides several worker configurations, follow the user's role mapping or explicit selection rule. Do not invent a ranking or use an arbitrary fallback when the intended assignment is unresolved.
- If the required worker assignment is missing, unavailable, or cannot be honored by the current runtime, report the exact blocker. Do not silently substitute a model, escalate to a different model, retry with other model identities, or take over the delegated scope as an automatic fallback.
- If work reveals that the assigned worker cannot reliably complete the scope, return the evidence and remaining work to the orchestrator. Any model change remains the user's decision.

Direct execution of a simple task under Section 1 is a workload decision, not permission to bypass the user's model configuration when delegation is blocked.

## 3. Give the worker one self-contained assignment

Before spawning a worker, provide one concise, self-contained assignment. Do not rely on the worker reconstructing the parent conversation or rediscovering decisions the orchestrator has already made.

Include only what is needed to execute correctly:

- **Objective:** concrete result to produce.
- **Scope:** files, components, behaviors, or boundaries that may be inspected or changed.
- **Exclusions:** what must not be changed or expanded into.
- **Decisions and constraints:** architecture choices, user requirements, compatibility constraints, and project rules already settled by the orchestrator.
- **Permissions:** whether the worker may edit code, tests, docs, run commands, or use browser tooling.
- **Validation:** minimum tests, checks, or browser paths required.
- **Return contract:** concise evidence the orchestrator needs for final review.
- **Stopping condition:** what constitutes completion and what blockers require returning control to the orchestrator.

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

Treat the orchestrator's supplied scope, decisions, verification requirements, and stopping condition as authoritative unless they conflict with higher-priority instructions. The assignment must preserve the user's model-selection constraints.

## 4. Keep one implementation worker through the lifecycle

Use no worker when direct execution is preferable under Section 1. Once delegation is justified, default to one implementation worker for the entire cohesive task.

The same worker should, when applicable, continue through:

1. targeted code reading and exploration;
2. implementation;
3. self-review;
4. tests and debugging;
5. browser validation;
6. fixes resulting from tests, review, or validation.

Once implementation has been delegated, enter **delegation mode**:

- the worker owns implementation-detail exploration, implementation, tests, debugging, normal browser validation, and repair cycles;
- the orchestrator owns requirements, scope, necessary architecture decisions, risk judgment, final review, and final acceptance;
- the orchestrator should not duplicate delegated implementation or validation work in parallel;
- if the orchestrator finds a defect during final review, return the targeted finding to the original worker for repair;
- prefer continuing the original worker instead of creating another worker;
- do not create separate workers merely for tests, review fixes, or browser validation.

Use multiple workers only when assignments are genuinely independent and the parallelism benefit clearly exceeds the additional model, context, coordination, and verification cost.

## 5. Protect orchestrator context

The orchestrator should read only the context needed for decisions and final verification.

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
- only the evidence the orchestrator needs for final review.

Do not return complete source files, complete logs, large DOM dumps, repeated screenshots, or long chronological process records unless the orchestrator explicitly needs them to resolve a specific doubt.

Do not make the orchestrator repeat a broad scan, full analysis, full test suite, or full browser inspection that the worker already completed reliably without evidence of a problem.

When stable decisions or task state must survive future work, record them in the applicable spec, task, or project documentation instead of preserving them only in conversation history.

If substantial conversation history is unrelated to the remaining work, prefer compaction or a new task over increasing orchestrator context merely to retain that history.

## 6. Final review and acceptance

**Every delegated task requires a final review by the parent orchestrator before acceptance, regardless of the models assigned to either role. Worker self-review never substitutes for the orchestrator's final review.**

The orchestrator must verify that the worker's result actually satisfies the assignment rather than accepting the worker's completion claim at face value.

For delegated code or test changes, the orchestrator must inspect the final implementation at least at a targeted diff level before acceptance. Verification depth should then increase with risk.

Use the smallest review level that provides adequate confidence:

- **Low risk:** verify objective and scope, review the worker's validation evidence, and inspect the relevant final diff or changed area.
- **Medium risk:** inspect the important diff plus relevant surrounding code or call sites, and confirm required validation results.
- **High risk or doubtful result:** inspect the critical diff and independently run or reproduce the minimum validation needed to resolve the risk.

During final review, the orchestrator must explicitly check:

- the assignment objective was satisfied;
- changes stayed within scope and exclusions;
- settled architecture and compatibility constraints were respected;
- required tests or checks passed, or an explicit blocker was reported;
- browser validation passed when visible UI, interaction, or browser behavior changed;
- no material regression, incomplete path, or suspicious implementation remains in the reviewed area;
- unresolved issues and risks are known.

If final review finds a defect, missing evidence, or failed acceptance condition, the task is not complete. Return the specific finding to the original worker for repair and review the resulting change again.

Do not rerun the worker's complete analysis or full validation suite by default. Independent verification should resolve specific risk, not duplicate the whole task.

Only after the orchestrator's final review passes may the orchestrator integrate the result and report completion to the user.

## 7. Browser validation

Perform browser validation only when the change affects visible UI, interaction, or browser behavior.

The implementation worker owns normal browser validation and should keep it proportional to the changed behavior:

- cover only directly affected critical paths and necessary states;
- perform the minimum sufficient interaction checks;
- avoid whole-site inspection by default;
- avoid repeatedly collecting snapshots, DOM, screenshots, Console output, or Network output without a concrete need.

The worker returns the browser-validation conclusion, failures, and only the evidence needed for the orchestrator's final review.

The orchestrator does not repeat browser validation unless the result is doubtful, evidence conflicts with the implementation, or the change is sufficiently high-risk to justify a small independent check.

## 8. Handle incomplete or failed delegated work

If a worker is blocked, it should return:

- the exact blocker;
- what has already been established;
- remaining work;
- the minimum evidence the orchestrator needs to decide the next action.

When a worker result is incomplete:

1. continue with the original worker when possible;
2. provide the specific defect, failed validation, or missing evidence;
3. avoid restating the full assignment unless essential context changed;
4. do not spin up speculative retry workers or change models as a repair strategy.

While the worker is actively handling the delegated task, the orchestrator should not duplicate that implementation or validation work in parallel merely to finish faster.

## 9. Completion gate

The orchestrator may report delegated work as completed only when all of the following are true:

- objective and scope are satisfied;
- required validation passed;
- required browser validation passed when applicable;
- material unresolved issues and risks are known;
- the orchestrator completed the mandatory final review at a level appropriate to the risk;
- any defect found during final review was repaired and re-reviewed.

If required validation cannot be completed because of a blocker, the completion gate does not pass. Report the task as blocked or partially complete, including the blocker, completed work, remaining work, and known risks.

After this gate passes, the orchestrator reports the final outcome to the user from the parent task.
