import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ApiCodeArtifact } from "../../src/artifact/types.js";
import { createProgram } from "../../src/cli.js";

const OPENAPI = `openapi: 3.0.3
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
  /teams/{id}:
    get:
      operationId: getTeam
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

const UNSUPPORTED_OPENAPI = `openapi: 3.0.3
paths:
  /users:
    post:
      operationId: createUser
      parameters:
        - in: query
          name: verbose
          schema:
            type: boolean
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: OK
`;

function program() {
  return createProgram().exitOverride();
}

async function prepareProject(config: Record<string, unknown> = {}, openapi = OPENAPI): Promise<{ cwd: string; pageDir: string; artifactFile: string }> {
  const cwd = await mkdtemp(join(tmpdir(), "api-code-gen-e2e-"));
  const pageDir = "src/pages/user";
  await program().parseAsync(["node", "api-code-gen", "init", "--page-dir", pageDir, "--cwd", cwd], { from: "user" });
  const configFile = join(cwd, pageDir, "api-code-gen", "api-code-gen.config.json");
  await writeFile(configFile, JSON.stringify(config), "utf8");
  await writeFile(join(cwd, "openapi.yaml"), openapi, "utf8");
  await program().parseAsync(["node", "api-code-gen", "from-openapi", "openapi.yaml", "--origin", "imported", "--reviewed", "--page-dir", pageDir, "--cwd", cwd], { from: "user" });
  return { cwd, pageDir, artifactFile: join(cwd, pageDir, "api-code-gen", "api-code-artifact.json") };
}

async function readArtifact(file: string): Promise<ApiCodeArtifact> {
  return JSON.parse(await readFile(file, "utf8")) as ApiCodeArtifact;
}

async function writeArtifact(file: string, artifact: ApiCodeArtifact): Promise<void> {
  await writeFile(file, JSON.stringify(artifact, null, 2), "utf8");
}

async function expectGenerateToReject(cwd: string, artifactFile: string, message: string): Promise<void> {
  await expect(program().parseAsync(["node", "api-code-gen", "generate", "--from", artifactFile, "--cwd", cwd], { from: "user" })).rejects.toThrow(message);
}

describe("api-code-gen e2e", () => {
  it("requires the reviewed flag before creating an artifact", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "api-code-gen-e2e-"));
    try {
      await writeFile(join(cwd, "openapi.yaml"), OPENAPI, "utf8");
      await expect(program().parseAsync(["node", "api-code-gen", "from-openapi", "openapi.yaml", "--origin", "imported", "--page-dir", "src/pages/user", "--cwd", cwd], { from: "user" })).rejects.toThrow('process.exit unexpectedly called with "1"');
      await expect(readFile(join(cwd, "src/pages/user/api-code-gen/api-code-artifact.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("generates approved single-file output", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/pages/user/api.generated.ts", splitApiOutput: false, transformResponse: true });
    try {
      const artifact = await readArtifact(artifactFile);
      artifact.output.reviewStatus = "confirmed";
      await writeArtifact(artifactFile, artifact);

      await program().parseAsync(["node", "api-code-gen", "generate", "--from", artifactFile, "--cwd", cwd], { from: "user" });
      expect(await readFile(join(cwd, "src/pages/user/api.generated.ts"), "utf8")).toContain("export async function getUser");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("generates split output only from an explicit reviewed file plan", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/pages/user/api", splitApiOutput: true, transformResponse: false });
    try {
      const artifact = await readArtifact(artifactFile);
      if (!artifact.output.splitApiOutput) throw new Error("expected split artifact");
      artifact.output.files = [
        { file: "users.ts", endpointIds: ["ep-get-user"] },
        { file: "teams.ts", endpointIds: ["ep-get-team"] }
      ];
      artifact.output.indexFile = "index.ts";
      artifact.output.reviewStatus = "confirmed";
      await writeArtifact(artifactFile, artifact);

      await program().parseAsync(["node", "api-code-gen", "generate", "--from", artifactFile, "--cwd", cwd], { from: "user" });
      expect(await readFile(join(cwd, "src/pages/user/api/users.ts"), "utf8")).toContain("getUser");
      expect(await readFile(join(cwd, "src/pages/user/api/teams.ts"), "utf8")).toContain("getTeam");
      expect(await readFile(join(cwd, "src/pages/user/api/index.ts"), "utf8")).toBe('export * from "./users.js";\nexport * from "./teams.js";\n');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("blocks split plans with missing or duplicate endpoint assignments", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/api", splitApiOutput: true, transformResponse: true });
    try {
      const artifact = await readArtifact(artifactFile);
      if (!artifact.output.splitApiOutput) throw new Error("expected split artifact");
      artifact.output.reviewStatus = "confirmed";
      artifact.output.files = [{ file: "users.ts", endpointIds: ["ep-get-user"] }];
      await writeArtifact(artifactFile, artifact);
      await expectGenerateToReject(cwd, artifactFile, "every endpoint must be assigned exactly once");

      artifact.output.files = [
        { file: "users.ts", endpointIds: ["ep-get-user", "ep-get-user"] },
        { file: "teams.ts", endpointIds: ["ep-get-team"] }
      ];
      await writeArtifact(artifactFile, artifact);
      await expectGenerateToReject(cwd, artifactFile, "endpoint must be assigned exactly once");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("blocks an unconfirmed output plan", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/api.ts", splitApiOutput: false, transformResponse: true });
    try {
      await expectGenerateToReject(cwd, artifactFile, "API code artifact is not ready");
      expect(await readArtifact(artifactFile)).toMatchObject({ output: { reviewStatus: "unreviewed" } });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("blocks unsupported request bodies and query parameters", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/api.ts", splitApiOutput: false, transformResponse: true }, UNSUPPORTED_OPENAPI);
    try {
      const artifact = await readArtifact(artifactFile);
      artifact.output.reviewStatus = "confirmed";
      await writeArtifact(artifactFile, artifact);
      await expectGenerateToReject(cwd, artifactFile, "API code artifact is not ready");
      expect(await readArtifact(artifactFile)).toMatchObject({ output: { reviewStatus: "confirmed" } });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("blocks project-outside and symlink-escaping output paths", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/api.ts", splitApiOutput: false, transformResponse: true });
    const outside = await mkdtemp(join(tmpdir(), "api-code-gen-outside-"));
    try {
      const artifact = await readArtifact(artifactFile);
      if (artifact.output.splitApiOutput) throw new Error("expected single-file artifact");
      artifact.output.reviewStatus = "confirmed";
      artifact.output.file = "../outside.ts";
      await writeArtifact(artifactFile, artifact);
      await expectGenerateToReject(cwd, artifactFile, "API code artifact is not ready");

      artifact.output.file = "linked/api.ts";
      await mkdir(join(cwd, "linked"), { recursive: true });
      await rm(join(cwd, "linked"), { recursive: true });
      await symlink(outside, join(cwd, "linked"));
      await writeArtifact(artifactFile, artifact);
      await expectGenerateToReject(cwd, artifactFile, "OUTPUT_PATH_OUTSIDE_PROJECT");
    } finally {
      await rm(cwd, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("refuses to overwrite manually changed generated output", async () => {
    const { cwd, artifactFile } = await prepareProject({ apiOutput: "src/api.ts", splitApiOutput: false, transformResponse: true });
    try {
      const artifact = await readArtifact(artifactFile);
      artifact.output.reviewStatus = "confirmed";
      await writeArtifact(artifactFile, artifact);
      await program().parseAsync(["node", "api-code-gen", "generate", "--from", artifactFile, "--cwd", cwd], { from: "user" });
      const output = join(cwd, "src/api.ts");
      await writeFile(output, "// changed by hand\n", "utf8");

      await expectGenerateToReject(cwd, artifactFile, "OUTPUT_EXISTS_DIFFERENT");
      expect(await readFile(output, "utf8")).toBe("// changed by hand\n");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
