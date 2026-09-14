---
name: delegate-to-chatgpt
description: Explicit-only workflow for delegating a task to the strongest ChatGPT model/mode that is actually selectable after opening the user's ChatGPT page. Use ONLY when the user explicitly invokes `$delegate-to-chatgpt`. Never activate automatically because a task is difficult, large, risky, architectural, or likely to benefit from a stronger model.
---

# Delegate to ChatGPT

Delegate an explicitly requested task to the strongest ChatGPT model/mode that is actually available on the user's currently opened ChatGPT page. Codex remains the sole coordinator and final verifier.

## 1. Hard activation gate

- Run this skill ONLY when the user explicitly invokes `$delegate-to-chatgpt` in the current request.
- Do not infer activation from task complexity, expected quality gains, PR size, architecture risk, debugging difficulty, or mentions of ChatGPT.
- Do not activate because another rule says delegation would be useful.
- Once explicitly invoked, do not skip delegation merely because Codex believes it can solve the task locally.
- Explicit invocation decides **whether** to delegate. Codex still decides **what context to send**, **how to integrate the result**, and **whether the result passes verification**.

## 2. Responsibilities

Treat the external ChatGPT model as a capable but untrusted senior engineer.

Codex must:
- establish repository and runtime facts before delegation;
- send only the minimum context required;
- preserve user changes and permissions;
- independently review any analysis, patch, or claim returned by ChatGPT;
- run applicable local validation itself;
- decide final acceptance.

ChatGPT may:
- perform deep analysis, root-cause investigation, architecture review, code review, research, or implementation design;
- return findings, a minimal patch, complete replacement files when necessary, tests to run, assumptions, and residual risks.

Never treat ChatGPT's statement that a command, test, deployment, or runtime check succeeded as local evidence unless Codex can independently verify that it actually ran in an environment with the required access.

## 3. Model selection

The webpage is the source of truth for model availability and strength.

1. Open the user's ChatGPT page first.
2. Inspect the model and mode options that are actually selectable in the current UI.
3. Select the strongest / highest-capability option the page currently allows.
4. If the selected model exposes a reasoning-strength or effort control, select the maximum strength currently available.
5. Do not maintain a static model ranking, assume availability from the user's plan, or rely on remembered product names.
6. If the strongest option is unavailable, disabled, rate-limited, or otherwise cannot be selected, choose the next strongest option that is actually selectable at that moment.
7. Do not infer the backend model from self-reported identity. Record the model/mode label and strength shown by the ChatGPT UI when relevant.

If the user explicitly requests a particular model or mode, prefer that request when it is selectable; otherwise fall back to the strongest option the page currently makes available and report the substitution.

## 4. Establish local facts

Before sending work externally:

1. Read applicable repository instructions such as `AGENTS.md`, `CLAUDE.md`, README, dependency manifests, and relevant design/spec files.
2. Inspect the current branch, HEAD, working-tree status, uncommitted changes, and required validation commands.
3. If the task targets a GitHub PR, resolve the canonical PR URL, base, remote head OID, current status, and relevant checks using GitHub/`gh` rather than guessing from the branch name.
4. Preserve existing user changes. Never reset or overwrite work merely to create a clean baseline.
5. Convert the user's request plus repository facts into a concise task brief with scope, exclusions, deliverables, tests, and observable acceptance criteria.

## 5. Choose the minimum context channel

Prefer the smallest sufficient context.

### GitHub PR review

Prefer the canonical PR URL when all of the following are true:
- the task is review of an already published PR;
- the remote PR head OID has been verified;
- the local review target is clean and matches that OID, or local differences are explicitly described;
- ChatGPT can actually access the PR diff.

Send the PR URL, base, head OID, review goal, and any local-only differences. Require ChatGPT to confirm it read the file list and diff before trusting its review.

### Local or unpublished code

If the task requires local/unpublished code, a private PR that ChatGPT cannot access, or a patch against local files, create a minimal sanitized source bundle:

```bash
python3 <skill-dir>/scripts/prepare_source_bundle.py \
  --repo /absolute/path/to/repo \
  --include path/to/relevant/module \
  --include AGENTS.md \
  --include README.md
```

- `--include` may be repeated.
- Use `--exclude` to narrow the bundle further.
- At least one `--include` is required unless the user explicitly authorized the entire Git-visible worktree, in which case `--all` may be used.
- Never bypass a secret-scan failure. Exclude the matched file or send a smaller text excerpt and regenerate the bundle.
- Review the final file list before upload. Automated scanning is an additional safeguard, not a substitute for judgment.

Never upload `.env`, credentials, tokens, cookies, private keys, databases, user data, browser state, or other secrets.

## 6. Browser and account boundary

- Use the Codex built-in browser by default for `chatgpt.com` when it is available.
- Do not silently switch to another browser profile because it happens to be logged in.
- Use another browser only when the user explicitly asks for it.
- If authentication, account selection, CAPTCHA, 2FA, passkey, or another security check appears, leave the page for the user to complete. Never request passwords, cookies, recovery codes, or other authentication secrets.
- Reuse an existing ChatGPT tab/conversation when appropriate; otherwise create one conversation for the delegated task.
- Save the conversation URL when the browser exposes one so the work can be resumed and reported.

## 7. Send the task

Read `references/task-brief.md` before delegation and fill the appropriate template from repository facts. Do not ask the user to fill placeholders that Codex can resolve itself.

The brief must include:
- goal and relevant background;
- repository/module and current HEAD;
- local dirty/clean state when relevant;
- architecture and compatibility boundaries;
- allowed scope and explicit exclusions;
- expected deliverables;
- acceptance criteria and tests;
- local/private resources ChatGPT cannot access;
- a prohibition on pretending to have run unavailable commands or environments.

For implementation tasks, ask for the smallest complete patch that satisfies the task. For review tasks, ask for actionable findings rather than speculative rewrites.

## 8. Collect and verify independently

After ChatGPT responds:

1. Check that findings, patches, files, assumptions, and risks are complete.
2. Review every proposed code change before applying it.
3. Preserve unrelated user changes and avoid unnecessary refactors.
4. Run the repository's applicable formatting, lint, type-check, unit, integration, contract, build, and/or E2E checks locally.
5. Distinguish actual local execution from static review, simulation, and suggested-but-not-run checks.
6. Codex decides whether acceptance criteria are met.

## 9. Correction loop

If local verification fails, return to the same ChatGPT conversation with concrete evidence:
- failing command and exit result;
- minimal relevant logs with secrets removed;
- file/path location;
- violated requirement or acceptance criterion;
- expected behavior;
- request for the smallest correction.

Prefer evidence-driven corrections over restarting the whole task. If repeated corrections stop converging, re-evaluate the approach instead of continuing an unbounded loop.

## 10. Final report

Report concisely:
- model/mode selected in the ChatGPT UI and whether it was substituted;
- ChatGPT conversation URL when available;
- PR URL/head or source-bundle identity when applicable;
- accepted and rejected recommendations;
- files/behavior changed by Codex;
- local validation actually run and its result;
- unresolved risks or external blockers.

Do not claim that external analysis, a green PR check, or ChatGPT's own confidence is equivalent to local acceptance.
