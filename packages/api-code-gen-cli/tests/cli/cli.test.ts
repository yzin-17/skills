import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("createProgram", () => {
  it("registers only the API code generation commands", () => {
    const commands = createProgram().commands.map((command) => command.name());

    expect(commands).toEqual(["init", "from-openapi", "validate", "generate"]);
    expect(commands).not.toContain("sync-api-code");
    expect(commands).not.toContain("export");
  });
});
