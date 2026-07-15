import type { MockArtifact } from "../artifact/types.js";

export type WhistleFormat = "json" | "cjs";

export function deriveWhistleRules(artifact: MockArtifact): string[] {
  if (artifact.outputs.mockoon.port === null) throw new Error("MOCKOON_PORT_REQUIRED");
  const endpoints = new Map(artifact.endpoints.map((endpoint) => [endpoint.id, endpoint]));
  const rules = new Set<string>();
  for (const route of artifact.outputs.whistle.routes) {
    const endpoint = endpoints.get(route.endpointId);
    if (!endpoint) throw new Error(`WHISTLE_ENDPOINT_UNKNOWN: ${route.endpointId}`);
    if (!route.apiHost) throw new Error(`WHISTLE_HOST_REQUIRED: ${route.endpointId}`);
    const dynamic = /\{[^}]+\}/.test(endpoint.path);
    const sourcePath = endpoint.path.replace(/\{[^}]+\}/g, "*");
    let capture = 1;
    const forwardedPath = endpoint.path.replace(/\{[^}]+\}/g, () => `$${capture++}`);
    rules.add(`${dynamic ? "^" : ""}${route.apiHost}${sourcePath} http://127.0.0.1:${artifact.outputs.mockoon.port}${forwardedPath}`);
  }
  return [...rules];
}

export function serializeWhistle(format: WhistleFormat, groupName: string | null, rules: string[]): string {
  if (!groupName?.trim()) throw new Error("WHISTLE_GROUP_REQUIRED");
  const text = rules.length ? `${rules.join("\n")}\n` : "";
  if (format === "json") return `${JSON.stringify({ [groupName]: text, "": [groupName] }, null, 2)}\n`;
  return `exports.groupName = ${JSON.stringify(groupName)};\nexports.name = ${JSON.stringify(groupName)};\nexports.rules = \`${escapeTemplate(text)}\`;\n`;
}

function escapeTemplate(value: string): string { return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${"); }
