---
name: handoff
description: Create a concise handoff document so a fresh agent session can continue the current task without inheriting the full conversation.
argument-hint: "What should the next session focus on?"
---

Create a concise handoff document for a completely fresh agent session.

The purpose of this skill is to preserve only the context needed to continue
the task, while allowing the user to start a new session without inheriting
the full conversation history.

If the user includes text after invoking this skill, treat it as the intended
focus of the next session and tailor the handoff accordingly.

## Output location

Determine the output path before composing the document.

Save the handoff as a uniquely named Markdown file in the operating system's
native temporary directory.

Use this filename pattern:

`codex-handoff-YYYYMMDD-HHMMSS.md`

Requirements:

- Use an absolute path.
- Do not save the file inside the current workspace.
- Do not overwrite an existing handoff file.
- Do not modify project files while preparing the handoff.
- Do not delete older handoff files automatically.
- The generated fresh-session prompt must contain the exact absolute path.
- Never leave a placeholder such as `<HANDOFF_PATH>` in the saved document or
  final response.

## Gather context

Use the current conversation to identify:

- the current objective
- user requirements and constraints
- decisions that materially affect the remaining work
- completed work
- unfinished work
- failed approaches
- blockers and open questions
- known validation results

For software projects, also inspect the current workspace when available:

- applicable `AGENTS.md` files
- current repository and worktree
- current branch
- current HEAD commit
- `git status`
- staged changes
- unstaged changes
- relevant untracked files
- relevant specs, plans, ADRs, issues, documentation, and commits
- validation commands that were actually run and their results

Treat the current workspace state as the source of truth when it conflicts
with older statements in the conversation.

Do not continue implementation while creating the handoff.

Do not make unrelated source-code changes.

## Avoid duplication

Do not reproduce information already captured in durable artifacts such as:

- specs
- implementation plans
- ADRs
- issues
- pull requests
- commits
- project documentation

Reference those artifacts by path, identifier, or URL and briefly explain
their relevance.

Do not include a complete Git diff.

Instead, record:

- the current branch
- the current HEAD commit
- whether the working tree is dirty
- important staged, modified, deleted, or untracked files
- the intent and current state of those changes
- whether any changes appear temporary or incomplete
- that the next agent must inspect `git status` and `git diff`

Do not duplicate instructions already present in an applicable `AGENTS.md`.
Reference the file instead and mention only task-specific constraints that
are not captured there.

Include enough context to preserve decisions and unfinished work that cannot
be reliably reconstructed from the referenced artifacts or repository state.

## Required document structure

Write the handoff document using the following structure.

# Task Handoff

## Handoff file

Include the exact absolute path of this handoff document.

## Next-session focus

Describe the focus supplied by the user.

If no narrower focus was supplied, explicitly state that the next session
should continue the current task.

## Objective

State:

- the task being performed
- the expected outcome
- the current scope
- relevant non-goals when necessary

## Current state

Summarize:

- what has been completed
- what is partially complete
- the current implementation state
- the most important facts the next agent must know before continuing

Prefer current facts over a chronological retelling of the conversation.

## Constraints and requirements

Record only requirements that materially affect the remaining work.

Reference applicable project instructions by path instead of copying them.

Clearly distinguish:

- explicit user requirements
- repository or project requirements
- inferred constraints
- unresolved assumptions

## Decisions

Record important decisions and their rationale when they are not already
captured in another artifact.

Do not include obsolete discussion or every alternative that was considered.

Include rejected approaches only when repeating them would waste time or
cause a regression.

## Relevant artifacts

List relevant items such as:

- files
- directories
- specs
- plans
- ADRs
- issues
- pull requests
- commits
- documentation
- URLs

For every item, include a short explanation of why it matters.

Use exact paths and identifiers where possible.

## Workspace state

For Git repositories, record:

- repository root
- worktree path when relevant
- current branch or detached-HEAD state
- current HEAD commit
- whether the working tree is clean or dirty
- important staged files
- important unstaged files
- important untracked files
- temporary or incomplete changes
- whether any commit, push, or pull request was created

Do not paste the full diff.

Tell the next agent to independently inspect:

- `git status`
- `git diff`
- `git diff --staged`

For non-Git workspaces, describe the equivalent current file state.

## Validation

List only commands or checks that were actually performed.

For each validation item, record:

- the exact command or action
- whether it passed, failed, or was interrupted
- relevant failure details
- any limitations of the result

Clearly mark:

- checks that were not run
- results that are unknown
- tests that need to be rerun after later changes

Never claim that a command succeeded unless it actually ran successfully.

## Remaining work

List concrete next steps in recommended execution order.

Each step should identify, where possible:

