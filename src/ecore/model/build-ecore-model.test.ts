import { describe, expect, it } from 'vitest';
import { ECORE_NAMESPACE_URI, parseRawEcore } from '../parser';
import { buildEcoreModel } from './build-ecore-model';
import { lookupClassifier, lookupFeature, lookupPackage } from './lookup';

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';

function build(body: string) {
  return buildEcoreModel(
    parseRawEcore(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}" xmlns:xsi="${XSI}"
      name="model" nsURI="urn:model" nsPrefix="m">${body}</e:EPackage>`, {
      sourceName: 'inline.ecore',
    }),
  );
}

describe('buildEcoreModel', () => {
  it('applies exact Ecore defaults without losing raw absence', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="DefaultClass">
        <eStructuralFeatures xsi:type="e:EAttribute" name="name"
          eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
        <eStructuralFeatures xsi:type="e:EReference" name="peer" eType="#//DefaultClass"/>
      </eClassifiers>`);
    const classifier = model.classifiers[0];
    const attribute = model.features[0];
    const reference = model.features[1];

    expect(classifier).toMatchObject({ kind: 'class', abstract: false, interface: false });
    expect(attribute).toMatchObject({
      kind: 'attribute',
      multiplicity: { lower: 0, upper: 1 },
      ordered: true,
      unique: true,
      changeable: true,
      volatile: false,
      transient: false,
      derived: false,
      unsettable: false,
      idAttribute: false,
    });
    expect(reference).toMatchObject({
      kind: 'reference',
      containment: false,
      resolveProxies: true,
      multiplicity: { lower: 0, upper: 1 },
    });
    expect(attribute?.source.rawAttributes.lowerBound).toBeUndefined();
  });

  it('normalizes explicit booleans and unbounded multiplicity', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Flags" abstract="true" interface="true">
        <eStructuralFeatures xsi:type="e:EReference" name="children" eType="#//Flags"
          lowerBound="1" upperBound="-1" ordered="false" unique="false" changeable="false"
          volatile="true" transient="true" derived="true" unsettable="true"
          containment="true" resolveProxies="false"/>
      </eClassifiers>`);

    expect(model.classifiers[0]).toMatchObject({ abstract: true, interface: true });
    expect(model.features[0]).toMatchObject({
      multiplicity: { lower: 1, upper: 'unbounded' },
      ordered: false,
      unique: false,
      changeable: false,
      volatile: true,
      transient: true,
      derived: true,
      unsettable: true,
      containment: true,
      resolveProxies: false,
    });
    expect(model.features[0]?.source.rawAttributes.upperBound).toBe('-1');
  });

  it('assigns unique structural IDs and bidirectional ownership in source order', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Entity">
        <eStructuralFeatures xsi:type="e:EAttribute" name="value"
          eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
        <eStructuralFeatures xsi:type="e:EAttribute" name="value"
          eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EInt"/>
        <eOperations name="convert">
          <eParameters name="input" eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
        </eOperations>
      </eClassifiers>`);
    const pkg = model.packages[0];
    const classifier = model.classifiers[0];

    expect(pkg?.classifierIds).toEqual([classifier?.id]);
    expect(classifier).toMatchObject({
      kind: 'class',
      packageId: pkg?.id,
      attributeIds: [model.features[0]?.id, model.features[1]?.id],
      operationIds: [model.operations[0]?.id],
    });
    expect(model.features[0]?.id).not.toBe(model.features[1]?.id);
    expect(model.operations[0]?.parameters[0]?.ownerOperationId).toBe(model.operations[0]?.id);
    expect(model.classifierById.get(classifier?.id ?? '')).toBe(classifier);
    expect(model.featureById.get(model.features[0]?.id ?? '')).toBe(model.features[0]);
  });

  it('resolves all local and external supertypes while preserving declaration order', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Named"/>
      <eClassifiers xsi:type="e:EClass" name="Audited"/>
      <eClassifiers xsi:type="e:EClass" name="Record"
        eSuperTypes="#//Named #//Audited external.ecore#//RemoteBase"/>
    `);
    const record = model.classifiers[2];

    expect(record?.kind).toBe('class');
    if (record?.kind !== 'class') throw new Error('Expected Record class');
    expect(record.superTypeRefs.map((reference) => reference.kind)).toEqual(['local', 'local', 'external']);
    expect(record.superTypeRefs.slice(0, 2).map((reference) => reference.kind === 'local' ? reference.classifierId : '')).toEqual([
      model.classifiers[0]?.id,
      model.classifiers[1]?.id,
    ]);
    expect(model.diagnostics.some((diagnostic) => diagnostic.code === 'ECORE_UNRESOLVED_EXTERNAL_REFERENCE')).toBe(true);
  });

  it('resolves attribute and reference targets to builtin and local classifiers', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Target"/>
      <eClassifiers xsi:type="e:EClass" name="Owner">
        <eStructuralFeatures xsi:type="e:EAttribute" name="label"
          eType="e:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString"/>
        <eStructuralFeatures xsi:type="e:EReference" name="target" eType="#//Target"/>
      </eClassifiers>`);

    expect(model.features[0]?.type).toMatchObject({ kind: 'builtin', displayName: 'EString' });
    expect(model.features[1]).toMatchObject({
      kind: 'reference',
      target: { kind: 'local', classifierId: model.classifiers[0]?.id },
    });
  });

  it('diagnoses invalid bounds but constructs a safe finite model', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Bad">
        <eStructuralFeatures xsi:type="e:EReference" name="bad" eType="#//Bad"
          lowerBound="4" upperBound="2"/>
      </eClassifiers>`);

    expect(model.diagnostics.some((diagnostic) => diagnostic.code === 'ECORE_INVALID_BOUNDS')).toBe(true);
    expect(model.features[0]?.multiplicity).toEqual({ lower: 4, upper: 2 });
  });

  it('reports inheritance cycles with involved semantic IDs and does not crash', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="A" eSuperTypes="#//B"/>
      <eClassifiers xsi:type="e:EClass" name="B" eSuperTypes="#//C"/>
      <eClassifiers xsi:type="e:EClass" name="C" eSuperTypes="#//A"/>
    `);
    const diagnostic = model.diagnostics.find((item) => item.code === 'ECORE_INHERITANCE_CYCLE');

    expect(diagnostic).toBeDefined();
    expect(diagnostic?.message).toContain(model.classifiers[0]?.id);
    expect(model.classifiers).toHaveLength(3);
  });

  it('exposes explicit non-throwing lookup results', () => {
    const model = build('<eClassifiers xsi:type="e:EClass" name="Only"/>');
    const classifier = model.classifiers[0];

    expect(lookupPackage(model, model.packages[0]?.id ?? '')).toMatchObject({ kind: 'found' });
    expect(lookupClassifier(model, classifier?.id ?? '')).toEqual({ kind: 'found', value: classifier });
    expect(lookupFeature(model, 'feature:missing')).toEqual({ kind: 'missing', id: 'feature:missing' });
  });

  it('retains parser diagnostics at the semantic boundary', () => {
    const raw = parseRawEcore(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}" xmlns:xsi="${XSI}" name="p">
      <eClassifiers xsi:type="e:EClass" name="C" abstract="truthy"/>
    </e:EPackage>`);
    const model = buildEcoreModel(raw);

    expect(model.diagnostics[0]?.code).toBe('ECORE_INVALID_BOOLEAN');
  });
});
