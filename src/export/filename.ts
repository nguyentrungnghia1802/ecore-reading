export function sanitizeExportFilename(sourceName: string, extension: 'svg' | 'png'): string {
  // Strip any leading path segments
  const filename = sourceName.split(/[/\\]/).pop() ?? sourceName;
  // Strip original extension
  const base = filename.replace(/\.[^/.]+$/, '').trim();
  // Replace characters not allowed or unsafe in filenames
  const sanitized = base.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-');
  const cleanName = sanitized.length > 0 ? sanitized : 'metamodel';
  return `${cleanName}-ecore-diagram.${extension}`;
}
