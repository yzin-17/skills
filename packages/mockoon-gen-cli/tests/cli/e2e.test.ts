import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

const projects: string[] = [];
const PAGE_DIR = "pages/user-detail";
const OPENAPI = `openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /api/users/{id}:
    get:
      operationId: getUser
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
`;

afterEach(async () => {
  await Promise.all(projects.splice(0).map((project) => rm(project, { recursive: true, force: true })));
});

describe("mockoon-gen CLI e2e", () => {
  it("initializes and creates an unreviewed artifact without selecting a Whistle format", async () => {
    const project = await createProject();

    await run(project, "init", "--page-dir", PAGE_DIR);
    await run(project, "from-openapi", openapiPath(), "--origin", "imported", "--page-dir", PAGE_DIR);

    const artifact = await readArtifact(project);
    expect(artifact.schemaVersion).toBe("0.3.0");
    expect(artifact.openapi.reviewStatus).toBe("unreviewed");
    expect(artifact.outputs.whistle).not.toHaveProperty("file");
    await expect(run(project, "export", "whistle", "--format", "json", "--from", artifactPath())).rejects.toThrow("OPENAPI_UNREVIEWED");
  });

  it("blocks unreviewed artifacts and exports Mockoon after review", async () => {
    const project = await createProject();
    await createArtifact(project, { reviewed: false, port: 3100 });

    await expect(run(project, "export", "mockoon", "--from", artifactPath())).rejects.toThrow("OPENAPI_UNREVIEWED");
    await confirmArtifact(project);
    await run(project, "export", "mockoon", "--from", artifactPath());

    const environment = JSON.parse(await readFile(join(project, PAGE_DIR, "mockoon-gen/mockoon.json"), "utf8")) as { port: number; routes: unknown[] };
    expect(environment.port).toBe(3100);
    expect(environment.routes).toHaveLength(1);
  });

  it("selects Whistle JSON or CJS only when exporting", async () => {
    const project = await createProject();
    await createArtifact(project, { reviewed: true, port: 3100, groupName: "User Detail", host: "api.example.test" });
    const directory = join(project, PAGE_DIR, "mockoon-gen");

    await expect(stat(join(directory, "whistle.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(join(directory, "whistle.cjs"))).rejects.toMatchObject({ code: "ENOENT" });
    await run(project, "export", "whistle", "--format", "json", "--from", artifactPath());
    expect(JSON.parse(await readFile(join(directory, "whistle.json"), "utf8"))).toMatchObject({ "User Detail": expect.stringContaining("api.example.test") });
    await run(project, "export", "whistle", "--format", "cjs", "--from", artifactPath());
    expect(await readFile(join(directory, "whistle.cjs"), "utf8")).toContain('exports.groupName = "User Detail"');
  });

  it("refreshes templates from artifact semantic mappings without changing manual scenarios", async () => {
    const project = await createProject();
    await createArtifact(project, { reviewed: true, port: 3100 });
    const artifact = await readArtifact(project);
    artifact.endpoints[0].mock.semanticMappings = [{ path: "id", faker: "string.uuid" }];
    artifact.endpoints[0].mock.scenarios.push({ name: "success-custom", statusCode: 200, headers: {}, bodyTemplate: '{"manual":true}', origin: "manual", enabled: true });
    await writeArtifact(project, artifact);

    await run(project, "render-templates", "--from", artifactPath());
    await run(project, "export", "mockoon", "--from", artifactPath());

    const refreshed = await readArtifact(project);
    expect(refreshed.endpoints[0].mock.scenarios.find((scenario: { name: string }) => scenario.name === "success-default").bodyTemplate).toContain("string.uuid");
    expect(refreshed.endpoints[0].mock.scenarios.find((scenario: { name: string }) => scenario.name === "success-custom").bodyTemplate).toBe('{"manual":true}');
    expect(await readFile(join(project, PAGE_DIR, "mockoon-gen/mockoon.json"), "utf8")).toContain("string.uuid");
  });

  it("is a no-op for the same OpenAPI hash and refuses a changed hash", async () => {
    const project = await createProject();
    await createArtifact(project, { reviewed: true, port: 3100 });
    const path = join(project, artifactPath());
    const artifact = await readArtifact(project);
    artifact.reviewItems.push({ id: "keep-me", severity: "warning", scope: "global", path: "openapi", message: "Preserved on no-op", resolutionStatus: "open" });
    await writeFile(path, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    const before = await readFile(path, "utf8");

    await run(project, "from-openapi", openapiPath(), "--origin", "imported", "--reviewed", "--page-dir", PAGE_DIR);
    expect(await readFile(path, "utf8")).toBe(before);
    await writeFile(join(project, openapiPath()), OPENAPI.replace("User API", "Changed User API"), "utf8");
    await expect(run(project, "from-openapi", openapiPath(), "--origin", "imported", "--reviewed", "--page-dir", PAGE_DIR)).rejects.toThrow("ARTIFACT_EXISTS_DIFFERENT");
    expect(await readFile(path, "utf8")).toBe(before);
  });

  it("refuses an old 0.2.0 artifact and leaves it unchanged", async () => {
    const project = await createProject();
    await run(project, "init", "--page-dir", PAGE_DIR);
    const path = join(project, artifactPath());
    const oldArtifact = JSON.stringify({ schemaVersion: "0.2.0", legacy: true }, null, 2) + "\n";
    await writeFile(path, oldArtifact, "utf8");

    await expect(run(project, "from-openapi", openapiPath(), "--origin", "imported", "--reviewed", "--page-dir", PAGE_DIR)).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(oldArtifact);
  });

  it("refuses manual output changes, and --force replaces only a ready output", async () => {
    const project = await createProject();
    await createArtifact(project, { reviewed: true, port: 3100 });
    await run(project, "export", "mockoon", "--from", artifactPath());
    const output = join(project, PAGE_DIR, "mockoon-gen/mockoon.json");
    await writeFile(output, "manual output\n", "utf8");

    await expect(run(project, "export", "mockoon", "--from", artifactPath())).rejects.toThrow("OUTPUT_EXISTS_DIFFERENT");
    expect(await readFile(output, "utf8")).toBe("manual output\n");
    await setReviewStatus(project, "unreviewed");
    await expect(run(project, "export", "mockoon", "--force", "--from", artifactPath())).rejects.toThrow("OPENAPI_UNREVIEWED");
    expect(await readFile(output, "utf8")).toBe("manual output\n");
    await setReviewStatus(project, "confirmed");
    await run(project, "export", "mockoon", "--force", "--from", artifactPath());
    expect(await readFile(output, "utf8")).not.toBe("manual output\n");
  });
});

async function createProject(): Promise<string> {
  const project = await realpath(await mkdtemp(join(tmpdir(), "mockoon-gen-e2e-")));
  projects.push(project);
  await mkdir(join(project, PAGE_DIR, "mockoon-gen"), { recursive: true });
  await writeFile(join(project, openapiPath()), OPENAPI, "utf8");
  return project;
}

async function createArtifact(project: string, options: { reviewed: boolean; port: number; groupName?: string; host?: string }): Promise<void> {
  await run(project, "init", "--page-dir", PAGE_DIR);
  await run(project, "from-openapi", openapiPath(), "--origin", "imported", ...(options.reviewed ? ["--reviewed"] : []), "--page-dir", PAGE_DIR);
  const artifact = await readArtifact(project);
  artifact.outputs.mockoon.port = options.port;
  artifact.outputs.whistle.groupName = options.groupName ?? null;
  artifact.outputs.whistle.routes = artifact.outputs.whistle.routes.map((route: { endpointId: string; apiHost: string | null }) => ({ ...route, apiHost: options.host ?? null }));
  await writeArtifact(project, artifact);
}

async function confirmArtifact(project: string): Promise<void> { await setReviewStatus(project, "confirmed"); }
async function setReviewStatus(project: string, status: "unreviewed" | "confirmed"): Promise<void> { const artifact = await readArtifact(project); artifact.openapi.reviewStatus = status; await writeArtifact(project, artifact); }
async function readArtifact(project: string): Promise<any> { return JSON.parse(await readFile(join(project, artifactPath()), "utf8")); }
async function writeArtifact(project: string, artifact: unknown): Promise<void> { await writeFile(join(project, artifactPath()), JSON.stringify(artifact, null, 2) + "\n", "utf8"); }
async function run(project: string, ...args: string[]): Promise<void> { await createProgram().parseAsync(["node", "mockoon-gen", ...args, "--cwd", project], { from: "user" }); }
function openapiPath(): string { return `${PAGE_DIR}/mockoon-gen/openapi.yaml`; }
function artifactPath(): string { return `${PAGE_DIR}/mockoon-gen/mock-artifact.json`; }
