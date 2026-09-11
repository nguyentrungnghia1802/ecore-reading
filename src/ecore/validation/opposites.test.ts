import { describe, expect, it } from 'vitest';
import { ECORE_NAMESPACE_URI, parseRawEcore } from '../parser';
import { buildEcoreModel } from '../model';
import { collectValidatedOppositePairs } from './opposites';

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';

function model(body: string) {
  return buildEcoreModel(parseRawEcore(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}"
    xmlns:xsi="${XSI}" name="relations">${body}</e:EPackage>`));
}

describe('eOpposite validation', () => {
  it('recognizes a symmetric endpoint-compatible pair and preserves both references', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="A">
        <eStructuralFeatures xsi:type="e:EReference" name="bs" upperBound="-1"
          eType="#//B" eOpposite="#//B/a"/>
      </eClassifiers>
      <eClassifiers xsi:type="e:EClass" name="B">
        <eStructuralFeatures xsi:type="e:EReference" name="a"
          eType="#//A" eOpposite="#//A/bs"/>
      </eClassifiers>`);
    const references = result.features.filter((feature) => feature.kind === 'reference');

    expect(references).toHaveLength(2);
    expect(references[0]?.oppositeReferenceId).toBe(references[1]?.id);
    expect(references[1]?.oppositeReferenceId).toBe(references[0]?.id);
    expect(collectValidatedOppositePairs(result)).toEqual([
      { referenceIds: [references[0]?.id, references[1]?.id] },
    ]);
  });

  it('rejects a one-sided declaration and leaves both references unpaired', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="A">
        <eStructuralFeatures xsi:type="e:EReference" name="bs" eType="#//B" eOpposite="#//B/a"/>
      </eClassifiers>
      <eClassifiers xsi:type="e:EClass" name="B">
        <eStructuralFeatures xsi:type="e:EReference" name="a" eType="#//A"/>
      </eClassifiers>`);

    expect(result.features.every((feature) => feature.kind !== 'reference' || feature.oppositeReferenceId === undefined)).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'ECORE_INVALID_OPPOSITE')).toBe(true);
    expect(collectValidatedOppositePairs(result)).toEqual([]);
  });

  it('rejects an inconsistent reverse declaration', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="A">
        <eStructuralFeatures xsi:type="e:EReference" name="bs" eType="#//B" eOpposite="#//B/a"/>
        <eStructuralFeatures xsi:type="e:EReference" name="other" eType="#//B"/>
      </eClassifiers>
      <eClassifiers xsi:type="e:EClass" name="B">
        <eStructuralFeatures xsi:type="e:EReference" name="a" eType="#//A" eOpposite="#//A/other"/>
      </eClassifiers>`);

    expect(collectValidatedOppositePairs(result)).toEqual([]);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 'ECORE_INVALID_OPPOSITE').length).toBeGreaterThan(0);
  });

  it('rejects an opposite path that resolves to a non-EReference', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="A">
        <eStructuralFeatures xsi:type="e:EReference" name="b" eType="#//B" eOpposite="#//B/code"/>
      </eClassifiers>
      <eClassifiers xsi:type="e:EClass" name="B">
        <eStructuralFeatures xsi:type="e:EAttribute" name="code"
          eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
      </eClassifiers>`);

    expect(result.features[0]).not.toHaveProperty('oppositeReferenceId');
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'ECORE_INVALID_OPPOSITE')).toBe(true);
  });

  it('describes containment and inverse-container navigation as one validated pair', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="Folder">
        <eStructuralFeatures xsi:type="e:EReference" name="documents" upperBound="-1"
          containment="true" eType="#//Document" eOpposite="#//Document/folder"/>
      </eClassifiers>
      <eClassifiers xsi:type="e:EClass" name="Document">
        <eStructuralFeatures xsi:type="e:EReference" name="folder"
          eType="#//Folder" eOpposite="#//Folder/documents"/>
      </eClassifiers>`);
    const references = result.features.filter((feature) => feature.kind === 'reference');

    expect(collectValidatedOppositePairs(result)).toEqual([
      {
        referenceIds: [references[0]?.id, references[1]?.id],
        containmentReferenceId: references[0]?.id,
        inverseContainerReferenceId: references[1]?.id,
      },
    ]);
  });

  it('keeps unrelated parallel references distinct', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="A">
        <eStructuralFeatures xsi:type="e:EReference" name="primary" eType="#//B"/>
        <eStructuralFeatures xsi:type="e:EReference" name="secondary" eType="#//B"/>
      </eClassifiers>
      <eClassifiers xsi:type="e:EClass" name="B"/>
    `);

    expect(result.features.map((feature) => feature.id)).toHaveLength(2);
    expect(new Set(result.features.map((feature) => feature.id)).size).toBe(2);
    expect(collectValidatedOppositePairs(result)).toEqual([]);
  });

  it('preserves self-containment ownership at the declaring class', () => {
    const result = model(`
      <eClassifiers xsi:type="e:EClass" name="Tree">
        <eStructuralFeatures xsi:type="e:EReference" name="children" upperBound="-1"
          containment="true" eType="#//Tree"/>
      </eClassifiers>`);
    const reference = result.features[0];

    expect(reference).toMatchObject({
      kind: 'reference',
      containment: true,
      ownerClassId: result.classifiers[0]?.id,
      target: { kind: 'local', classifierId: result.classifiers[0]?.id },
    });
  });
});
