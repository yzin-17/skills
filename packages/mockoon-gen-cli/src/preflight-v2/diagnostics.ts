export type MockDiagnosticSeverity = "fatal" | "needsReview" | "warning";
export interface MockDiagnostic { severity: MockDiagnosticSeverity; code: string; path: string; message: string; }
export interface MockPreflightResult { diagnostics: MockDiagnostic[]; ready: boolean; }
