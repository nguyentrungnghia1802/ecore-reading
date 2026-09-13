import { describe, expect, it } from 'vitest';
import { parseRawEcore } from '../parser';
import { buildEcoreModel } from './build-ecore-model';

const prefix = '<e:EPackage xmlns:e="http://www.eclipse.org/emf/2002/Ecore" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="p">';
const parse = (body: string) => buildEcoreModel(parseRawEcore(`${prefix}${body}</e:EPackage>`));

describe('diagnostic semantic linkage', () => {
  it('links unresolved reference and datatype diagnostics to their distinct features', () => {
    const model = parse(`<eClassifiers xsi:type="e:EClass" name="Auction">
      <eStructuralFeatures xsi:type="e:EReference" name="bidder" eType="#//BidderX"/>
      <eStructuralFeatures xsi:type="e:EAttribute" name="price" eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EMoney"/>
    </eClassifiers>`);
    expect(model.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ECORE_UNRESOLVED_LOCAL_REFERENCE', semanticId: model.features[0]?.id, rawReference: '#//BidderX' }),
      expect.objectContaining({ code: 'ECORE_UNKNOWN_BUILTIN', semanticId: model.features[1]?.id }),
    ]));
    expect(new Set(model.diagnostics.map((diagnostic) => diagnostic.id)).size).toBe(model.diagnostics.length);
  });

  it('links invalid bounds to the feature and preserves both raw values', () => {
    const model = parse(`<eClassifiers xsi:type="e:EClass" name="Auction">
      <eStructuralFeatures xsi:type="e:EReference" name="bids" eType="#//Auction" lowerBound="2" upperBound="1"/>
    </eClassifiers>`);
    expect(model.diagnostics.find((item) => item.code === 'ECORE_INVALID_BOUNDS')).toMatchObject({
      semanticId: model.features[0]?.id,
      details: { lowerBound: '2', upperBound: '1' },
    });
  });

  it('reports one duplicate classifier group with every stable ID', () => {
    const model = parse(`<eClassifiers xsi:type="e:EClass" name="Agent"/>
      <eClassifiers xsi:type="e:EClass" name="Agent"/>`);
    expect(model.diagnostics.filter((item) => item.code === 'ECORE_DUPLICATE_CLASSIFIER')).toEqual([
      expect.objectContaining({
        severity: 'error',
        semanticId: model.classifiers[0]?.id,
        relatedElementIds: [model.classifiers[1]?.id],
      }),
    ]);
  });

  it('links a one-sided opposite to both known references without merging them', () => {
    const model = parse(`<eClassifiers xsi:type="e:EClass" name="A">
      <eStructuralFeatures xsi:type="e:EReference" name="bs" eType="#//B" eOpposite="#//B/a"/>
    </eClassifiers><eClassifiers xsi:type="e:EClass" name="B">
      <eStructuralFeatures xsi:type="e:EReference" name="a" eType="#//A"/>
    </eClassifiers>`);
    expect(model.diagnostics.find((item) => item.code === 'ECORE_INVALID_OPPOSITE')).toMatchObject({
      semanticId: model.features[0]?.id,
      relatedElementIds: [model.features[1]?.id],
    });
    expect(model.features.every((feature) => feature.kind !== 'reference' || feature.oppositeReferenceId === undefined)).toBe(true);
  });
});
