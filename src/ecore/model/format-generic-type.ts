import type { EcoreModel, GenericTypeRef, ResolvedClassifierRef } from './types';

function classifierName(reference: ResolvedClassifierRef, model: EcoreModel): string {
  if (reference.kind === 'builtin') return reference.displayName;
  if (reference.kind === 'local') {
    return model.classifierById.get(reference.classifierId)?.name ?? reference.classifierId;
  }
  return reference.fragment?.split('/').filter(Boolean).at(-1) ?? reference.rawUri;
}

export function formatGenericType(
  generic: GenericTypeRef | undefined,
  model: EcoreModel,
): string {
  if (generic === undefined) return '';
  const parameterName =
    generic.typeParameterId === undefined
      ? undefined
      : model.typeParameterById.get(generic.typeParameterId)?.name ?? generic.typeParameterId;
  const base = generic.classifier === undefined
    ? parameterName ?? '?'
    : classifierName(generic.classifier, model);
  const argumentsText =
    generic.typeArguments.length === 0
      ? ''
      : `<${generic.typeArguments.map((argument) => formatGenericType(argument, model)).join(', ')}>`;
  const upper =
    generic.upperBound === undefined
      ? ''
      : ` extends ${formatGenericType(generic.upperBound, model)}`;
  const lower =
    generic.lowerBound === undefined
      ? ''
      : ` super ${formatGenericType(generic.lowerBound, model)}`;
  return `${base}${argumentsText}${upper}${lower}`;
}
