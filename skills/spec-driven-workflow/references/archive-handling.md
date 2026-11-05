# Completed Task Archiving

Move completed execution documents out of active task entry points while preserving historical evidence, stable identifiers, and current product contracts.

## 1. Archive eligibility

Follow an existing repository lifecycle or archive convention. Otherwise use:

- completed Task documents: `docs/archive/tasks/<same-filename>`;
- Specs that are no longer current requirements/acceptance contracts: `docs/archive/specs/<same-filename>`;
- superseded architecture, domain documents, and ADRs: `docs/archive/design/<same-filename>`;
- closed Review documents: `docs/archive/reviews/<same-filename>`;
- evidence owned exclusively by closed work: `docs/archive/evidence/<same-relative-path>`.

Use these categories only when they have content. Long-lived architecture, domain truth, and ADRs belong in `docs/design/`; scoped requirements and acceptance belong in `docs/specs/`. Their lifecycles are independent, so ongoing design maintenance is not a reason to keep a completed Task active.

Archive a Task document only when all of the following are true for its claimed scope:

- every required executable task and acceptance dependency is complete;
- every required integration, runtime, migration, release, or other named gate for that scope has passed or has a valid `not applicable` basis;
- the final consistency Review passes for the scope being closed;
- no Blocking Question or unowned current-scope acceptance obligation remains;
- the Task document no longer owns unresolved implementation work, including unchecked tasks or deferred `TODO` / `later` items;
- any explicitly confirmed future work that is outside the completed scope has been transferred to the repository TODO index or to an active successor Spec/Task.

Do not archive a task document merely because most checkboxes pass, code was written, a local milestone is done, or a required environment is currently unavailable. Partial or blocked work remains active and must state the remaining condition.

Archiving applies to the completed **task document lifecycle**, not each child `Tn` checkbox independently.

### Unresolved-work ownership

A Task is not archive-eligible while it still owns any unresolved work. Ownership means the Task itself remains the authoritative place that tracks whether the work must be implemented, validated, or accepted.

Before archival, resolve each remaining item in one of these ways:

- complete it and preserve the validation evidence in linked reports, with the acceptance result and evidence pointers in the Task;
- keep the Task active if the item still belongs to the current acceptance scope;
- for explicitly confirmed future work outside the completed scope, transfer ownership to the repository TODO index or an active successor Spec/Task, preserving a source link instead of a second status copy;
- remove the item only when the authoritative decision explicitly cancels or supersedes it.

A historical reference such as `后续事项见 docs/TODO.md` does not itself block archival after ownership has moved. Likewise, the literal word `TODO` in historical prose or a link is not an archive blocker. The blocker is unresolved work still owned by the document.

## 2. Pre-archive closure

Before moving a completed Task document:

1. Finalize its status, required evidence, and final Review conclusion. Preserve stable Task/AC IDs and enough evidence to explain why the scope was accepted.
2. Synchronize confirmed deferred work through `todo-tracking.md`. Current-scope gaps cannot be relabeled as future work during closure. Verify that no unresolved work remains owned by the Task after synchronization.
3. Decide separately whether the linked Spec remains a current requirements/acceptance contract. Completion of implementation does not by itself make a Spec historical. Archive a completed implementation-only or superseded Spec when it no longer owns a current contract; ensure still-needed design truth has an authoritative home in `docs/design/` rather than copying it into another active Spec.
4. Identify active references that would break or become misleading after the move, especially TODO entries, indexes, READMEs, successor documents, Review links, and linked implementation logs/evidence. Include relative links and historical anchors in both directions.
5. Update the authoritative design or guide that owns current architecture, operation, or domain truth. Preserve any still-current Spec requirements and acceptance. Do not keep a completed Task active merely to serve as current architecture documentation.

## 3. Move semantics

Preserve the original filename, first-creation date, stable identifiers, completion evidence, and historical links inside the archived document unless the repository convention requires another layout.

A completed Task normally moves from:

```text
docs/tasks/<task>.md
→ docs/archive/tasks/<task>.md
```

A linked Spec is handled independently:

- keep it in the active Spec location when it still defines current product behavior, interfaces, invariants, or acceptance expectations;
- archive it only when it is completed implementation history, superseded by a newer current contract, or otherwise no longer a valid source for new implementation;
- when archived without a repository-specific path, move it to `docs/archive/specs/<same-filename>`.

Archive means “historical, not a current implementation source.” It does not mean deletion.

Supporting implementation logs and evidence follow [documentation-structure.md](documentation-structure.md). They may be extracted while the Task is still active; this does not archive or complete that Task. Evidence lives independently in `docs/evidence/`. At closure, exclusively owned historical evidence may move to `docs/archive/evidence/`; active or shared evidence keeps one authoritative copy and stable references. Preserve raw/frozen bytes, update actual path consumers, and do not concatenate reports back into the Task or duplicate an evidence history.

Repair inbound references directly and remove the original completed-Task path by default. A repository with no active Tasks may keep the absence/status entry in `docs/README.md` instead of retaining an empty task directory or index.

If concrete inbound links cannot be updated in the same change and the repository already permits compatibility redirects, the old path may temporarily contain only a short pointer to the archive location. Do not duplicate status, acceptance criteria, evidence, or implementation details in the redirect. Remove such redirects after references are repaired when the repository convention expects that cleanup.

## 4. TODO and successor links

When a TODO item cites a Task that is being archived:

- update the TODO link to the archived Task as **historical provenance** if that original source is still useful;
- keep the TODO summary bounded and do not copy the archived implementation plan into TODO;
- do not treat the archived Task as the active contract for future implementation.

When future work is started from a TODO whose source is archived, create or update an active Spec/Task first, based on the current repository state and current requirements. The archived source may inform history, but the new active documents own implementation and acceptance.

When a successor Spec/Task already exists, prefer linking TODO or active indexes to that successor and retain the archived source only where provenance is useful.

## 5. Post-archive checks

After moving documents, verify that:

- no completed Task remains presented as an active implementation entry unless the repository convention intentionally keeps it there;
- no blocked or incomplete Task was archived;
- no archived Task still owns unresolved implementation work;
- active indexes and TODO links resolve to the intended current or historical source;
- still-current Specs remain discoverable and are not archived solely because their implementation finished;
- long-lived design stays separately discoverable, and historical design is not presented as a current architecture, domain rule, or ADR;
- archived Specs/Tasks are not described as current requirements or current runtime truth;
- the archive move did not remove required evidence or stable identifiers;
- implementation-log/evidence links, backlinks, and any moved historical anchors still resolve, and no supporting report is presented as the current task-status owner.

For path changes, apply the migration checks in `documentation-structure.md`, including scripts/tests/CI that read evidence and the Git-tracked delivery when a commit is in scope. Existing local files alone do not prove a published document tree is complete.

Do not create a second completed-work status database. The archived Task itself, Git history, and any repository archive index are sufficient unless project rules require more.

## 6. Handoff

Report the archived paths, any Specs intentionally kept active, TODO or index links updated, compatibility redirects created if any, and any documents that remain active because closure conditions were not met.
