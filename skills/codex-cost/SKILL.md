---
name: codex-cost
description: Use for coding tasks involving substantial code reading, cross-file implementation, testing, debugging, log analysis, or browser validation. Delegate only when the overall benefit justifies it; user-specified models constrain model selection only after delegation is deemed worthwhile. When no worker is specified, default non-UI work to Luna, while frontend visual, layout, or styling work must not be assigned to Luna. The parent always owns scope, key decisions, and final review.
---

# Role-Based Delegation and Cost Control

Reduce total token usage, model-call cost, and duplicated work without weakening task reliability.

Core principle: the parent orchestrator owns decisions and acceptance; workers own bounded execution. Whether to delegate depends on overall benefit, not on model names or roles themselves.

## 1. Decide Whether Delegation Is Worthwhile

Delegate only when the expected benefit clearly exceeds worker startup, context transfer, coordination, and final-review overhead. A user explicitly naming a sub-agent or model constrains which model to use if delegation happens; it does not make delegation mandatory.

Delegation is usually worthwhile for:

- broad or repeated code reading across multiple files;
- cross-file implementation;
- implementation followed by testing, debugging, or repeated repair cycles;
- large search results, logs, traces, build output, or browser evidence;
- straightforward execution that a configured worker can handle reliably but that would otherwise consume substantial parent context.

The parent orchestrator should usually handle work directly when it is:

- simple, local, and low risk;
- a small edit requiring little context;
- pure analysis or a small documentation change;
- cheaper to complete directly than to delegate and verify.

Practical rule: if most of the work is reading, implementing, testing, debugging, or inspecting execution evidence rather than making key decisions, prefer delegation.

Once the overall-benefit judgment confirms that delegation is worthwhile and an appropriate worker is available, actually create and delegate to that worker. Do not merely describe a delegation plan and then continue the delegated workload in the parent.

Do not mechanically split one task across multiple workers merely because it spans multiple modules, phases, implementation steps, or validation stages. Apart from the UI / non-UI model boundary below, use multiple workers only for genuinely independent work that benefits from parallelism.

## 2. Model and Role Constraints

Roles describe responsibilities, not fixed model capability, price, or model names.

- **User:** specifies models, agent roles, reasoning settings, and model-selection constraints.
- **Parent orchestrator:** owns requirement understanding, scope, task decomposition, necessary architecture decisions, risk judgment, and final acceptance.
- **Worker:** owns permitted implementation-detail exploration, implementation, self-review, tests, debugging, necessary browser validation, and repairs within the delegated scope.

First decide whether delegation is worthwhile, then choose the worker. If the user explicitly specifies a model, agent role, or model-selection constraint, follow it strictly only after delegation has already been judged worthwhile. Do not skip the delegation-benefit check merely because the user named a sub-agent.

When the user does not specify a worker:

- **Default non-UI work to Luna.** Luna's model-call cost is not a reason to avoid delegation or switching to Luna; whether delegation is worthwhile should still be judged only by real overhead such as startup, context transfer, coordination, and final review.
- **Frontend visual, layout, or styling work must not be assigned to Luna;** use another available worker.
- If the same task contains both UI and non-UI work, workers may switch at that boundary: assign the non-UI portion to Luna and the UI portion to a non-Luna worker. This is not considered unnecessary mechanical splitting.

If the user explicitly assigns Luna to frontend visual, layout, or styling work, report the constraint conflict rather than silently substituting another model. If a user-specified worker is missing or unavailable, report the exact blocker. If a worker chosen by the parent cannot reliably complete the work, reassess how the remaining scope should be delegated.

When operating as a worker, do not create additional sub-agents unless the user explicitly authorizes nested delegation.

## 3. Delegation Contract

Before delegating, provide a concise, self-contained assignment. Do not make the worker depend on the full parent conversation or rediscover decisions that are already settled.

The assignment should include at least:

