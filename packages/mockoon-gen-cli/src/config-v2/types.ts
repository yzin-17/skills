export interface MockGenConfig { mockoonPort: number | null; whistleGroupName: string | null; mockPolicy: { listScenario: { enabled: boolean; itemCount: number } }; }
export const defaultMockConfig: MockGenConfig = { mockoonPort: null, whistleGroupName: null, mockPolicy: { listScenario: { enabled: true, itemCount: 20 } } };
