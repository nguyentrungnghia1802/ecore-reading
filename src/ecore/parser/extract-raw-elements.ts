import type { Diagnostic } from '../model';
import type {
  RawEAnnotation,
  RawEClassifier,
  RawEClass,
  RawEGenericType,
  RawEOperation,
  RawEPackage,
  RawEParameter,
  RawEStructuralFeature,
  RawETypeParameter,
} from '../raw';
import {
  childElements,
  optionalAttribute,
  rawAttributes,
  semanticType,
  sourceMetadata,
  splitReferences,
} from './dom-helpers';

interface ExtractionContext {
  diagnostics: Diagnostic[];
}

const BOOLEAN_ATTRIBUTES = new Set([
  'abstract',
  'interface',
  'ordered',
  'unique',
  'changeable',
  'volatile',
  'transient',
  'derived',
  'unsettable',
  'containment',
  'resolveProxies',
  'iD',
  'serializable',
]);
const INTEGER_ATTRIBUTES = new Set(['lowerBound', 'upperBound', 'value']);

function diagnostic(context: ExtractionContext, code: string, path: string, message: string): void {
  context.diagnostics.push({
    id: `${code}:${path}:${context.diagnostics.length}`,
    code,
    severity: code.startsWith('ECORE_UNKNOWN') ? 'warning' : 'error',
    message,
    path,
  });
}

function validateLexicalAttributes(element: Element, path: string, context: ExtractionContext): void {
  for (const attribute of Array.from(element.attributes)) {
    if (BOOLEAN_ATTRIBUTES.has(attribute.localName) && !/^(?:true|false)$/i.test(attribute.value)) {
      diagnostic(
        context,
        'ECORE_INVALID_BOOLEAN',
        path,
        `Attribute ${attribute.name} has invalid boolean value "${attribute.value}"; it remains raw.`,
      );
    }
    if (INTEGER_ATTRIBUTES.has(attribute.localName) && !/^-?\d+$/.test(attribute.value)) {
      diagnostic(
        context,
        'ECORE_INVALID_INTEGER',
        path,
        `Attribute ${attribute.name} has invalid integer value "${attribute.value}"; it remains raw.`,
      );
    }
  }
}

function base(element: Element, path: string, sourceOrder: number, context: ExtractionContext) {
  validateLexicalAttributes(element, path, context);
  const attributes = rawAttributes(element);
  return {
    path,
    sourceOrder,
    rawAttributes: attributes,
    metadata: sourceMetadata(element, path),
  };
}

function namedBase(element: Element, path: string, sourceOrder: number, context: ExtractionContext) {
  return {
    ...base(element, path, sourceOrder, context),
    ...attributeProperty(element, 'name'),
    annotations: extractAnnotations(element, path, context),
  };
}

function attributeProperty<N extends string>(
  element: Element,
  name: N,
): { [K in N]?: string } {
  const value = optionalAttribute(element, name);
  return value === undefined ? {} : { [name]: value } as { [K in N]?: string };
}

function extractAnnotations(element: Element, ownerPath: string, context: ExtractionContext): RawEAnnotation[] {
  return childElements(element)
    .filter((child) => child.localName === 'eAnnotations' || child.localName === 'EAnnotation')
    .map((annotation, index) => {
      const path = `${ownerPath}/eAnnotations[${index}]`;
      const details = Object.fromEntries(
        childElements(annotation, 'details').flatMap((detail) => {
          const key = optionalAttribute(detail, 'key');
          return key === undefined ? [] : [[key, optionalAttribute(detail, 'value') ?? '']];
        }),
      );
      const contents = childElements(annotation)
        .filter((child) => !['details', 'eAnnotations'].includes(child.localName))
        .map(rawAttributes);
      return {
        ...base(annotation, path, index, context),
        ...attributeProperty(annotation, 'source'),
        details,
        references: splitReferences(optionalAttribute(annotation, 'references')),
        contents,
        annotations: extractAnnotations(annotation, path, context),
      };
    });
}

function extractGenericType(
  element: Element,
  path: string,
  sourceOrder: number,
  context: ExtractionContext,
): RawEGenericType {
  const upper = childElements(element).find((child) => child.localName === 'eUpperBound');
  const lower = childElements(element).find((child) => child.localName === 'eLowerBound');
  const rawType = optionalAttribute(element, 'eClassifier');
  const rawTypeParameter = optionalAttribute(element, 'eTypeParameter');
  return {
    ...base(element, path, sourceOrder, context),
    ...(rawType === undefined ? {} : { rawType }),
    ...(rawTypeParameter === undefined ? {} : { rawTypeParameter }),
    ...(upper === undefined ? {} : { upperBound: extractGenericType(upper, `${path}/eUpperBound[0]`, 0, context) }),
    ...(lower === undefined ? {} : { lowerBound: extractGenericType(lower, `${path}/eLowerBound[0]`, 0, context) }),
    typeArguments: childElements(element, 'eTypeArguments').map((argument, index) =>
      extractGenericType(argument, `${path}/eTypeArguments[${index}]`, index, context),
    ),
    annotations: extractAnnotations(element, path, context),
  };
}

