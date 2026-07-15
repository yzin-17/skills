---
name: writing-style-yzin
description: Write or revise Chinese technical explanations, implementation plans, PRDs, debugging reports, and developer documentation in Yzin's preferred style. Use when the user asks for a technical draft, detailed explanation, code-oriented analysis, or evidence-backed documentation.
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
