# Spec Authoring

This reference defines how to inspect project context, choose Spec boundaries, author stable Specs, define acceptance criteria, and keep Specs synchronized with later feedback.

## 1. Context discovery

Before creating or updating a Spec, inspect the project context directly related to the requested change. Do not design only from the request text when the repository can establish current behavior or constraints.

At minimum, check as relevant:

- current code, domain models, and existing behavior;
- existing project terminology and naming;
- ADRs, architecture constraints, or design conventions in scope;
- reusable interfaces, module boundaries, and test entry points;
- nearby features, compatibility logic, migration paths, or prior Specs.

Prefer the repository's existing domain terminology. Do not introduce a second name for an existing concept without a clear reason.

If the current structure materially increases the risk or complexity of the target change, a prerequisite refactor may be proposed, but only when it directly serves the Spec. Avoid speculative refactoring.

## 2. Scope and Spec boundaries

Before authoring the Spec, decide whether the request spans independently deliverable subsystems.

Prefer separate Spec units when different parts:

- can deliver independently useful behavior;
- can be tested and accepted independently;
- do not require strong transactional or architectural coupling to land together.

If separate Spec units are created, each unit must have its own linked task document and stable task ID.

If one Spec is retained across multiple areas, record why those areas must be designed and delivered together.

## 3. Spec contract

A Spec describes stable design intent, domain boundaries, and externally observable behavior. It should not become a file-by-file implementation plan.

A Spec should contain at least:

- Background and problem
- Goals
- Non-goals
- Current state and constraints
- Design
- External behavior or interface changes
- Data, state, or compatibility impact
- Test strategy
- Risks and alternatives
- Open questions
- Acceptance criteria

Avoid concrete file paths, long code listings, or implementation details that are likely to become stale. Keep concise state machines, Schemas, type structures, or similar formal examples only when they express an already-confirmed design decision more precisely than prose.

### Recommended template

```md
# <任务名称> Spec

## 背景与问题

## 目标

## 非目标

## 现状与约束

## 设计方案

## 对外行为或接口变化

## 数据、状态或兼容性影响

## 测试策略

### 关键可观察行为

### 优先测试层级

### 可复用的现有测试入口

### 需要新增的测试入口

### 关键边界与回归场景

## 风险与备选方案

## 未决问题

### Blocking

### Non-blocking

## 验收标准

- AC1：<可观察且可验证的验收结果>
- AC2：<可观察且可验证的验收结果>
```

## 4. Open-question gate

Do not turn an important assumption into a confirmed requirement.

Classify unresolved questions as:

- **Blocking**: different answers would materially change external behavior, interfaces, data semantics, compatibility, test strategy, or acceptance criteria.
- **Non-blocking**: the stable contract remains unchanged and work can proceed using an explicitly recorded default assumption without expanding scope.

If there are no open questions, write `无` rather than leaving the section ambiguous.

For every Non-blocking question that remains open, record the current default assumption and its impact boundary.

Implementation must not begin while a Blocking question remains unresolved. Document-only work may still be completed with Blocking questions clearly recorded, unless the user explicitly requires an implementation-ready Spec.

## 5. Acceptance criteria

Acceptance criteria are the bridge between Spec intent and executable tasks.

Each criterion must:

- use a stable unique ID such as `AC1`, `AC2`;
- describe an externally observable or otherwise independently verifiable outcome;
- be specific enough that a reviewer can determine pass or fail;
- avoid implementation-only wording unless implementation structure is itself part of the contract.

Do not hide requirements only inside prose when they are necessary for acceptance. Each material acceptance requirement should appear as an AC or be directly covered by one.

## 6. Test strategy

Define the test strategy during Spec authoring rather than after implementation.

Prefer tests that verify observable behavior over internal implementation details.

When choosing test seams:

- reuse existing test entry points first;
- prefer higher-level tests that cover a complete behavior chain when practical;
- add a new test seam only when existing entry points cannot validate the target behavior effectively;
- avoid introducing many new test seams for a single feature;
- record important boundaries, compatibility behavior, and regression risks.

For internal refactors that intentionally preserve external behavior, existing regression coverage may be sufficient if it meaningfully proves behavior remains unchanged.

TDD is not mandatory. The required invariant is that completed work has validation evidence appropriate to its risk.

## 7. Spec change rules

Update the Spec when feedback changes any stable contract, including:

- feature or interaction behavior;
- business rules or boundary conditions;
- external interfaces or data structures;
- state, permission, or compatibility requirements;
- test strategy when it changes how acceptance is determined;
- acceptance criteria;
- previously ambiguous, missing, or invalid Spec statements.

Pure implementation refactors, naming changes, formatting, or other changes that do not alter externally observable behavior generally do not require a Spec update.

When new explicit user feedback conflicts with the current Spec, the latest confirmed feedback wins. Modify or remove obsolete Spec statements rather than keeping contradictory history in the active contract.

Use this test:

> If the current implementation disappeared and another developer received only the updated Spec, they should be able to implement the newly intended result.
