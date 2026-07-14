import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export async function resolveProjectPath(cwd: string, file: string): Promise<string> {
  const root = await realpath(cwd);
  const resolved = isAbsolute(file) ? resolve(file) : resolve(root, file);
  assertContained(root, resolved);

  let ancestor = resolved;
  while (true) {
    try {
      const realAncestor = await realpath(ancestor);
      assertContained(root, realAncestor);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw new Error(`OUTPUT_PATH_OUTSIDE_PROJECT: ${file}`);
      ancestor = parent;
    }
  }

  return resolved;
}

function assertContained(root: string, target: string): void {
  const path = relative(root, target);
  if (path === "" || (!path.startsWith("..") && !isAbsolute(path))) return;
  throw new Error(`OUTPUT_PATH_OUTSIDE_PROJECT: ${target}`);
}
