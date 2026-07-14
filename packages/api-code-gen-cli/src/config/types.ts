export interface ApiCodeGenConfig {
  apiOutput: string | null;
  splitApiOutput: boolean;
  transformResponse: boolean;
}

export const defaultConfig: ApiCodeGenConfig = { apiOutput: null, splitApiOutput: false, transformResponse: true };
