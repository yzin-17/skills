export interface MockoonGenConfig {
  artifactDir: string;
  openapiFile: string;
  mockoonFile: string;
  whistleFile: string;
  apiOutput: string;
  splitApiOutput: boolean;
  transformResponse: boolean;
  mockoonPort: number | null;
  confirmPlacement: boolean;
}

export const defaultConfig: MockoonGenConfig = {
  artifactDir: ".mockoon-gen",
  openapiFile: ".mockoon-gen/openapi.yaml",
  mockoonFile: ".mockoon-gen/mockoon.json",
  whistleFile: ".mockoon-gen/whistle.txt",
  apiOutput: "src/api/generated/api.generated.ts",
  splitApiOutput: false,
  transformResponse: true,
  mockoonPort: null,
  confirmPlacement: true
};