function typedProperties(element: Element, path: string, context: ExtractionContext) {
  const generic = childElements(element).find((child) => child.localName === 'eGenericType');
  const rawType = optionalAttribute(element, 'eType');
  const rawLowerBound = optionalAttribute(element, 'lowerBound');
  const rawUpperBound = optionalAttribute(element, 'upperBound');
  return {
    ...(rawType === undefined ? {} : { rawType }),
    ...(rawLowerBound === undefined ? {} : { rawLowerBound }),
    ...(rawUpperBound === undefined ? {} : { rawUpperBound }),
    ...(generic === undefined ? {} : { genericType: extractGenericType(generic, `${path}/eGenericType[0]`, 0, context) }),
  };
}

function extractTypeParameters(element: Element, ownerPath: string, context: ExtractionContext): RawETypeParameter[] {
  return childElements(element, 'eTypeParameters').map((parameter, index) => {
    const path = `${ownerPath}/eTypeParameters[${index}]`;
    return {
      ...namedBase(parameter, path, index, context),
      bounds: childElements(parameter, 'eBounds').map((bound, boundIndex) =>
        extractGenericType(bound, `${path}/eBounds[${boundIndex}]`, boundIndex, context),
      ),
    };
  });
}

function extractParameter(
  element: Element,
  path: string,
  sourceOrder: number,
  context: ExtractionContext,
): RawEParameter {
  return {
    ...namedBase(element, path, sourceOrder, context),
    ...typedProperties(element, path, context),
  };
}

function extractOperation(
  element: Element,
  path: string,
  sourceOrder: number,
  context: ExtractionContext,
): RawEOperation {
  return {
    ...namedBase(element, path, sourceOrder, context),
    ...typedProperties(element, path, context),
    parameters: childElements(element, 'eParameters').map((parameter, index) =>
      extractParameter(parameter, `${path}/eParameters[${index}]`, index, context),
    ),
    typeParameters: extractTypeParameters(element, path, context),
    rawExceptions: splitReferences(optionalAttribute(element, 'eExceptions')),
  };
}

function extractFeature(
  element: Element,
  path: string,
  sourceOrder: number,
  context: ExtractionContext,
): RawEStructuralFeature {
  const type = semanticType(element);
  const common = {
    ...namedBase(element, path, sourceOrder, context),
    ...typedProperties(element, path, context),
  };
  if (type === 'EAttribute') return { ...common, kind: 'attribute' };
  if (type === 'EReference') {
    const rawOpposite = optionalAttribute(element, 'eOpposite');
    return { ...common, kind: 'reference', ...(rawOpposite === undefined ? {} : { rawOpposite }) };
  }
  diagnostic(
    context,
    'ECORE_UNKNOWN_FEATURE_KIND',
    path,
    `Structural feature kind "${type ?? '<missing>'}" is unsupported and was preserved as raw data.`,
  );
  return { ...common, kind: 'unknown', semanticType: type };
}

function extractClass(
  element: Element,
  path: string,
  sourceOrder: number,
  semanticClassifierType: string | null,
  context: ExtractionContext,
): RawEClass {
  return {
    ...namedBase(element, path, sourceOrder, context),
    kind: 'class',
    semanticType: semanticClassifierType,
    rawSuperTypes: splitReferences(optionalAttribute(element, 'eSuperTypes')),
    structuralFeatures: childElements(element, 'eStructuralFeatures').map((feature, index) =>
      extractFeature(feature, `${path}/eStructuralFeatures[${index}]`, index, context),
    ),
    operations: childElements(element, 'eOperations').map((operation, index) =>
      extractOperation(operation, `${path}/eOperations[${index}]`, index, context),
    ),
    typeParameters: extractTypeParameters(element, path, context),
  };
}

function extractClassifier(
  element: Element,
  path: string,
  sourceOrder: number,
  context: ExtractionContext,
): RawEClassifier {
  const type = semanticType(element);
  if (type === 'EClass') return extractClass(element, path, sourceOrder, type, context);
  const common = {
    ...namedBase(element, path, sourceOrder, context),
    semanticType: type,
    typeParameters: extractTypeParameters(element, path, context),
  };
  if (type === 'EEnum') {
    return {
      ...common,
      kind: 'enum',
      literals: childElements(element, 'eLiterals').map((literal, index) => ({
        ...namedBase(literal, `${path}/eLiterals[${index}]`, index, context),
      })),
    };
  }
  if (type === 'EDataType') return { ...common, kind: 'datatype' };
  diagnostic(
    context,
    'ECORE_UNKNOWN_CLASSIFIER_KIND',
    path,
    `Classifier kind "${type ?? '<missing>'}" is unsupported and was preserved as raw data.`,
  );
  return { ...common, kind: 'unknown' };
}

export function extractPackage(
  element: Element,
  path: string,
  sourceOrder: number,
  context: ExtractionContext,
): RawEPackage {
  return {
    ...namedBase(element, path, sourceOrder, context),
    ...attributeProperty(element, 'nsURI'),
    ...attributeProperty(element, 'nsPrefix'),
    classifiers: childElements(element, 'eClassifiers').map((classifier, index) =>
      extractClassifier(classifier, `${path}/eClassifiers[${index}]`, index, context),
    ),
    subpackages: childElements(element, 'eSubpackages').map((subpackage, index) =>
      extractPackage(subpackage, `${path}/eSubpackages[${index}]`, index, context),
    ),
  };
}
