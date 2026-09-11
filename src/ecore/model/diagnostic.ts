export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  semanticId?: string;
  rawReference?: string;
  path?: string;
}
