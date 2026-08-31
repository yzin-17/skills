---
name: codex-cost
description: Use when the active parent model is gpt-5.6-sol and a coding task involves or may involve substantial code reading, cross-file implementation, testing, debugging, logs, review fixes, or browser validation. Use this skill to decide whether lower-cost Luna or Terra delegation is worthwhile, manage the delegated implementation lifecycle, and minimize Sol context and verification cost. Simple, local, low-risk work should remain with the current Sol.
---

# Sol Subagent

Reduce `gpt-5.6-sol` token usage and model-call cost without weakening task reliability. Keep Sol focused on task interpretation, scope, necessary architecture decisions, and final acceptance; move token-intensive execution to a lower-cost worker when the context switch is worthwhile.

## Applicability

Apply this workflow when the active parent model is `gpt-5.6-sol`.

Do not impose this delegation policy on a Luna or Terra parent unless the user or a more specific project rule explicitly requires it.

## 1. Decide whether delegation earns the context switch

Delegate only when the expected savings in Sol tokens, tool calls, or execution effort clearly outweigh worker startup, context transfer, and final verification overhead.

Prefer delegation when one or more of these are materially present:

- broad or repeated code reading across multiple files;
- cross-file implementation;
- implementation plus tests or repeated test/fix cycles;
- large search, logs, traces, build output, or debugging evidence;
- repeated review fixes;
- browser validation or UI-state inspection;
- work that is straightforward enough for a cheaper model but would consume substantial Sol context.

Keep the work in the current Sol when it is:

- simple, local, and low-risk;
- a small edit that needs little context;
- pure analysis or a small documentation change;
- cheaper to complete directly than to describe, delegate, and verify.

Do not split one cohesive task into separate workers merely because it spans Server, Desktop, modules, phases, implementation, review, or validation.

## 2. Choose the worker

Use this order:

1. **Luna by default.** Use Luna whenever it is reasonably capable of completing the assignment reliably.
2. **Terra only when Luna is clearly insufficient before delegation.** Choose Terra only when the task can already be identified as requiring stronger reasoning or execution reliability than Luna can reasonably provide.
3. **Never create another Sol worker.** If neither lower-cost worker is suitable, the current Sol completes the work directly.

Do not choose Terra merely because the task is important, large, or spans many files. Prefer Luna when the difficulty is primarily token volume, code reading, implementation, testing, logs, repetitive repair, or browser work.

## 3. Build a self-contained assignment contract

Before spawning a worker, give it one self-contained assignment. Do not rely on the worker reconstructing the parent conversation or rediscovering decisions that Sol has already made.

The assignment should include only the context needed to execute correctly:

- **Objective:** the concrete result to produce.
- **Scope:** files, components, behaviors, or boundaries that may be changed or inspected.
- **Exclusions:** what must not be changed or expanded into.
- **Decisions and constraints:** architecture choices, user requirements, compatibility constraints, and project rules already settled by Sol.
- **Permissions:** whether the worker may edit code, tests, docs, run commands, or use browser tooling.
- **Validation:** the minimum tests, checks, or browser paths required for completion.
- **Output contract:** the evidence Sol needs back.
- **Stopping condition:** what constitutes completion and what blockers require returning control to Sol.

Do not forward the entire parent history when a concise assignment is sufficient.

Use a compact contract similar to this when useful:

```text
Role: implementation worker
Objective: <concrete outcome>
Scope: <allowed files/components/behaviors>
Do not: <explicit exclusions>
Decisions/constraints: <already-settled requirements>
Validation: <required checks/tests/browser paths>
Return: <summary, key diff, validation, risks, evidence>
Stop when: <completion condition or blocker>
```

Treat Sol's supplied decisions, scope, verification requirements, and stopping condition as authoritative unless they conflict with higher-priority instructions.

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

