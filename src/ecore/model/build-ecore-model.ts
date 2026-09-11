import type {
  RawEAnnotation,
  RawEClassifier,
  RawEClass,
  RawEcoreDocument,
  RawEOperation,
  RawEPackage,
  RawEParameter,
  RawEStructuralFeature,
  RawETypeParameter,
} from '../raw';
import { buildLocalEcoreIndex, resolveClassifierRef, type LocalEcoreIndex } from '../resolver';
import { addInheritanceCycleDiagnostics } from '../validation/inheritance-cycles';
import { resolveAndValidateOpposites } from '../validation/opposites';
import type { Diagnostic } from './diagnostic';
import {
  classifierId,
  featureId,
  literalId,
  operationId,
  packageId,
  parameterId,
  typeParameterId,
} from './ids';
import { normalizeMultiplicity } from './multiplicity';
import type {
  EcoreAnnotation,
  EcoreAttribute,
  EcoreClass,
  EcoreClassifier,
  EcoreDataType,
  EcoreEnum,
  EcoreFeature,
  EcoreModel,
  EcoreOperation,
  EcorePackage,
  EcoreParameter,
  EcoreReference,
  EcoreTypeParameter,
  ResolvedClassifierRef,
} from './types';

function rawBoolean(
  attributes: Readonly<Record<string, string>>,
  name: string,
  fallback: boolean,
): boolean {
  const raw = attributes[name];
  return raw === undefined ? fallback : raw.toLowerCase() === 'true' ? true : raw.toLowerCase() === 'false' ? false : fallback;
}

function rawInteger(
  attributes: Readonly<Record<string, string>>,
  name: string,
  fallback: number,
): number {
  const raw = attributes[name];
  return raw !== undefined && /^-?\d+$/.test(raw) ? Number(raw) : fallback;
}

function semanticAnnotations(raw: RawEAnnotation[]): EcoreAnnotation[] {
  return raw.map((annotation) => ({
    ...(annotation.source === undefined ? {} : { source: annotation.source }),
    details: annotation.details,
    references: annotation.references,
    contents: annotation.contents,
    sourceMetadata: annotation.metadata,
  }));
}

function resolveType(
  raw: string | undefined,
  path: string,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): ResolvedClassifierRef | null {
  if (raw === undefined) return null;
  const result = resolveClassifierRef(raw, index);
  diagnostics.push(...result.diagnostics.map((item) => ({ ...item, path })));
  return result.reference;
}

function typeParameters(
  rawParameters: RawETypeParameter[],
  ownerId: string,
): EcoreTypeParameter[] {
  return rawParameters.map((parameter) => {
    const name = parameter.name ?? `@type-parameter.${parameter.sourceOrder}`;
    return {
      id: typeParameterId(ownerId, name, parameter.sourceOrder),
      ownerId,
      name,
      bounds: [],
      annotations: semanticAnnotations(parameter.annotations),
      source: parameter.metadata,
    };
  });
}

function typedValues(
  raw: RawEStructuralFeature | RawEOperation | RawEParameter,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
) {
  const normalized = normalizeMultiplicity(raw.rawLowerBound, raw.rawUpperBound, raw.path);
  diagnostics.push(...normalized.diagnostics);
  return {
    type: resolveType(raw.rawType, raw.path, index, diagnostics),
    multiplicity: normalized.multiplicity,
    ordered: rawBoolean(raw.rawAttributes, 'ordered', true),
    unique: rawBoolean(raw.rawAttributes, 'unique', true),
  };
}

function parameter(
  raw: RawEParameter,
  ownerOperationId: string,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): EcoreParameter {
  const name = raw.name ?? `@parameter.${raw.sourceOrder}`;
  return {
    id: parameterId(ownerOperationId, name, raw.sourceOrder),
    ownerOperationId,
    name,
    ...typedValues(raw, index, diagnostics),
    annotations: semanticAnnotations(raw.annotations),
    source: raw.metadata,
  };
}

function operation(
  raw: RawEOperation,
  ownerClassId: string,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): EcoreOperation {
  const name = raw.name ?? `@operation.${raw.sourceOrder}`;
  const id = operationId(ownerClassId, name, raw.sourceOrder);
  const parameters = raw.parameters.map((item) => parameter(item, id, index, diagnostics));
  const exceptionRefs = raw.rawExceptions.flatMap((exception) => {
    const resolved = resolveType(exception, raw.path, index, diagnostics);
    return resolved === null ? [] : [resolved];
  });
  return {
    id,
    ownerClassId,
    name,
    ...typedValues(raw, index, diagnostics),
    parameterIds: parameters.map((item) => item.id),
    parameters,
    exceptionRefs,
    typeParameters: typeParameters(raw.typeParameters, id),
    annotations: semanticAnnotations(raw.annotations),
    source: raw.metadata,
  };
}