- the file or module involved
- the expected change
- the validation needed afterward
- dependencies on earlier steps

Do not use vague instructions such as “finish the feature” when a more
specific next action can be stated.

## Risks and open questions

Record:

- blockers
- unresolved questions
- uncertain assumptions
- failed approaches worth avoiding
- possible regressions
- security, compatibility, or migration risks
- areas requiring user confirmation

Clearly separate confirmed problems from speculation.

## Suggested skills

Suggest only skills that are actually available to the current agent session.

Requirements:

- Use the exact Skill invocation name.
- Briefly explain why each Skill would help.
- Do not invent Skill names.
- Do not suggest unavailable Skills.
- Do not suggest installing new Skills unless the user explicitly requested
  installation recommendations.
- Write `None` when no available Skill is clearly relevant.

## Fresh-session prompt

Create a concise, self-contained prompt that the user can paste directly into
a completely new session.

The prompt must include the exact absolute path of this handoff file.

Do not use:

- placeholders
- relative paths
- “this document”
- “the previously generated handoff”
- any wording that depends on access to the old conversation

The prompt must instruct the new agent to perform these actions in order:

1. Read the handoff document completely from the exact absolute path.
2. Confirm that the handoff contents have been loaded before deleting it.
3. Delete only that exact handoff file.
4. Request user approval if deletion requires access outside the current
   workspace or sandbox.
5. Verify whether that exact file was deleted.
6. If deletion is denied or fails, report that the file remains and continue
   the task without deleting anything else.
7. Read all applicable `AGENTS.md` files.
8. Inspect `git status`, `git diff`, and `git diff --staged` when the workspace
   is a Git repository.
9. Read the artifacts referenced in the handoff.
10. Treat the current workspace state as the source of truth.
11. Continue from the first applicable item under `Remaining work`.
12. Do not rely on or assume access to the previous conversation.

The deletion instruction must target only the exact absolute handoff path.

It must never instruct the next agent to use:

- wildcards
- recursive deletion
- directory deletion
- filename-prefix matching
- cleanup of other handoff files
- deletion of the operating system's temporary directory

Use a prompt similar to the following, replacing the example path with the
actual generated absolute path:

```text
Read the handoff document completely from this exact path before doing any
other work:

"/absolute/path/to/codex-handoff-YYYYMMDD-HHMMSS.md"

After its contents have been loaded, delete only that exact file. If deleting
it requires permission outside the current workspace or sandbox, request my
approval. Verify whether the exact file was deleted. If deletion is denied or
fails, report that the file remains and continue without deleting any other
file.

Then read all applicable AGENTS.md files, inspect `git status`, `git diff`,
and `git diff --staged`, and review the artifacts referenced by the handoff.

Treat the current workspace as the source of truth. Continue from the first
applicable item under `Remaining work`. Do not rely on the previous
conversation.
```

The actual document and final response must contain the real absolute path,
not the example path.

## Security and privacy

Redact:

- passwords
- API keys
- access tokens
- refresh tokens
- cookies
- private keys
- authentication headers
- credentials
- secret environment-variable values
- private user data that is not necessary for continuing the task
- unnecessary personally identifiable information

Do not reproduce secrets even when they appeared earlier in the conversation,
logs, commands, diffs, or configuration files.

When a secret-bearing file is relevant, reference its path and describe its
purpose without copying the secret value.

Do not include the complete conversation transcript.

Do not include hidden model reasoning or private chain-of-thought.

## Accuracy requirements

- Distinguish verified facts from assumptions.
- Prefer repository state over outdated conversational claims.
- Do not claim files exist unless their existence was verified.
- Do not claim commands were run unless they were actually run.
- Do not claim tests passed unless their successful result was observed.
- Do not invent paths, commits, branches, issues, URLs, or Skill names.
- Preserve unresolved questions instead of guessing.
- Keep the document focused on information needed by the next session.

## Final procedure

Perform these steps in order:

1. Determine a unique absolute path in the operating system's temporary
   directory.
2. Compose the handoff using that exact path.
3. Ensure the `Handoff file` section contains that exact path.
4. Ensure the `Fresh-session prompt` contains that exact path.
5. Write the Markdown document to the selected path.
6. Read the written file back.
7. Confirm that the file exists and is complete.
8. Confirm that no placeholder paths remain.
9. Confirm that no sensitive values were included.
10. Confirm that the deletion instruction targets only the exact file.
11. In the final response, report the absolute path.
12. In the final response, reproduce the copy-ready fresh-session prompt
    containing the exact absolute path.

Do not delete the handoff file in the current session. The fresh session is
responsible for requesting permission and deleting it after reading it.