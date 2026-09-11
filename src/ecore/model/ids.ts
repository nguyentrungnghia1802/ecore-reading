export type SemanticId = string;

function segment(value: string): string {
  return encodeURIComponent(value);
}

function ordinal(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Semantic ID ordinal must be a non-negative safe integer: ${value}`);
  }

  return String(value);
}

function ownerPath(ownerId: string): string {
  return segment(ownerId);
}

export function packageId(packagePath: readonly string[]): SemanticId {
  return `pkg:${packagePath.map(segment).join('/')}`;
}

export function classifierId(
  ownerPackageId: SemanticId,
  name: string,
  declarationOrdinal: number,
): SemanticId {
  return `classifier:${ownerPackageId.slice('pkg:'.length)}/${segment(name)}/${ordinal(declarationOrdinal)}`;
}

export function featureId(
  ownerClassifierId: SemanticId,
  kind: 'attribute' | 'reference',
  name: string,
  declarationOrdinal: number,
): SemanticId {
  return `feature:${ownerPath(ownerClassifierId)}/${kind}/${segment(name)}/${ordinal(declarationOrdinal)}`;
}

export function operationId(
  ownerClassifierId: SemanticId,
  name: string,
  declarationOrdinal: number,
): SemanticId {
  return `operation:${ownerPath(ownerClassifierId)}/operation/${segment(name)}/${ordinal(declarationOrdinal)}`;
}

export function parameterId(
  ownerOperationId: SemanticId,
  name: string,
  declarationOrdinal: number,
): SemanticId {
  return `parameter:${ownerPath(ownerOperationId)}/parameter/${segment(name)}/${ordinal(declarationOrdinal)}`;
}

export function literalId(
  ownerEnumId: SemanticId,
  name: string,
  declarationOrdinal: number,
): SemanticId {
  return `literal:${ownerPath(ownerEnumId)}/literal/${segment(name)}/${ordinal(declarationOrdinal)}`;
}

export function typeParameterId(
  ownerId: SemanticId,
  name: string,
  declarationOrdinal: number,
): SemanticId {
  return `type-parameter:${ownerPath(ownerId)}/type-parameter/${segment(name)}/${ordinal(declarationOrdinal)}`;
}
