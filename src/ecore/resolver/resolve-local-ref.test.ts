import { describe, expect, it } from 'vitest';
import { parseRawEcore, ECORE_NAMESPACE_URI } from '../parser';
import { buildLocalEcoreIndex, resolveLocalRef } from './resolve-local-ref';

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';

function indexed(xml: string) {
  const raw = parseRawEcore(xml);
  expect(raw.diagnostics).toEqual([]);
  return buildLocalEcoreIndex(raw);
}

describe('local Ecore fragment resolution', () => {
  const index = indexed(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}" xmlns:xsi="${XSI}" name="people">
    <eClassifiers xsi:type="e:EClass" name="Agent">
      <eStructuralFeatures xsi:typeHolder="ignored" xsi:type="e:EReference" name="beliefs"/>
    </eClassifiers>
    <eClassifiers xsi:type="e:EClass" name="Member">
      <eStructuralFeatures xsi:type="e:EReference" name="familyFather"/>
    </eClassifiers>
  </e:EPackage>`);

  it.each([
    ['#//Agent', 'classifier', 'Agent'],
    ['#//Agent/beliefs', 'feature', 'beliefs'],
    ['#/0/Member', 'classifier', 'Member'],
    ['#/0/Member/familyFather', 'feature', 'familyFather'],
  ] as const)('resolves %s by original structural paths', (raw, kind, name) => {
    const result = resolveLocalRef(raw, index);

    expect(result.diagnostics).toEqual([]);
    expect(result.target).toMatchObject({ kind, name });
  });

  it('reports an unresolved local fragment without inventing a target', () => {
    const result = resolveLocalRef('#//Missing', index);

    expect(result.target).toBeNull();
    expect(result.diagnostics[0]).toMatchObject({
      code: 'ECORE_UNRESOLVED_LOCAL_REFERENCE',
      rawReference: '#//Missing',
    });
  });

  it('diagnoses duplicate-name ambiguity deterministically', () => {
    const duplicates = indexed(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}" xmlns:xsi="${XSI}" name="p">
      <eClassifiers xsi:type="e:EClass" name="Same"/>
      <eClassifiers xsi:type="e:EClass" name="Same"/>
    </e:EPackage>`);
    const result = resolveLocalRef('#//Same', duplicates);

    expect(result.target).toBeNull();
    expect(result.diagnostics[0]?.code).toBe('ECORE_AMBIGUOUS_LOCAL_REFERENCE');
  });

  it('keeps same-named classifiers in different packages distinct', () => {
    const nested = indexed(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}" xmlns:xsi="${XSI}" name="root">
      <eSubpackages name="left"><eClassifiers xsi:type="e:EClass" name="Same"/></eSubpackages>
      <eSubpackages name="right"><eClassifiers xsi:type="e:EClass" name="Same"/></eSubpackages>
    </e:EPackage>`);
    const left = resolveLocalRef('#//left/Same', nested);
    const right = resolveLocalRef('#//right/Same', nested);

    expect(left.target?.id).not.toBe(right.target?.id);
    expect(left.target?.id).toContain('left');
    expect(right.target?.id).toContain('right');
  });
});
