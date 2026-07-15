import { dirname, join, normalize } from "node:path";
import type { ApiCodeArtifact, ApiEndpoint } from "../artifact/types.js";
import { generateApiCode, generateEndpoint, REQUEST_DECLARATION } from "./api-code.js";

export function generateOutputFiles(artifact: ApiCodeArtifact): Map<string, string> {
  if (!artifact.output.splitApiOutput) {
    if (!artifact.output.file) throw new Error("single-file output plan is incomplete");
    return new Map([[artifact.output.file, generateApiCode(artifact)]]);
  }

  const { directory, files, indexFile, transformResponse } = artifact.output;
  if (!directory) throw new Error("split output plan is incomplete");
  const endpoints = new Map(artifact.endpoints.map((endpoint) => [endpoint.id, endpoint]));
  const assigned = new Set<string>();
  const output = new Map<string, string>();

  for (const group of files) {
    const groupEndpoints: ApiEndpoint[] = [];
    for (const endpointId of group.endpointIds) {
      const endpoint = endpoints.get(endpointId);
      if (!endpoint) throw new Error(`unknown endpoint: ${endpointId}`);
      if (assigned.has(endpointId)) throw new Error(`endpoint must be assigned exactly once: ${endpointId}`);
      assigned.add(endpointId);
      groupEndpoints.push(endpoint);
    }
    output.set(join(directory, group.file), moduleContents(groupEndpoints, transformResponse));
  }

  if (assigned.size !== endpoints.size) throw new Error("every endpoint must be assigned exactly once");
  if (indexFile) output.set(join(directory, indexFile), indexContents(files.map((file) => file.file), indexFile));
  return output;
}

function moduleContents(endpoints: ApiEndpoint[], transformResponse: boolean): string {
  return [REQUEST_DECLARATION, "", ...endpoints.flatMap((endpoint) => generateEndpoint(endpoint, transformResponse))].join("\n") + "\n";
}

function indexContents(files: string[], indexFile: string): string {
  return files.map((file) => `export * from ${JSON.stringify(relativeModulePath(indexFile, file))};`).join("\n") + "\n";
}

function relativeModulePath(from: string, to: string): string {
  const normalizedFrom = normalize(from).replace(/\\/g, "/");
  const normalizedTo = normalize(to).replace(/\\/g, "/");
  const fromParts = dirname(normalizedFrom).split("/").filter((part) => part && part !== ".");
  const toParts = normalizedTo.split("/").filter(Boolean);
  while (fromParts[0] && fromParts[0] === toParts[0]) { fromParts.shift(); toParts.shift(); }
  const prefix = fromParts.map(() => "..");
  const target = toParts.join("/").replace(/\.ts$/, ".js");
  return `./${[...prefix, target].filter(Boolean).join("/")}`.replace("./../", "../");
}
