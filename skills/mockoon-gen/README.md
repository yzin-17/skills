# mockoon-gen

`mockoon-gen` is yzin's frontend API mock workflow skill. It helps turn API documentation or reviewed OpenAPI contracts into a reviewable artifact, generated TypeScript API code, Whistle forwarding rules, and Mockoon mock environments.

The skill is intentionally low-intrusion: it writes generated assets under `.mockoon-gen/` by default and only writes API code to the path confirmed in the artifact.

## Requirements

- Codex or another agent that can install and use `SKILL.md` skills.
- Node.js available in the agent runtime. The bundled CLI is `bin/mockoon-gen.mjs`.
- Whistle installed and running separately when you want to import forwarding rules.
- Mockoon installed separately when you want to import and run the generated mock environment.
- A reviewed OpenAPI file, or API documentation that the skill can first convert into OpenAPI for human review.

The skill does not install Whistle or Mockoon for you.

## Install

Install from GitHub:

```bash
npx skills@latest add https://github.com/yzin/skills/tree/main/skills/mockoon-gen -a codex -g
```

Install from a local checkout:

```bash
npx skills@latest add ./skills/mockoon-gen -a codex -g
```

Restart Codex after installation.

## Use

Invoke the skill explicitly:

```text
$mockoon-gen 根据这个接口文档生成 OpenAPI、api-artifact、Mockoon 和 Whistle 配置
```

Typical workflow:

1. Provide an OpenAPI file or loose API documentation.
2. Review the generated or imported OpenAPI contract.
3. Confirm the request host, Whistle group name, Mockoon port, and generated API code path.
4. Let the skill create or update `.mockoon-gen/api-artifact.json`.
5. Review unresolved items in the artifact.
6. Export generated files:

```bash
node <skill-dir>/bin/mockoon-gen.mjs generate --from .mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export whistle --from .mockoon-gen/api-artifact.json --cwd <project-dir>
node <skill-dir>/bin/mockoon-gen.mjs export mockoon --from .mockoon-gen/api-artifact.json --cwd <project-dir>
```

## Outputs

- `.mockoon-gen/api-artifact.json`: reviewed collaboration artifact.
- `.mockoon-gen/whistle.json`: Whistle import JSON. It contains a demand-specific group and does not emit `Default`.
- `.mockoon-gen/mockoon.json`: Mockoon environment JSON.
- `src/api/generated/api.generated.ts`: default generated API code path, unless changed in the artifact.

## Notes

- OpenAPI is treated as the backend contract source of truth.
- DTOs reflect backend contracts; VO and mapper choices can remain pending when page context is needed.
- Missing `apiHost`, `targetPort`, or `whistleGroupName` blocks Whistle export.
- Missing `mockoonPort` blocks Mockoon export.
- Whistle and Mockoon imports are manual steps in their respective apps.
