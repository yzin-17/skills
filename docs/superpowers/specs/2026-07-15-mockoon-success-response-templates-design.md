# Mockoon Success Response Templates Design

## Goal

Make generated Mockoon success responses return usable randomized data. Lists must include both a single-item success scenario and a multi-item success scenario.

## Inference Rules

- Resolve local OpenAPI references of the form `#/components/schemas/<name>`, including references nested in object properties and array items.
- Generate Mockoon template expressions recursively for objects, arrays, strings, numbers, integers, booleans, enums, and nullable values.
- For an array response, create a one-item success body and a multi-item success body. The multi-item count uses the existing list policy, whose default is 20 and whose configured value must exceed 1.
- For an object containing a recognized list property, preserve the object envelope and apply the same one-item and multi-item variants to that property.

## Review Gates

- Missing response schema, external references, cyclic local references, and unsupported composition schemas (`oneOf`, `anyOf`, `allOf`) must create an open `needsReview` item.
- Do not silently replace an unknown successful response with `{}`. The normal preflight gate blocks export until the review item is resolved.
- Keep deterministic generation when a schema is fully supported; no human review is required for supported local references or primitive responses.

## Artifact and Output

- Retain the existing mock artifact structure and generated scenario bodies.
- Make scenario intent explicit: the default successful list response has one item, and the additional multi-item success response uses the policy count.
- Do not change Whistle behavior, API-code generation, output paths, or the existing confirmation gates.

## Tests

- Add coverage for local and nested `$ref`, root primitive responses, root arrays, and object-wrapped lists.
- Assert generated templates are non-empty and preserve JSON primitive types where applicable.
- Assert list artifacts include one-item and multi-item success scenarios, with the latter containing more than one item.
- Assert missing/unsupported schemas create open `needsReview` items and make preflight not ready.
