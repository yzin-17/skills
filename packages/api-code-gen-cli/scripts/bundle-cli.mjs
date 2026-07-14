import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(packageDir, "../../skills/api-code-gen/bin/api-code-gen.mjs");

await mkdir(dirname(output), { recursive: true });
await build({
  bundle: true,
  entryPoints: [resolve(packageDir, "dist/src/cli.js")],
  format: "esm",
  outfile: output,
  platform: "node",
  target: "node22",
  banner: { js: "#!/usr/bin/env node" }
});
