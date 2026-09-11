import type { Diagnostic } from '../model';

export const DEFAULT_MAX_ECORE_BYTES = 10 * 1024 * 1024;

export interface XmlSafetyOptions {
  maxBytes?: number;
}

export function checkXmlSafety(source: string, options: XmlSafetyOptions = {}): Diagnostic | null {
  if (source.trim().length === 0) {
    return {
      id: 'ECORE_EMPTY_DOCUMENT:/',
      code: 'ECORE_EMPTY_DOCUMENT',
      severity: 'error',
      message: 'The Ecore document is empty.',
      path: '/',
    };
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ECORE_BYTES;
  const actualBytes = new TextEncoder().encode(source).byteLength;
  if (actualBytes > maxBytes) {
    return {
      id: `ECORE_FILE_TOO_LARGE:/:${actualBytes}`,
      code: 'ECORE_FILE_TOO_LARGE',
      severity: 'error',
      message: `The Ecore document is ${actualBytes} bytes, exceeding the configured ${maxBytes}-byte limit.`,
      path: '/',
    };
  }

  if (/<!DOCTYPE\b/i.test(source)) {
    return {
      id: 'XML_DOCTYPE_FORBIDDEN:/',
      code: 'XML_DOCTYPE_FORBIDDEN',
      severity: 'error',
      message: 'DOCTYPE declarations are not supported because Ecore input is treated as untrusted XML.',
      path: '/',
    };
  }

  return null;
}
