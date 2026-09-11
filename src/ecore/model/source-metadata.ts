export interface SourceMetadata {
  elementName: string;
  xmiId?: string;
  path: string;
  rawAttributes: Readonly<Record<string, string>>;
}
