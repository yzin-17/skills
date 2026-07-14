import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export function assertMockoonGenPath(file: string): void {
  const parts = file.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.at(-2) !== "mockoon-gen") throw new Error(`Mock output must be written directly under visible mockoon-gen: ${file}`);
}

export async function resolveMockProjectPath(cwd: string, file: string): Promise<string> {
  const root = await realpath(cwd); const target = isAbsolute(file) ? resolve(file) : resolve(root, file); assertContained(root, target);
  let ancestor = target;
  while (true) {
    try { assertContained(root, await realpath(ancestor)); break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; const parent = dirname(ancestor); if (parent === ancestor) throw new Error(`OUTPUT_PATH_OUTSIDE_PROJECT: ${file}`); ancestor = parent; }
  }
  return target;
}
function assertContained(root: string, target: string): void { const path = relative(root, target); if (path === "" || (!path.startsWith("..") && !isAbsolute(path))) return; throw new Error(`OUTPUT_PATH_OUTSIDE_PROJECT: ${target}`); }