- **Objective:** the concrete result to produce;
- **Scope:** files, components, behaviors, or boundaries that may be inspected or changed;
- **Exclusions:** what must not be changed or expanded into;
- **Decisions and constraints:** settled architecture, compatibility requirements, user requirements, and project rules;
- **Permissions:** what may be edited and which tools or commands may be used;
- **Validation:** required tests, checks, or browser paths;
- **Return:** the change summary, key diff, validation, risks, and blockers needed for final review;
- **Stopping condition:** what counts as complete and when the worker should stop and return control to the parent.

Use this compact contract when helpful:

```text
Role: implementation worker
Objective: <concrete outcome>
Scope: <allowed files / components / behaviors>
Do not: <explicit exclusions>
Decisions / constraints: <settled requirements>
Permissions: <allowed edits / tools / commands>
Validation: <required checks / tests / browser paths>
Return: <changed areas, key diff, validation, risks, blockers>
Stop when: <completion condition or blocker>
```

Once the parent has enough information to define the objective, boundaries, key decisions, and validation requirements, stop digging further into implementation details. Avoid making the parent and worker explore the same material twice.

## 4. Execution Lifecycle and Context Control

Reuse the original worker within the same execution type by default: continue using Luna for non-UI work, and continue using the corresponding non-Luna worker for frontend visual, layout, or styling work. When the task moves between UI and non-UI work, switch workers accordingly.

Within its scope, the same worker should continue through:

1. necessary code reading and implementation-detail exploration;
2. implementation and self-review;
3. testing, debugging, and repair;
4. browser validation when needed;
5. repairs resulting from the parent's final review.

After delegation, the parent orchestrator should not duplicate the delegated implementation, testing, or routine validation work in parallel. When a problem is found, return the concrete finding to the original worker responsible for that scope rather than creating another worker of the same type.

Workers should absorb high-volume execution context such as broad code searches, long logs, build output, traces, DOM, Console, Network output, and repeated debugging evidence, then return only the concise information needed for final review.

Worker returns should focus on:

- changed files or affected areas;
- change summary and high-risk diff details;
- validation performed and results;
- browser-validation conclusion when applicable;
- unresolved issues, blockers, and material risks.

Unless the parent explicitly needs them to resolve a specific doubt, do not return complete source files, complete logs, large DOM dumps, repeated screenshots, or long chronological process records.

Stable decisions or long-lived task state should be recorded in the applicable spec, task, or project documentation rather than relying on conversation history for persistence.

## 5. Browser Validation

Perform browser validation only when a change affects visible UI, interaction, or browser behavior.

Normally the worker owns browser validation and should keep it minimal:

- cover only directly affected critical paths and necessary states;
- perform only the interactions needed to establish correctness;
- do not inspect the whole site by default;
- do not repeatedly collect screenshots, DOM, Console, or Network data without a concrete need.

The parent orchestrator should perform an additional small independent check only when the result is doubtful, evidence conflicts, or the change is high risk.

## 6. Final Review and Completion Gate

**Every delegated task must receive a final review by the parent orchestrator before acceptance. Worker self-review never replaces the parent's final review.**

At minimum, the parent must:

- confirm against the original objective and scope that the task is actually complete;
- inspect the final key diff or affected area;
- confirm that settled architecture, compatibility constraints, and exclusions were preserved;
- review the required test, check, and browser-validation results;
- confirm that no obvious regression, incomplete path, or undisclosed high-risk issue remains.

Review depth should increase with risk:

- **Low risk:** verify the objective, scope, validation evidence, and relevant final diff;
- **Medium risk:** additionally inspect important surrounding code or call sites;
- **High risk or doubtful result:** independently run the minimum validation needed to resolve the specific risk.

If final review finds a defect, missing evidence, or failed acceptance condition, the task is not complete. Return the specific finding to the original worker for repair, then review the result again.

Report completion only when all of the following are true:

- the objective and scope are satisfied;
- required validation passed;
- required browser validation passed when applicable;
- material unresolved issues and risks are known;
- the parent's final review passed;
- issues found during review were repaired and rechecked.

If validation cannot be completed because of a blocker, report the task as blocked or partially complete and include the completed work, remaining work, and known risks.
