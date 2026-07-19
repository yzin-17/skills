---
name: writing-style-yzin
description: Apply Yzin's preferred style to external-facing Chinese technical articles. Invoke this skill only when the user explicitly references `$writing-style-yzin`; never trigger it automatically, including for technical articles, blog posts, tutorials, or case studies.
---

# Yzin Technical Writing Style

Write in Chinese by default. Keep established API names, code, configuration keys, and technical terms in their original language where that improves precision.

## Structure and depth

- Lead with the conclusion or the actual problem; avoid generic introductions.
- Explain in layers: mechanism, implementation, verification, and trade-offs.
- Use descriptive headings, numbered steps, and compact lists for multi-part material.
- Include the necessary execution details: API calls, configuration, data flow, relevant edge cases, and a practical verification method.
- Prefer a minimal runnable or directly adaptable code example when code clarifies the point. Comment the non-obvious lines.
- For investigation or comparison, preserve meaningful failed attempts and state what each one proves or rules out.

## Public technical articles

- Start with `## 背景`. Use a concrete project blockage, attempted approaches, their mechanisms and actual impact to lead into the decision; do not open with a tool definition or abstract conclusions.
- When comparing tools, first state where each alternative fits. Explain the current choice through the project's architecture, integration cost, or governance boundary; do not frame an unchosen tool as incapable merely because it is unsuitable here.
- Explain the mechanism, benefit, and cost of a technical decision before its operating steps. State relevant constraints such as proxy hops, certificate trust, scope of matching, or maintenance cost when they affect the choice.
- Organize the main flow around the reader's task: `input → manual review → user decision → artifacts → integration testing`. Do not organize public content around internal CLI implementation or command order.
- Make manual review an explicit gate when input documents must become a contract. State the information that must be completed or confirmed, and do not imply that a generator can replace that review.
- Include only details needed for the reader to succeed: inputs, decisions, artifact responsibilities, consumption methods, and verification. Omit internal implementation details that do not change the reader's outcome.
- Introduce all generated artifacts and their consumers together before explaining how each runtime tool uses them. Do not repeatedly explain the same artifact throughout the procedure.
- Check each paragraph before finishing: it must add a new fact, decision condition, operating result, or explicit trade-off. Merge or remove wording that merely repeats an earlier conclusion.

## Reasoning and claims

- State assumptions and applicable conditions before making a conditional claim.
- Distinguish documented behavior, observed experiment results, and inference.
- Include limitations, counterexamples, performance cost, compatibility constraints, and failure paths when relevant.
- Do not present an unverified claim as fact. Say what evidence would verify it.

## Citations

- When external facts, specifications, benchmarks, or technical conclusions are used, place a clickable source link directly after the supported statement, using a numbered citation such as `[[1]](https://example.com)`.
- Add a final `## 参考文献` section whenever external sources are cited. List the same sources in numeric order with organization or author, title, direct URL, and version, publication date, or access date when available.
- Prefer primary sources: official documentation, specifications, release notes, source repositories, RFCs, and original papers.
- For experiments, add the environment, configuration, and reproduction steps instead of substituting a citation.
- Do not add citations to common explanations that did not rely on external material.

## Tone

Be direct, concrete, and technical. Avoid promotional wording, vague best-practice claims, and unsupported phrases such as “officially stated” without a source. Match the requested format and scale detail down for brief conversational replies.
