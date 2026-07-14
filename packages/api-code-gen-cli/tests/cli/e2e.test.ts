import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

const openapi = `openapi: 3.0.3
paths:
  /users/{id}:
    get:
      operationId: getUser
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
`;

describe("api-code-gen e2e", () => {
  it("creates a reviewed artifact and generates an approved single-file output", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "api-code-gen-e2e-"));
    const pageDir = "src/pages/user";
    const program = createProgram();
    try {
      await program.parseAsync(["node", "api-code-gen", "init", "--page-dir", pageDir, "--cwd", cwd], { from: "user" });
      const configFile = join(cwd, pageDir, "api-code-gen", "api-code-gen.config.json");
      await writeFile(configFile, JSON.stringify({ apiOutput: "src/pages/user/api.generated.ts", splitApiOutput: false, transformResponse: true }), "utf8");
      const openapiFile = join(cwd, "openapi.yaml");
      await writeFile(openapiFile, openapi, "utf8");
      await program.parseAsync(["node", "api-code-gen", "from-openapi", "openapi.yaml", "--origin", "imported", "--reviewed", "--page-dir", pageDir, "--cwd", cwd], { from: "user" });
      const artifactFile = join(cwd, pageDir, "api-code-gen", "api-code-artifact.json");
      const artifact = JSON.parse(await readFile(artifactFile, "utf8"));
      artifact.output.reviewStatus = "confirmed";
      await writeFile(artifactFile, JSON.stringify(artifact), "utf8");
      await program.parseAsync(["node", "api-code-gen", "generate", "--from", artifactFile, "--cwd", cwd], { from: "user" });
      expect(await readFile(join(cwd, "src/pages/user/api.generated.ts"), "utf8")).toContain("export async function getUser");
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
});
