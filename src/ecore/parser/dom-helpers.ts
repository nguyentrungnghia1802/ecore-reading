import type { SourceMetadata } from '../model';

export const XSI_NAMESPACE_URI = 'http://www.w3.org/2001/XMLSchema-instance';

export function childElements(element: Element, localName?: string): Element[] {
  const children = Array.from(element.children);
  return localName === undefined ? children : children.filter((child) => child.localName === localName);
}

export function rawAttributes(element: Element): Readonly<Record<string, string>> {
  return Object.fromEntries(Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]));
}

export function optionalAttribute(element: Element, name: string): string | undefined {
  const value = element.getAttribute(name);
  return value === null ? undefined : value;
}

export function semanticType(element: Element): string | null {
  const value =
    element.getAttributeNS(XSI_NAMESPACE_URI, 'type') ??
    Array.from(element.attributes).find((attribute) => attribute.localName === 'type')?.value ??
    (['EClass', 'EEnum', 'EDataType', 'EAttribute', 'EReference'].includes(element.localName)
      ? element.localName
      : null);
  return value?.split(':').at(-1) ?? null;
}

export function sourceMetadata(element: Element, path: string): SourceMetadata {
  const xmiId =
    element.getAttributeNS('http://www.omg.org/XMI', 'id') ??
    Array.from(element.attributes).find(
      (attribute) => attribute.localName === 'id' && attribute.namespaceURI === 'http://www.omg.org/XMI',
    )?.value;

  return {
    elementName: element.tagName,
    ...(xmiId === null || xmiId === undefined ? {} : { xmiId }),
    path,
    rawAttributes: rawAttributes(element),
  };
}

export function splitReferences(value: string | undefined): string[] {
  return value?.trim().split(/\s+/).filter(Boolean) ?? [];
}
