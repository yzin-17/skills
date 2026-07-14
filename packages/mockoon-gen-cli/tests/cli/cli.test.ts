import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("mockoon-gen CLI contract", () => {
  it("exposes only the split mock workflow commands", () => {
    const names = createProgram().commands.map((command) => command.name());

    expect(names).toEqual(["init", "from-openapi", "validate", "export"]);
    expect(names).not.toContain("generate");
    expect(names).not.toContain("sync-api-code");
    expect(names).not.toContain("guard");
    expect(names).not.toContain("whistle-cli");
  });
});
