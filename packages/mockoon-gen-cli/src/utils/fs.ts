import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeTextFile(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
