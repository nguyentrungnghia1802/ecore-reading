import type { Diagnostic, GenericTypeRef } from '../model';
import type { RawEGenericType } from '../raw';
import { resolveClassifierRef } from './resolve-classifier-ref';
import { resolveLocalRef, type LocalEcoreIndex } from './resolve-local-ref';

export function resolveGenericType(
  raw: RawEGenericType,
  index: LocalEcoreIndex,
  diagnostics: Diagnostic[],
): GenericTypeRef {
  const classifierResult =
    raw.rawType === undefined ? null : resolveClassifierRef(raw.rawType, index);
  if (classifierResult !== null) {
    diagnostics.push(...classifierResult.diagnostics.map((item) => ({ ...item, path: raw.path })));
  }

  let resolvedTypeParameterId: string | undefined;
  if (raw.rawTypeParameter !== undefined) {
    const typeParameterResult = resolveLocalRef(raw.rawTypeParameter, index);
    if (typeParameterResult.target?.kind === 'type-parameter') {
      resolvedTypeParameterId = typeParameterResult.target.id;
    } else {
      diagnostics.push({
        id: `ECORE_UNRESOLVED_TYPE_PARAMETER:${raw.path}:${raw.rawTypeParameter}`,
        code: 'ECORE_UNRESOLVED_TYPE_PARAMETER',
        severity: 'error',
        message: `Generic type parameter reference "${raw.rawTypeParameter}" cannot be resolved.`,
        rawReference: raw.rawTypeParameter,
        path: raw.path,
      });
    }
  }

  return {
    ...(classifierResult?.reference === null || classifierResult === null
      ? {}
      : { classifier: classifierResult.reference }),
    ...(resolvedTypeParameterId === undefined
      ? {}
      : { typeParameterId: resolvedTypeParameterId }),
    ...(raw.upperBound === undefined
      ? {}
      : { upperBound: resolveGenericType(raw.upperBound, index, diagnostics) }),
    ...(raw.lowerBound === undefined
      ? {}
      : { lowerBound: resolveGenericType(raw.lowerBound, index, diagnostics) }),
    typeArguments: raw.typeArguments.map((argument) =>
      resolveGenericType(argument, index, diagnostics),
    ),
    ...(raw.rawType === undefined && raw.rawTypeParameter === undefined
      ? {}
      : { raw: raw.rawType ?? raw.rawTypeParameter }),
  };
}