function structuralFeature(
  raw: RawEStructuralFeature,
  ownerClassId: string,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): EcoreFeature | null {
  if (raw.kind === 'unknown') return null;
  const name = raw.name ?? `@${raw.kind}.${raw.sourceOrder}`;
  const common = {
    id: featureId(ownerClassId, raw.kind, name, raw.sourceOrder),
    ownerClassId,
    name,
    ...typedValues(raw, index, diagnostics),
    changeable: rawBoolean(raw.rawAttributes, 'changeable', true),
    volatile: rawBoolean(raw.rawAttributes, 'volatile', false),
    transient: rawBoolean(raw.rawAttributes, 'transient', false),
    derived: rawBoolean(raw.rawAttributes, 'derived', false),
    unsettable: rawBoolean(raw.rawAttributes, 'unsettable', false),
    ...(
      raw.rawAttributes.defaultValueLiteral === undefined
        ? {}
        : { defaultValueLiteral: raw.rawAttributes.defaultValueLiteral }
    ),
    annotations: semanticAnnotations(raw.annotations),
    source: raw.metadata,
  };
  if (raw.kind === 'attribute') {
    const attribute: EcoreAttribute = {
      ...common,
      kind: 'attribute',
      idAttribute: rawBoolean(raw.rawAttributes, 'iD', false),
    };
    return attribute;
  }
  const reference: EcoreReference = {
    ...common,
    kind: 'reference',
    target: common.type,
    containment: rawBoolean(raw.rawAttributes, 'containment', false),
    ...(raw.rawOpposite === undefined ? {} : { rawOpposite: raw.rawOpposite }),
    resolveProxies: rawBoolean(raw.rawAttributes, 'resolveProxies', true),
  };
  return reference;
}

interface BuildState {
  index: LocalEcoreIndex;
  packages: EcorePackage[];
  classifiers: EcoreClassifier[];
  features: EcoreFeature[];
  operations: EcoreOperation[];
  diagnostics: Diagnostic[];
}

function resolvedSuperTypes(
  raw: RawEClass,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): ResolvedClassifierRef[] {
  const seen = new Set<string>();
  const refs: ResolvedClassifierRef[] = [];
  for (const superType of raw.rawSuperTypes) {
    const resolved = resolveType(superType, raw.path, index, diagnostics);
    if (resolved === null) continue;
    const key = resolved.kind === 'local' ? `local:${resolved.classifierId}` : resolved.raw;
    if (seen.has(key)) {
      diagnostics.push({
        id: `ECORE_DUPLICATE_SUPERTYPE:${raw.path}:${key}`,
        code: 'ECORE_DUPLICATE_SUPERTYPE',
        severity: 'warning',
        message: `Duplicate supertype "${superType}" was retained in source metadata but deduplicated semantically.`,
        rawReference: superType,
        path: raw.path,
      });
      continue;
    }
    seen.add(key);
    refs.push(resolved);
  }
  return refs;
}

