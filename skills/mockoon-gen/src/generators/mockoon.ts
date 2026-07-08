import type { ApiArtifact } from "../artifact/types.js";

interface MockoonResponse {
  uuid: string;
  body: string;
  latency: number;
  statusCode: number;
  label: string;
  headers: Array<{ key: string; value: string }>;
}

interface MockoonRoute {
  uuid: string;
  method: string;
  endpoint: string;
  responses: MockoonResponse[];
  enabled: boolean;
}

interface MockoonEnvironment {
  uuid: string;
  lastMigration: number;
  name: string;
  endpointPrefix: string;
  latency: number;
  port: number;
  routes: MockoonRoute[];
}

export function generateMockoonEnvironment(artifact: ApiArtifact): MockoonEnvironment {
  const port = artifact.outputs.mockoon.port;
  if (port === null) {
    throw new Error("Mockoon port is pending confirmation.");
  }

  return {
    uuid: "mockoon-gen-env",
    lastMigration: 32,
    name: "mockoon-gen",
    endpointPrefix: "",
    latency: 0,
    port,
    routes: artifact.endpoints.map((endpoint) => ({
      uuid: endpoint.id,
      method: endpoint.method.toLowerCase(),
      endpoint: endpoint.path.replace(/^\//, "").replace(/\{([^}]+)\}/g, ":$1"),
      enabled: true,
      responses: endpoint.mock.scenarios
        .filter((scenario) => scenario.enabled)
        .map((scenario) => ({
          uuid: `${endpoint.id}-${scenario.name}`,
          body: scenario.bodyTemplate,
          latency: 0,
          statusCode: scenario.statusCode,
          label: scenario.name,
          headers: Object.entries({
            ...artifact.outputs.mockoon.defaultHeaders,
            ...scenario.headers
          }).map(([key, value]) => ({
            key,
            value
          }))
        }))
    }))
  };
}
