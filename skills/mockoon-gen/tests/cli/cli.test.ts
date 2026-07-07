import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli.js";

describe("createProgram", () => {
  it("registers the mockoon-gen CLI name", () => {
    const program = createProgram();
    expect(program.name()).toBe("mockoon-gen");
  });
});
