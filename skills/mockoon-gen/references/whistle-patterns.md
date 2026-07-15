# Whistle patterns

Use host-only `apiHost` values: no scheme, path, `^`, or `$`.

For OpenAPI paths with parameters, derive a matcher with leading `^`, replace each `{param}` with `*`, and replace the same target parameters with `$1`, `$2`, and so on. Do not add terminal `$` unless exact trailing matching is explicitly required.

Example:

```text
^api.example.test/api/skus/*/warehouses/* http://127.0.0.1:3100/api/skus/$1/warehouses/$2
```
