export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  semanticId?: string;
  sourceElementId?: string;
  relatedElementIds?: string[];
  rawReference?: string;
  path?: string;
  details?: Readonly<Record<string, unknown>>;
}
