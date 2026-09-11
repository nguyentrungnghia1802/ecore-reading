import {
  formatGenericType,
  formatMultiplicity,
  type EcoreClassifier,
  type EcoreFeature,
  type EcoreModel,
  type EcoreOperation,
  type ResolvedClassifierRef,
} from '../../ecore/model';
import type { DiagramDetailMode, DiagramRow } from '../model';

function typeName(reference: ResolvedClassifierRef | null, model: EcoreModel): string {
  if (reference === null) return 'void';
  if (reference.kind === 'builtin') return reference.displayName;
  if (reference.kind === 'local') {
    return model.classifierById.get(reference.classifierId)?.name ?? reference.classifierId;
  }
  return reference.fragment?.split('/').filter(Boolean).at(-1) ?? reference.rawUri;
}

function typedSignature(
  feature: EcoreFeature | EcoreOperation,
  model: EcoreModel,
): string {
  const type = feature.genericType === undefined
    ? typeName(feature.type, model)
    : formatGenericType(feature.genericType, model);
  return `${feature.name} : ${type} [${formatMultiplicity(feature.multiplicity)}]`;
}

function featureFlags(feature: EcoreFeature): string {
  const flags: string[] = [];
  if (feature.kind === 'reference' && feature.containment) flags.push('containment=true');
  if (feature.kind === 'reference' && feature.rawOpposite !== undefined) {
    flags.push(`eOpposite=${feature.rawOpposite}`);
  }
  if (feature.derived) flags.push('derived=true');
  if (!feature.changeable) flags.push('changeable=false');
  if (feature.transient) flags.push('transient=true');
  if (feature.volatile) flags.push('volatile=true');
  return flags.join(', ');
}

function featureRow(
  feature: EcoreFeature,
  model: EcoreModel,
  mode: DiagramDetailMode,
): DiagramRow {
  const prefix = feature.kind === 'attribute' ? 'A' : 'R';
  const primaryText = mode === 'ecore'
    ? `${prefix} ${typedSignature(feature, model)}`
    : typedSignature(feature, model);
  const flags = mode === 'overview' || mode === 'standard' ? '' : featureFlags(feature);
  return {
    id: `row:${feature.id}`,
    semanticId: feature.id,
    kind: feature.kind,
    primaryText,
    ...(flags.length === 0 ? {} : { secondaryText: flags }),
  };
}

function operationRow(
  operation: EcoreOperation,
  model: EcoreModel,
  mode: DiagramDetailMode,
): DiagramRow {
  const parameters = operation.parameters
    .map((parameter) => `${parameter.name} : ${typeName(parameter.type, model)} [${formatMultiplicity(parameter.multiplicity)}]`)
    .join(', ');
  const returnType = operation.genericType === undefined
    ? typeName(operation.type, model)
    : formatGenericType(operation.genericType, model);
  return {
    id: `row:${operation.id}`,
    semanticId: operation.id,
    kind: 'operation',
    primaryText: `${mode === 'ecore' ? 'O ' : ''}${operation.name}(${parameters}) : ${returnType} [${formatMultiplicity(operation.multiplicity)}]`,
  };
}

export function buildNodeRows(
  classifier: EcoreClassifier,
  model: EcoreModel,
  mode: DiagramDetailMode,
): DiagramRow[] {
  if (mode === 'overview') return [];
  if (classifier.kind === 'enum') {
    return classifier.literals.map((literal) => ({
      id: `row:${literal.id}`,
      semanticId: literal.id,
      kind: 'literal',
      primaryText:
        mode === 'detailed' || mode === 'ecore'
          ? `${literal.name} = ${literal.value} ("${literal.literal}")`
          : literal.name,
    }));
  }
  if (classifier.kind === 'datatype') {
    if (mode === 'standard') return [];
    const metadata = [
      classifier.instanceClassName === undefined ? null : `instanceClassName=${classifier.instanceClassName}`,
      classifier.instanceTypeName === undefined ? null : `instanceTypeName=${classifier.instanceTypeName}`,
      `serializable=${classifier.serializable}`,
    ].filter((item): item is string => item !== null);
    return metadata.map((text, index) => ({
      id: `row:${classifier.id}:metadata:${index}`,
      semanticId: classifier.id,
      kind: 'metadata',
      primaryText: text,
    }));
  }

  const attributeRows = classifier.attributeIds.flatMap((id) => {
    const feature = model.featureById.get(id);
    return feature?.kind === 'attribute' ? [featureRow(feature, model, mode)] : [];
  });
  const referenceRows =
    mode === 'ecore'
      ? classifier.referenceIds.flatMap((id) => {
          const feature = model.featureById.get(id);
          return feature?.kind === 'reference' ? [featureRow(feature, model, mode)] : [];
        })
      : [];
  const operationRows = classifier.operationIds.flatMap((id) => {
    const operation = model.operationById.get(id);
    return operation === undefined ? [] : [operationRow(operation, model, mode)];
  });
  return [...attributeRows, ...referenceRows, ...operationRows];
}
