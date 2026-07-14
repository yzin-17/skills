export type DiagnosticSeverity = "fatal" | "needsReview" | "warning";
export interface Diagnostic { severity: DiagnosticSeverity; code: string; path: string; message: string; suggestion?: string; }
export interface PreflightResult { diagnostics: Diagnostic[]; ready: boolean; }
