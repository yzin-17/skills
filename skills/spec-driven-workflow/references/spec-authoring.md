# Spec Authoring

Define stable intent, acceptance, and decision boundaries without turning the Spec into a file-by-file execution plan.

## 1. Context discovery

Inspect only context relevant to the requested change and within the permitted source boundary:

- current code, domain models, behavior, and reusable test seams when available;
- terminology, ADRs, architecture constraints, and nearby Specs;
- existing callers, compatibility paths, persisted data, and deployment constraints that affect the design.

When only documents are available, distinguish their reported implementation or runtime state from independently verified state. Do not infer the contents of linked but unread reports or repositories.

Reuse existing domain names. Propose a prerequisite refactor only when it directly serves the approved change; avoid speculative abstractions and unrelated cleanup.

## 2. Scope and Spec boundaries

Prefer separate Spec units when subsystems deliver independently useful behavior, can be independently accepted, and do not need strong transactional or architectural coupling to land together. Each unit needs its own linked task document and stable ID.

Keep one Spec when the areas jointly define a cohesive domain or product contract. Explain the shared boundary when material. Split its implementation tasks and gates as needed; do not create separate Specs merely for each database, API, runtime, or client.

Scope templates never override explicit non-goals. Optional queues, isolated workers, storage adapters, or migration mechanisms remain optional unless an approved decision activates them.

## 3. Spec contract

A Spec should contain:

- background, goals, non-goals, and dated current-state constraints;
- design, externally observable behavior, interfaces, and domain boundaries;
- data, state, permission, compatibility, and migration effects;
- test strategy, risks, alternatives, open questions, and acceptance criteria.

Avoid exhaustive file paths, implementation logs, and long code listings. Include concise Schemas, types, state machines, or formal examples when they express confirmed semantics more precisely than prose.

### Recommended template

```md
# <任务名称> Spec

> 任务标识：<稳定 ID>
> 日期：<首次创建日期>
> 状态：<与当前计划一致的状态>
> 对应任务：<任务文档链接>

## 背景与问题
## 目标
## 非目标
## 现状与约束
## 设计方案
## 对外行为或接口变化
## 数据、状态或兼容性影响
## 测试策略
### 关键可观察行为
### 测试层级与证据边界
### 可复用或需要新增的测试入口
### 关键边界与回归场景
### 必要集成与真实运行态门禁（如适用）
## 风险与备选方案
## 未决问题
### Blocking
### Non-blocking
## 验收标准
- AC1：<可观察或可独立验证的结果>
```

## 4. Decisions, inventories, and readiness

Do not convert an assumption into a confirmed requirement.

- **Blocking**: different answers materially change behavior, interfaces, data semantics, permissions, compatibility, test strategy, or acceptance. Stop affected implementation until resolved.
- **Non-blocking**: the stable contract is unchanged and work can proceed using an explicit default with a bounded impact. Record both the default and its boundary.

Write `无` when there are no open questions. Document-only work may finish with clearly reported blockers unless an implementation-ready plan was requested. Independent work may continue only when it does not rely on an unresolved decision.

Distinguish design uncertainty from operational readiness: an unavailable test environment can block required validation without making unrelated domain implementation unsafe.

For existing systems:

- Place read-only data/caller inventories before the decisions or changes they govern. If the Spec requires an inventory before implementation, do not defer it to final acceptance.
- Existing rows do not establish whether they may be deleted, converted, or ignored. Record retention requirements and authorization before migration or Contract decisions.
- Define the required deployment or adapter behavior, not an accidental local topology. Lack of an optional worker or queue is not itself a failure.
- An environment gate should identify the target revision/configuration, migration state, required routes, and relevant capabilities. Healthy processes alone do not prove feature readiness.

Use conditional branches for retention or infrastructure decisions. Do not silently activate both branches or add compatibility that the Spec prohibits.

## 5. Acceptance criteria

Each criterion must have a stable ID such as `AC1`, express an observable or independently verifiable outcome, and permit a clear pass/fail decision. Include every material requirement rather than leaving acceptance obligations only in prose.

A broad AC may contain several assertions. Keep its stable ID and identify its sub-assertions in the task mapping, for example `AC1 / Schema 拒绝` and `AC1 / 运行时拒绝`; do not renumber unrelated ACs merely to improve ownership.

State acceptance boundaries when ambiguity matters:

- supported behavior versus explicit unavailable/unsupported behavior;
- contract or fixture proof versus deployed interoperability or real-data proof;
- required functionality versus a conditional performance or deployment enhancement;
- local deliverable completion versus whole-feature release acceptance.

A correct unavailable response proves that error path, not a successful run for that capability. A representative scenario proves its declared coverage, not an untested support matrix.

## 6. Test strategy

Define tests with the design, not as a final repair phase. Prefer observable behavior, existing entry points, and the smallest evidence sufficient for the risk. TDD is optional; validated completion is not.

Distinguish evidence levels as applicable:

1. Component/contract: local semantics, persistence behavior, serialization, and boundary failures.
2. Integration: real components connected through the actual contracts, including a bounded real-semantic path.
3. Target runtime: the required deployed services, data, persistence, isolation, or recovery behavior on an identified configuration.

These are evidence boundaries, not a requirement to create three tasks for every feature. Targeted tests stay with their implementation. Separate a gate when it has an independent acceptance decision, shared integration responsibility, distinct environment, or materially different setup/verification cost.

Plan the earliest useful real-semantic path before all enhancements are complete. Preserve the minimum safety invariants needed for that path. It demonstrates integration risk reduction, not completion of the entire support matrix.

Specify assertions, not just command names or test counts. Static dependency scans do not prove the absence of runtime side effects; layout smoke does not prove a persisted user journey. Shared evidence may satisfy several assertions when its actual coverage is explicit.

Performance spikes may establish a baseline or support an infrastructure decision. A baseline is not a passed performance threshold unless the applicable acceptance threshold and workload are defined. Do not tune a pass threshold after the fact merely to make a measurement pass.

## 7. Change and status rules

Update the Spec first when confirmed feedback changes stable behavior, business rules, interfaces, data/state/permission semantics, compatibility, acceptance-relevant testing, or acceptance criteria. Replace obsolete requirements instead of keeping contradictory active statements.

Change only the task document for implementation sequencing, task granularity, or internal details that preserve the stable contract. A local task may hand a product-level check to an explicit gate only if the same feature-level obligation remains intact.

Keep current status and linked task IDs synchronized. Preserve historical baseline descriptions with an explicit baseline date; do not present pre-implementation state as current fact after implementation has progressed. Keep detailed execution evidence in Tasks or linked reports, not in the Spec.

Use this check: another developer given only the updated Spec should be able to implement the intended behavior without guessing newly confirmed requirements.
