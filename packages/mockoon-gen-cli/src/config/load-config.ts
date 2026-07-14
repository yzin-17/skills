import { readFile } from "node:fs/promises";
import { defaultConfig, type MockoonGenConfig } from "./types.js";

export async function loadConfig(file: string): Promise<MockoonGenConfig> {
  try {
    const raw = await readFile(file, "utf8");
    const config = { ...defaultConfig, ...(JSON.parse(raw) as Partial<MockoonGenConfig>) };
    assertVisibleArtifactDirectory(config.artifactDir);
    assertVisibleMockArtifactFile(config.openapiFile, "openapiFile");
    assertVisibleMockArtifactFile(config.mockoonFile, "mockoonFile");
    if (config.whistleFile) {
      assertVisibleMockArtifactFile(config.whistleFile, "whistleFile");
    }
    assertApiOutputOutsideMockoonGen(config.apiOutput);
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...defaultConfig };
    }

    throw error;
  }
}

export function assertApiOutputOutsideMockoonGen(file: string): void {
  const directories = file.replace(/\\/g, "/").replace(/\/+$/, "").split("/").slice(0, -1);

  if (directories.includes("mockoon-gen")) {
    throw new Error(`apiOutput must not be written inside a "mockoon-gen" directory; received: ${file}`);
  }
}

function assertVisibleMockArtifactFile(file: string, fieldName: string): void {
  const normalized = file.replace(/\\/g, "/").replace(/\/+$/, "");
  const parentDirectory = normalized.split("/").at(-2);

  if (parentDirectory !== "mockoon-gen") {
    throw new Error(`${fieldName} must be written directly under a visible \"mockoon-gen\" directory; received: ${file}`);
  }
}

function assertVisibleArtifactDirectory(artifactDir: string): void {
  const normalized = artifactDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const directoryName = normalized.split("/").at(-1);

  if (directoryName !== "mockoon-gen") {
    throw new Error(
      `artifactDir must end with \"mockoon-gen\" (without a leading dot); received: ${artifactDir}`
    );
  }
}
