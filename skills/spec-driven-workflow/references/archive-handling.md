# Completed Task Archiving

Move completed execution documents out of active task entry points while preserving historical evidence, stable identifiers, and current product contracts.

## 1. Archive eligibility

Follow an existing repository lifecycle or archive convention. Otherwise use:

- completed Task documents: `docs/archive/tasks/<same-filename>`;
- Specs that are no longer current contracts: `docs/archive/specs/<same-filename>`.

Archive a Task document only when all of the following are true for its claimed scope:

- every required executable task and acceptance dependency is complete;
- every required integration, runtime, migration, release, or other named gate for that scope has passed or has a valid `not applicable` basis;
- the final consistency Review passes for the scope being closed;
- no Blocking Question or unowned current-scope acceptance obligation remains;
- any explicitly confirmed future work that is outside the completed scope has been moved to the repository TODO index or to an active successor Spec/Task.

Do not archive a task document merely because most checkboxes pass, code was written, a local milestone is done, or a required environment is currently unavailable. Partial or blocked work remains active and must state the remaining condition.

Archiving applies to the completed **task document lifecycle**, not each child `Tn` checkbox independently.

## 2. Pre-archive closure

Before moving a completed Task document:

1. Finalize its status, required evidence, and final Review conclusion. Preserve stable Task/AC IDs and enough evidence to explain why the scope was accepted.
2. Synchronize confirmed deferred work through `todo-tracking.md`. Current-scope gaps cannot be relabeled as future work during closure.
3. Decide separately whether the linked Spec remains a current contract. Completion of implementation does not by itself make a Spec historical.
4. Identify active references that would break or become misleading after the move, especially TODO entries, indexes, READMEs, successor documents, and Review links.
5. Update active documentation that owns current architecture, operation, or domain truth when the repository convention requires it. Do not keep a completed Task active merely to serve as current architecture documentation.

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
- active indexes and TODO links resolve to the intended current or historical source;
- still-current Specs remain discoverable and are not archived solely because their implementation finished;
- archived Specs/Tasks are not described as current requirements or current runtime truth;
- the archive move did not remove required evidence or stable identifiers.

Do not create a second completed-work status database. The archived Task itself, Git history, and any repository archive index are sufficient unless project rules require more.

## 6. Handoff

Report the archived paths, any Specs intentionally kept active, TODO or index links updated, compatibility redirects created if any, and any documents that remain active because closure conditions were not met.
