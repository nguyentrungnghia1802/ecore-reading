import { describe, expect, it } from 'vitest';
import { ECORE_BUILTIN_NAMES, ECORE_BUILTIN_URI } from '../builtins/ecore-builtins';
import { ECORE_NAMESPACE_URI, parseRawEcore } from '../parser';
import { buildLocalEcoreIndex } from './resolve-local-ref';
import { resolveClassifierRef } from './resolve-classifier-ref';

const index = buildLocalEcoreIndex(
  parseRawEcore(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="p">
    <eClassifiers xsi:type="e:EClass" name="Local"/>
  </e:EPackage>`),
);

describe('resolveClassifierRef', () => {
  it('resolves local classifiers to stable semantic IDs', () => {
    const result = resolveClassifierRef('#//Local', index);

    expect(result.reference).toMatchObject({ kind: 'local', raw: '#//Local' });
    expect(result.diagnostics).toEqual([]);
  });

  it.each(['EString', 'EInt', 'EBooleanObject', 'EDate', 'EBigDecimal', 'EJavaObject', 'EMap'])(
    'resolves Ecore builtin %s centrally',
    (name) => {
      const raw = `${ECORE_BUILTIN_URI}#//${name}`;
      expect(resolveClassifierRef(raw, index)).toEqual({
        reference: { kind: 'builtin', builtinId: `ecore:${name}`, displayName: name, raw },
        diagnostics: [],
      });
    },
  );

  it('exposes the complete declared Ecore datatype registry', () => {
    expect(ECORE_BUILTIN_NAMES).toEqual([
      'EBigDecimal', 'EBigInteger', 'EBoolean', 'EBooleanObject', 'EByte', 'EByteArray',
      'EByteObject', 'EChar', 'ECharacterObject', 'EDate', 'EDiagnosticChain', 'EDouble',
      'EDoubleObject', 'EEList', 'EEnumerator', 'EFeatureMap', 'EFeatureMapEntry', 'EFloat',
      'EFloatObject', 'EInt', 'EIntegerObject', 'EInvocationTargetException', 'EJavaClass',
      'EJavaObject', 'EJavaSerializable', 'ELong', 'ELongObject', 'EMap', 'EResource',
      'EResourceSet', 'EShort', 'EShortObject', 'EString', 'ETreeIterator',
    ]);
  });

  it('keeps arbitrary external references explicit and never fetches them', () => {
    const raw = 'https://example.invalid/remote.ecore#//Remote';
    const result = resolveClassifierRef(raw, index);

    expect(result.reference).toEqual({
      kind: 'external',
      rawUri: 'https://example.invalid/remote.ecore',
      fragment: '//Remote',
      raw,
      resolution: 'unresolved',
    });
    expect(result.diagnostics[0]).toMatchObject({
      code: 'ECORE_UNRESOLVED_EXTERNAL_REFERENCE',
      severity: 'warning',
      rawReference: raw,
    });
  });

  it('returns no invented classifier for an unresolved local reference', () => {
    const result = resolveClassifierRef('#//Missing', index);

    expect(result.reference).toBeNull();
    expect(result.diagnostics[0]?.code).toBe('ECORE_UNRESOLVED_LOCAL_REFERENCE');
  });
});