- Sol does not directly create, edit, or delete business code or test code for that delegated task.
- Sol continues to own requirements, scope, necessary architecture decisions, risk judgment, and final review.
- If Sol finds a defect during review, return the finding to the original worker for repair instead of fixing it directly.
- Prefer continuing or resuming the original worker rather than creating another worker.
- If the original worker cannot be continued and work remains, create at most one suitable lower-cost worker for the remaining bounded work.

Use multiple workers only when the assignments are genuinely independent and the parallelism benefit clearly exceeds the extra model, context, coordination, and verification cost.

Do not create additional workers merely to separate implementation, tests, review fixes, or browser validation.

## 5. Protect Sol context

Sol should read only the context needed for decisions and final verification.

Delegate high-volume material such as:

- repository-wide or broad code searches;
- implementation-detail exploration;
- long test or build output;
- logs and traces;
- repeated debugging evidence;
- DOM, screenshots, console output, and network evidence from browser validation.

The worker should return a concise result containing:

- changed files or affected areas;
- modification summary;
- key or high-risk diff information;
- validation performed and results;
- browser-validation result when applicable;
- unresolved issues or blockers;
- material risks;
- only the evidence needed for Sol to verify the claim.

Do not return complete source files, complete logs, large DOM dumps, repeated screenshots, or a long chronological process record unless Sol explicitly needs them to resolve a specific doubt.

Do not make Sol repeat a broad scan, analysis, test suite, or browser inspection that the worker has already completed reliably without evidence of a problem.

When a long task produces stable decisions or state that must survive future work, prefer recording them in the applicable spec, task, or project documentation instead of preserving them only in conversation history.

If the current conversation contains substantial history unrelated to the remaining work, prefer compaction or a new task over increasing Sol context merely to retain that history.

## 6. Verify in proportion to risk

Sol's verification depth should be proportional to both the change risk and the importance of the worker's claims.

Use the smallest verification level that provides adequate confidence:

- **Low risk:** review the worker summary and validation evidence; inspect a key diff only when useful.
- **Medium risk:** inspect the important diff and relevant surrounding code or call sites; confirm the required validation result.
- **High risk or doubtful result:** inspect the critical diff and independently run or reproduce only the minimum validation needed to resolve the risk.

Do not independently repeat the worker's complete implementation analysis or full validation suite by default.

If evidence is incomplete or suspicious, first ask the same worker for the missing targeted evidence or repair when possible instead of duplicating the entire task in Sol.

## 7. Browser validation

Perform browser validation only when the change affects visible UI, interaction, or browser behavior.

The implementation worker owns normal browser validation and should keep it proportional to the changed behavior:

- cover only directly affected critical paths and necessary states;
- perform the minimum sufficient interaction checks;
- avoid whole-site inspection by default;
- avoid repeatedly collecting page snapshots, DOM, screenshots, Console output, or Network output without a concrete need.

The worker returns the browser-validation conclusion, failures, and only the evidence needed to support the result.

Sol does not repeat browser validation unless the result is doubtful, evidence conflicts with the implementation, or the change is sufficiently high-risk to justify a small independent check.

## 8. Handle failures without multiplying cost

If a worker is blocked, it should return the exact blocker, what was already established, remaining work, and the minimum evidence Sol needs to decide the next action.

While a worker is actively handling a delegated task, Sol should not duplicate that implementation or validation work in parallel merely to finish faster.

When a worker result is incomplete:

1. prefer a focused continuation with the original worker;
2. give it the specific defect, failed validation, or missing evidence;
3. avoid restating the full assignment unless essential context changed;
4. create a replacement worker only when continuation is unavailable or clearly unsuitable.

Do not spin up extra workers as speculative retries.

## 9. Completion criteria

Before Sol accepts delegated work, confirm that:

- the assignment objective and scope were satisfied;
- required tests or checks were completed or an explicit blocker was reported;
- required browser validation was completed when applicable;
- material unresolved issues and risks are known;
- Sol performed the verification level appropriate to the risk;
- no unnecessary worker duplication or broad Sol re-analysis remains.

After those checks, integrate the result and report the final outcome to the user from the parent task.
