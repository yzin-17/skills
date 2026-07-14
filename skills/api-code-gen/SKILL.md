---
name: api-code-gen
description: "Use when generating reviewed TypeScript DTOs, VOs, mappers, and request functions from an OpenAPI contract. Use for API code output planning and generation, not Mockoon or Whistle exports and not reverse synchronization from TypeScript."
---

# API Code Gen

Accept only reviewed OpenAPI. Keep `api-code-artifact.json` independent from mock artifacts. Generate derived code in one direction; do not reverse-sync edits into an artifact.

Use the related page directory for config and artifact files. Review the DTO, VO, mapper, and output plan before generation. This first-stage scaffold provides no Mockoon or Whistle export capability.
