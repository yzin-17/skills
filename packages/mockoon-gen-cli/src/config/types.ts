export interface MockoonGenConfig {
  artifactDir: string;
  openapiFile: string;
  mockoonFile: string;
  whistleFile: string;
  apiOutput: string;
  generateApiCode: boolean;
  splitApiOutput: boolean;
  transformResponse: boolean;
  mockoonPort: number | null;
  whistleGroupName: string | null;
  confirmPlacement: boolean;
}

export const defaultConfig: MockoonGenConfig = {
  artifactDir: "mockoon-gen",
  openapiFile: "mockoon-gen/openapi.yaml",
  mockoonFile: "mockoon-gen/mockoon.json",
  whistleFile: "mockoon-gen/whistle.json",
  apiOutput: "src/api/generated/api.generated.ts",
  generateApiCode: true,
  splitApiOutput: false,
  transformResponse: true,
  mockoonPort: null,
  whistleGroupName: null,
  confirmPlacement: true
};
