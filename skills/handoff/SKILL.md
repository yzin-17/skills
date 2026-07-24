---
name: handoff
description: Create a concise handoff document so a fresh session can continue the current task without inheriting the full conversation.
argument-hint: "What should the next session focus on?"
---

Create a handoff document for a fresh agent session.

Save it as a uniquely named Markdown file in the operating system's
temporary directory. Do not save it in the current workspace.

If the user includes text after invoking the skill, treat it as the intended
focus of the next session and tailor the handoff accordingly.

## Gather context

Use the current conversation to identify goals, requirements, decisions, and
unfinished work.

For software projects, also inspect the current workspace when available:

- applicable `AGENTS.md` files
- current branch, worktree, and HEAD commit
- `git status`
- staged and unstaged changes
- relevant untracked files
- existing specs, plans, ADRs, issues, and documentation
- validation commands already run and their known results

Treat the current workspace state as the source of truth when it conflicts
with older statements in the conversation.

Do not modify project files or continue implementation while preparing the
handoff.

## Avoid duplication

Do not reproduce content already captured in durable artifacts such as specs,
plans, ADRs, issues, commits, or documentation. Reference those artifacts by
path or URL and briefly explain their relevance.

Do not include a full Git diff. Instead, record:

- the current branch and HEAD commit
- whether the working tree is dirty
- the important modified or untracked files
- the intent and current state of those changes
- that the next agent must inspect `git status` and `git diff`

Include enough context to explain decisions or unfinished work that cannot be
reliably reconstructed from those artifacts.

## Required document sections

Use the following structure:

# Task Handoff

## Next-session focus

Describe the focus supplied by the user, or state that no narrower focus was
provided.

## Objective

State the current task and expected outcome.

## Current state

Summarize what has been completed and the present implementation state.

## Constraints and requirements

Record only requirements that materially affect the remaining work.
Reference applicable project instructions instead of duplicating them.

## Decisions

Record important decisions and their rationale when they are not already
captured in another artifact.

## Relevant artifacts

List relevant files, specs, plans, ADRs, issues, commits, and URLs with a
one-line explanation of each.

## Workspace state

Record the branch, HEAD commit, dirty state, key changed files, and any
important uncommitted or temporary work.

## Validation

List commands that were actually run and their results. Clearly mark
validation that has not been run or whose result is unknown.

## Remaining work

List concrete next steps in recommended execution order.

## Risks and open questions

Record blockers, failed approaches, uncertainties, and potential regressions.

## Suggested skills

Suggest only skills that are actually available in the current session.
Use their exact invocation names and explain briefly why each is relevant.
Write `None` when no available skill is clearly useful.

## Fresh-session prompt

Provide a concise prompt that the user can paste into a completely new
session. It must instruct the new agent to read this handoff, inspect the
referenced artifacts, and verify the current workspace state before
continuing.

## Safety and accuracy

- Redact secrets, passwords, API keys, access tokens, credentials, private
  user data, and unnecessary personal information.
- Do not claim that commands, tests, or checks were run unless they actually
  were.
- Distinguish confirmed facts from assumptions and unresolved questions.
- Do not include the complete conversation transcript.
- Keep the document concise and focused on information needed to continue.
- Prefer paths and identifiers over large copied excerpts.

After writing the file:

1. Read it back to confirm that it exists and is complete.
2. Report its absolute path.
3. Show the generated fresh-session prompt in the final response.