function semanticClassifier(
  raw: RawEClassifier,
  ownerPackageId: string,
  state: BuildState,
): EcoreClassifier | null {
  if (raw.kind === 'unknown') return null;
  const name = raw.name ?? `@classifier.${raw.sourceOrder}`;
  const id = classifierId(ownerPackageId, name, raw.sourceOrder);
  const common = {
    id,
    packageId: ownerPackageId,
    name,
    annotations: semanticAnnotations(raw.annotations),
    source: raw.metadata,
  };
  if (raw.kind === 'class') {
    const classFeatures = raw.structuralFeatures.flatMap((item) => {
      const feature = structuralFeature(item, id, state.index, state.diagnostics);
      return feature === null ? [] : [feature];
    });
    const operations = raw.operations.map((item) => operation(item, id, state.index, state.diagnostics));
    state.features.push(...classFeatures);
    state.operations.push(...operations);
    const result: EcoreClass = {
      ...common,
      kind: 'class',
      abstract: rawBoolean(raw.rawAttributes, 'abstract', false),
      interface: rawBoolean(raw.rawAttributes, 'interface', false),
      superTypeRefs: resolvedSuperTypes(raw, state.index, state.diagnostics),
      attributeIds: classFeatures.filter((item) => item.kind === 'attribute').map((item) => item.id),
      referenceIds: classFeatures.filter((item) => item.kind === 'reference').map((item) => item.id),
      operationIds: operations.map((item) => item.id),
      typeParameters: typeParameters(raw.typeParameters, id),
    };
    return result;
  }
  if (raw.kind === 'enum') {
    const result: EcoreEnum = {
      ...common,
      kind: 'enum',
      ...(raw.rawAttributes.instanceClassName === undefined ? {} : { instanceClassName: raw.rawAttributes.instanceClassName }),
      ...(raw.rawAttributes.instanceTypeName === undefined ? {} : { instanceTypeName: raw.rawAttributes.instanceTypeName }),
      serializable: rawBoolean(raw.rawAttributes, 'serializable', true),
      literals: raw.literals.map((literal) => {
        const literalName = literal.name ?? `@literal.${literal.sourceOrder}`;
        return {
          id: literalId(id, literalName, literal.sourceOrder),
          ownerEnumId: id,
          name: literalName,
          value: rawInteger(literal.rawAttributes, 'value', 0),
          literal: literal.rawAttributes.literal ?? literalName,
          annotations: semanticAnnotations(literal.annotations),
          source: literal.metadata,
        };
      }),
      typeParameters: typeParameters(raw.typeParameters, id),
    };
    return result;
  }
  const result: EcoreDataType = {
    ...common,
    kind: 'datatype',
    ...(raw.rawAttributes.instanceClassName === undefined ? {} : { instanceClassName: raw.rawAttributes.instanceClassName }),
    ...(raw.rawAttributes.instanceTypeName === undefined ? {} : { instanceTypeName: raw.rawAttributes.instanceTypeName }),
    serializable: rawBoolean(raw.rawAttributes, 'serializable', true),
    typeParameters: typeParameters(raw.typeParameters, id),
  };
  return result;
}

function semanticPackage(
  raw: RawEPackage,
  ancestors: readonly string[],
  parentPackageId: string | undefined,
  state: BuildState,
): void {
  const name = raw.name ?? `@package.${raw.sourceOrder}`;
  const path = [...ancestors, name];
  const id = packageId(path);
  const childIds = raw.subpackages.map((subpackage) =>
    packageId([...path, subpackage.name ?? `@package.${subpackage.sourceOrder}`]),
  );
  const directClassifiers = raw.classifiers.flatMap((item) => {
    const classifier = semanticClassifier(item, id, state);
    return classifier === null ? [] : [classifier];
  });
  const pkg: EcorePackage = {
    id,
    name,
    ...(raw.nsURI === undefined ? {} : { nsURI: raw.nsURI }),
    ...(raw.nsPrefix === undefined ? {} : { nsPrefix: raw.nsPrefix }),
    ...(parentPackageId === undefined ? {} : { parentPackageId }),
    classifierIds: directClassifiers.map((item) => item.id),
    subpackageIds: childIds,
    annotations: semanticAnnotations(raw.annotations),
    source: raw.metadata,
  };
  state.packages.push(pkg);
  state.classifiers.push(...directClassifiers);
  raw.subpackages.forEach((subpackage) => semanticPackage(subpackage, path, id, state));
}

export function buildEcoreModel(document: RawEcoreDocument): EcoreModel {
  const state: BuildState = {
    index: buildLocalEcoreIndex(document),
    packages: [],
    classifiers: [],
    features: [],
    operations: [],
    diagnostics: [...document.diagnostics],
  };
  document.packages.forEach((pkg) => semanticPackage(pkg, [], undefined, state));
  state.features = resolveAndValidateOpposites(state.features, state.index, state.diagnostics);
  addInheritanceCycleDiagnostics(state.classifiers, state.diagnostics);

  const parameters = state.operations.flatMap((item) => item.parameters);
  return {
    sourceName: document.sourceName,
    packages: state.packages,
    classifiers: state.classifiers,
    features: state.features,
    operations: state.operations,
    packageById: new Map(state.packages.map((item) => [item.id, item])),
    classifierById: new Map(state.classifiers.map((item) => [item.id, item])),
    featureById: new Map(state.features.map((item) => [item.id, item])),
    operationById: new Map(state.operations.map((item) => [item.id, item])),
    parameterById: new Map(parameters.map((item) => [item.id, item])),
    diagnostics: state.diagnostics,
  };
}
