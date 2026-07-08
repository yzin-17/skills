import { chmod, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(packageDir, "../../skills/mockoon-gen/bin/mockoon-gen.mjs");

await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve(packageDir, "src/cli.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  banner: {
    js: 'import { createRequire as __mockoonGenCreateRequire } from "node:module";\nconst require = __mockoonGenCreateRequire(import.meta.url);'
  },
  sourcemap: false
});

await chmod(outfile, 0o755);
