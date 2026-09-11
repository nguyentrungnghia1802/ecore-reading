import type { Diagnostic } from '../model';
import type { RawEcoreDocument } from '../raw';
import { extractPackage } from './extract-raw-elements';
import { checkXmlSafety, type XmlSafetyOptions } from './xml-safety';

export const ECORE_NAMESPACE_URI = 'http://www.eclipse.org/emf/2002/Ecore';
export const XMI_NAMESPACE_URI = 'http://www.omg.org/XMI';

export interface ParseRawEcoreOptions extends XmlSafetyOptions {
  sourceName?: string;
}

function failedDocument(sourceName: string, diagnostic: Diagnostic): RawEcoreDocument {
  return { sourceName, packages: [], diagnostics: [diagnostic] };
}

function xmlParseDiagnostic(message: string): Diagnostic {
  return {
    id: 'XML_PARSE_ERROR:/',
    code: 'XML_PARSE_ERROR',
    severity: 'error',
    message,
    path: '/',
  };
}

function isEPackage(element: Element): boolean {
  return element.namespaceURI === ECORE_NAMESPACE_URI && element.localName === 'EPackage';
}

export function parseRawEcore(
  source: string,
  options: ParseRawEcoreOptions = {},
): RawEcoreDocument {
  const sourceName = options.sourceName ?? 'model.ecore';
  const safetyDiagnostic = checkXmlSafety(source, options);
  if (safetyDiagnostic !== null) return failedDocument(sourceName, safetyDiagnostic);

  let document: Document;
  try {
    document = new DOMParser().parseFromString(source, 'application/xml');
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'Unknown XML parser failure';
    return failedDocument(sourceName, xmlParseDiagnostic(`Unable to parse XML: ${detail}`));
  }

  const parserError = document.getElementsByTagName('parsererror').item(0);
  if (parserError !== null || document.documentElement.localName === 'parsererror') {
    return failedDocument(
      sourceName,
      xmlParseDiagnostic(parserError?.textContent?.trim() || 'The XML document is malformed.'),
    );
  }

  const root = document.documentElement;
  const packageElements = isEPackage(root)
    ? [root]
    : root.namespaceURI === XMI_NAMESPACE_URI && root.localName === 'XMI'
      ? Array.from(root.children).filter(isEPackage)
      : [];

  if (packageElements.length === 0) {
    return failedDocument(sourceName, {
      id: 'ECORE_PACKAGE_NOT_FOUND:/',
      code: 'ECORE_PACKAGE_NOT_FOUND',
      severity: 'error',
      message: 'No EPackage root was found in the Ecore document.',
      path: '/',
    });
  }

  const diagnostics: Diagnostic[] = [];
  const packages = packageElements.map((element, index) =>
    extractPackage(element, `/EPackage[${index}]`, index, { diagnostics }),
  );
  return { sourceName, packages, diagnostics };
}
