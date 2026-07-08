import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

const OPENAPI_FIXTURE = `openapi: 3.0.3
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

describe("mockoon-gen e2e", () => {
  it("creates an artifact and exports generated files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mockoon-gen-e2e-"));
    const program = createProgram();

    await mkdir(join(cwd, ".mockoon-gen"), { recursive: true });
    await writeFile(join(cwd, ".mockoon-gen/openapi.yaml"), OPENAPI_FIXTURE, "utf8");

    await program.parseAsync(["node", "mockoon-gen", "init", "--cwd", cwd], { from: "user" });

    const initialConfig = JSON.parse(await readFile(join(cwd, "mockoon-gen.config.json"), "utf8")) as {
      artifactDir: string;
      mockoonPort: number | null;
    };
    expect(initialConfig.artifactDir).toBe(".mockoon-gen");

    await writeFile(
      join(cwd, "mockoon-gen.config.json"),
      JSON.stringify(
        {
          ...initialConfig,
          apiOutput: "src/api/generated/api.generated.ts",
          mockoonPort: 3100,
          whistleGroupName: "User Detail Mock"
        },
        null,
        2
      ),
      "utf8"
    );

    await program.parseAsync(["node", "mockoon-gen", "from-openapi", ".mockoon-gen/openapi.yaml", "--cwd", cwd], {
      from: "user"
    });

    const artifactPath = join(cwd, ".mockoon-gen/api-artifact.json");
    const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
      schemaVersion: string;
      outputs: {
        apiCode: { suggestedFile: string };
        whistle: { groupName: string | null; routes: Array<{ apiHost: string }> };
        mockoon: { port: number | null };
      };
    };
    expect(artifact.schemaVersion).toBe("0.2.0");
    expect(artifact.outputs.apiCode.suggestedFile).toBe("src/api/generated/api.generated.ts");
    expect(artifact.outputs.whistle.groupName).toBe("User Detail Mock");
    expect(artifact.outputs.mockoon.port).toBe(3100);

    artifact.outputs.whistle.routes = artifact.outputs.whistle.routes.map((route) => ({
      ...route,
      apiHost: "api.example.test"
    }));
    await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");

    await program.parseAsync(["node", "mockoon-gen", "generate", "--from", ".mockoon-gen/api-artifact.json", "--cwd", cwd], {
      from: "user"
    });
    await program.parseAsync(
      ["node", "mockoon-gen", "export", "whistle", "--from", ".mockoon-gen/api-artifact.json", "--cwd", cwd],
      { from: "user" }
    );
    await program.parseAsync(
      ["node", "mockoon-gen", "export", "mockoon", "--from", ".mockoon-gen/api-artifact.json", "--cwd", cwd],
      { from: "user" }
    );

    const generatedApi = await readFile(join(cwd, "src/api/generated/api.generated.ts"), "utf8");
    const whistleRules = JSON.parse(await readFile(join(cwd, ".mockoon-gen/whistle.json"), "utf8")) as Record<string, unknown>;
    const mockoonEnvironment = JSON.parse(await readFile(join(cwd, ".mockoon-gen/mockoon.json"), "utf8")) as {
      port: number;
      routes: Array<{ endpoint: string; responses: Array<{ statusCode: number }> }>;
    };

    expect(generatedApi).toContain("export async function getUser");
    expect(whistleRules).toEqual({
      "User Detail Mock": "api.example.test/api/users/* http://127.0.0.1:3100/api/users/:id\n",
      "": ["User Detail Mock"]
    });
    expect(whistleRules).not.toHaveProperty("Default");
    expect(mockoonEnvironment.port).toBe(3100);
    expect(mockoonEnvironment.routes).toHaveLength(1);
    expect(mockoonEnvironment.routes[0]?.endpoint).toBe("api/users/:id");
    expect(mockoonEnvironment.routes[0]?.responses).toHaveLength(2);
    expect(mockoonEnvironment.routes[0]?.responses[0]?.statusCode).toBe(200);
  });
});
