import { isEcoreBuiltinResource, resolveEcoreBuiltin } from '../builtins';
import type { Diagnostic, ResolvedClassifierRef } from '../model';
import { parseEcoreUriRef } from './parse-ecore-uri-ref';
import { resolveLocalRef, type LocalEcoreIndex } from './resolve-local-ref';

export interface ClassifierResolutionResult {
  reference: ResolvedClassifierRef | null;
  diagnostics: Diagnostic[];
}

export function resolveClassifierRef(
  raw: string,
  index: LocalEcoreIndex,
): ClassifierResolutionResult {
  const parsed = parseEcoreUriRef(raw);
  if (parsed.resourcePart === null) {
    const local = resolveLocalRef(parsed, index);
    if (local.target?.kind === 'classifier') {
      return {
        reference: { kind: 'local', classifierId: local.target.id, raw },
        diagnostics: [],
      };
    }
    if (local.target !== null) {
      return {
        reference: null,
        diagnostics: [
          {
            id: `ECORE_REFERENCE_KIND_MISMATCH:${raw}`,
            code: 'ECORE_REFERENCE_KIND_MISMATCH',
            severity: 'error',
            message: `Reference "${raw}" resolves to a ${local.target.kind}, not a classifier.`,
            rawReference: raw,
            path: local.target.path,
          },
        ],
      };
    }
    return { reference: null, diagnostics: local.diagnostics };
  }

  const builtin = resolveEcoreBuiltin(parsed.resourcePart, parsed.tokens.at(-1), raw);
  if (builtin !== null) return { reference: builtin, diagnostics: [] };

  if (isEcoreBuiltinResource(parsed.resourcePart)) {
    return {
      reference: null,
      diagnostics: [
        {
          id: `ECORE_UNKNOWN_BUILTIN:${raw}`,
          code: 'ECORE_UNKNOWN_BUILTIN',
          severity: 'error',
          message: `Ecore builtin "${parsed.tokens.at(-1) ?? '<missing>'}" is not declared by the registry.`,
          rawReference: raw,
        },
      ],
    };
  }

  const reference: ResolvedClassifierRef = {
    kind: 'external',
    rawUri: parsed.resourcePart,
    fragment: parsed.fragment,
    raw,
    resolution: 'unresolved',
  };
  return {
    reference,
    diagnostics: [
      {
        id: `ECORE_UNRESOLVED_EXTERNAL_REFERENCE:${raw}`,
        code: 'ECORE_UNRESOLVED_EXTERNAL_REFERENCE',
        severity: 'warning',
        message: `External classifier reference "${raw}" remains unresolved; no network request was made.`,
        rawReference: raw,
      },
    ],
  };
}
