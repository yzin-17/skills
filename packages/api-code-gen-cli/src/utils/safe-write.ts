import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function writeGeneratedFiles(files: Map<string, string>, options: { force?: boolean } = {}): Promise<void> {
  const previous = new Map<string, string | null>();
  for (const [file, content] of files) {
    try {
      const existing = await readFile(file, "utf8");
      previous.set(file, existing);
      if (existing !== content && !options.force) throw new Error(`OUTPUT_EXISTS_DIFFERENT: ${file}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      previous.set(file, null);
    }
  }

  const pending: Array<{ file: string; temporary: string }> = [];
  try {
    for (const [file, content] of files) {
      await mkdir(dirname(file), { recursive: true });
      const temporary = join(dirname(file), `.${Date.now()}-${Math.random().toString(16).slice(2)}.api-code-gen.tmp`);
      await writeFile(temporary, content, "utf8");
      pending.push({ file, temporary });
    }
    for (const { file, temporary } of pending) await rename(temporary, file);
  } catch (error) {
    await Promise.all([...previous].map(async ([file, content]) => {
      if (content === null) await unlink(file).catch(() => undefined);
      else await writeFile(file, content, "utf8");
    }));
    throw error;
  } finally {
    await Promise.all(pending.map(({ temporary }) => rm(temporary, { force: true })));
  }
}
