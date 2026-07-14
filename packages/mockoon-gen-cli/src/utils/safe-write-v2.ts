import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
export async function writeMockOutput(file: string, content: string, options: { force?: boolean } = {}): Promise<void> {
  try { const existing = await readFile(file, "utf8"); if (existing === content) return; if (!options.force) throw new Error(`OUTPUT_EXISTS_DIFFERENT: ${file}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await mkdir(dirname(file), { recursive: true });
  const temporary = join(dirname(file), `.${Date.now()}-${Math.random().toString(16).slice(2)}.mockoon-gen.tmp`);
  try { await writeFile(temporary, content, "utf8"); await rename(temporary, file); } finally { await rm(temporary, { force: true }); }
}
