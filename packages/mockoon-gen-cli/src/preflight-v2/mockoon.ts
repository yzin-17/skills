import type { MockArtifact } from "../mock-artifact/types.js";
import type { MockDiagnostic } from "./diagnostics.js";
export function mockoonDiagnostics(artifact: MockArtifact): MockDiagnostic[] {
  const diagnostics: MockDiagnostic[] = [];
  if (artifact.outputs.mockoon.port === null) diagnostics.push(fatal("MOCKOON_PORT_REQUIRED", "outputs.mockoon.port", "Mockoon port is required."));
  for (const endpoint of artifact.endpoints) {
    const names = new Set(endpoint.mock.scenarios.filter((scenario) => scenario.enabled).map((scenario) => scenario.name));
    for (const name of ["success-default", "success-empty", "error-default"]) if (!names.has(name)) diagnostics.push(fatal("MOCK_SCENARIO_REQUIRED", `endpoints.${endpoint.id}.mock.scenarios`, `Required mock scenario is missing: ${name}.`));
    if (artifact.policies.listScenario.enabled && endpoint.operationId.toLowerCase().startsWith("list") && !names.has(`success-list-${artifact.policies.listScenario.itemCount}`)) diagnostics.push(fatal("LIST_SCENARIO_REQUIRED", `endpoints.${endpoint.id}.mock.scenarios`, "List mock scenario is required."));
  }
  return diagnostics;
}
function fatal(code: string, path: string, message: string): MockDiagnostic { return { severity: "fatal", code, path, message }; }
