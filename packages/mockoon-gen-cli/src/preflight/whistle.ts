import type { MockArtifact } from "../artifact/types.js";
import type { MockDiagnostic } from "./diagnostics.js";
export function whistleDiagnostics(artifact: MockArtifact): MockDiagnostic[] {
  const diagnostics: MockDiagnostic[] = [];
  if (artifact.outputs.mockoon.port === null) diagnostics.push(fatal("MOCKOON_PORT_REQUIRED", "outputs.mockoon.port", "Mockoon port is required."));
  if (!artifact.outputs.whistle.groupName) diagnostics.push(fatal("WHISTLE_GROUP_REQUIRED", "outputs.whistle.groupName", "Whistle group name is required."));
  const ids = new Set(artifact.endpoints.map((endpoint) => endpoint.id));
  for (const route of artifact.outputs.whistle.routes) {
    if (!route.apiHost) diagnostics.push(fatal("WHISTLE_HOST_REQUIRED", `outputs.whistle.routes.${route.endpointId}.apiHost`, "Whistle API host is required."));
    else if (!isHost(route.apiHost)) diagnostics.push(fatal("WHISTLE_HOST_INVALID", `outputs.whistle.routes.${route.endpointId}.apiHost`, "Whistle API host must contain only host and optional port."));
    if (!ids.has(route.endpointId)) diagnostics.push(fatal("WHISTLE_ENDPOINT_UNKNOWN", `outputs.whistle.routes.${route.endpointId}`, "Whistle route references an unknown endpoint."));
  }
  return diagnostics;
}
function isHost(value: string): boolean { return !value.includes("://") && !value.includes("/") && !value.includes("^") && !value.includes("$"); }
function fatal(code: string, path: string, message: string): MockDiagnostic { return { severity: "fatal", code, path, message }; }
