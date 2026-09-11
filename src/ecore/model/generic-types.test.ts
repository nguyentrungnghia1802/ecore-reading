import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ECORE_NAMESPACE_URI, parseRawEcore } from '../parser';
import { buildEcoreModel } from './build-ecore-model';
import { formatGenericType } from './format-generic-type';

const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const BUILTIN = 'http://www.eclipse.org/emf/2002/Ecore#//';

function build(body: string) {
  return buildEcoreModel(parseRawEcore(`<e:EPackage xmlns:e="${ECORE_NAMESPACE_URI}"
    xmlns:xsi="${XSI}" name="advanced">${body}</e:EPackage>`));
}

describe('advanced Ecore type semantics', () => {
  it('constructs recursive classifier and type-parameter generic references', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Box">
        <eTypeParameters name="T"/>
        <eStructuralFeatures xsi:type="e:EAttribute" name="mapping">
          <eGenericType eClassifier="${BUILTIN}EMap">
            <eTypeArguments eClassifier="${BUILTIN}EString"/>
            <eTypeArguments eClassifier="${BUILTIN}EEList">
              <eTypeArguments eTypeParameter="#//Box/T"/>
            </eTypeArguments>
          </eGenericType>
        </eStructuralFeatures>
      </eClassifiers>`);
    const classifier = model.classifiers[0];
    const generic = model.features[0]?.genericType;

    expect(classifier?.kind).toBe('class');
    if (classifier?.kind !== 'class') throw new Error('Expected class');
    expect(generic?.classifier).toMatchObject({ kind: 'builtin', displayName: 'EMap' });
    expect(generic?.typeArguments[1]?.typeArguments[0]?.typeParameterId).toBe(
      classifier.typeParameters[0]?.id,
    );
    expect(formatGenericType(generic, model)).toBe('EMap<EString, EEList<T>>');
  });

  it('preserves type-parameter bounds and wildcard upper/lower bounds', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Base"/>
      <eClassifiers xsi:type="e:EClass" name="Box">
        <eTypeParameters name="T"><eBounds eClassifier="#//Base"/></eTypeParameters>
        <eStructuralFeatures xsi:type="e:EAttribute" name="variant">
          <eGenericType>
            <eUpperBound eClassifier="#//Base"/>
            <eLowerBound eTypeParameter="#//Box/T"/>
          </eGenericType>
        </eStructuralFeatures>
      </eClassifiers>`);
    const box = model.classifiers[1];
    const generic = model.features[0]?.genericType;

    expect(box?.kind).toBe('class');
    if (box?.kind !== 'class') throw new Error('Expected class');
    expect(box.typeParameters[0]?.bounds[0]?.classifier).toMatchObject({
      kind: 'local',
      classifierId: model.classifiers[0]?.id,
    });
    expect(generic?.upperBound?.classifier).toMatchObject({ kind: 'local' });
    expect(generic?.lowerBound?.typeParameterId).toBe(box.typeParameters[0]?.id);
    expect(formatGenericType(generic, model)).toContain('extends Base');
    expect(formatGenericType(generic, model)).toContain('super T');
  });

  it('resolves operation type parameters and serialized exceptions distinctly', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Failure"/>
      <eClassifiers xsi:type="e:EClass" name="Service">
        <eOperations name="convert" eExceptions="#//Failure">
          <eTypeParameters name="U"/>
          <eGenericType eTypeParameter="#//Service/convert/U"/>
          <eParameters name="input">
            <eGenericType eTypeParameter="#//Service/convert/U"/>
          </eParameters>
        </eOperations>
      </eClassifiers>`);
    const operation = model.operations[0];

    expect(operation?.typeParameters[0]?.ownerId).toBe(operation?.id);
    expect(operation?.genericType?.typeParameterId).toBe(operation?.typeParameters[0]?.id);
    expect(operation?.parameters[0]?.genericType?.typeParameterId).toBe(operation?.typeParameters[0]?.id);
    expect(operation?.exceptionRefs[0]).toMatchObject({
      kind: 'local',
      classifierId: model.classifiers[0]?.id,
    });
  });

  it('preserves annotation data without interpreting unknown sources', () => {
    const model = build(`
      <eAnnotations source="urn:unknown:executable-looking">
        <details key="language" value="not-executed"/>
        <contents href="external://payload"/>
      </eAnnotations>
      <eClassifiers xsi:type="e:EClass" name="Annotated"/>
    `);

    expect(model.packages[0]?.annotations[0]).toMatchObject({
      source: 'urn:unknown:executable-looking',
      details: { language: 'not-executed' },
      contents: [{ href: 'external://payload' }],
    });
  });

  it('keeps user datatypes, enum metadata and explicit literal values', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EDataType" name="Money" instanceClassName="java.math.BigDecimal"
        instanceTypeName="java.math.BigDecimal" serializable="false"/>
      <eClassifiers xsi:type="e:EEnum" name="State" instanceClassName="sample.State">
        <eLiterals name="READY" value="7" literal="ready-now"/>
      </eClassifiers>`);

    expect(model.classifiers[0]).toMatchObject({
      kind: 'datatype',
      instanceClassName: 'java.math.BigDecimal',
      instanceTypeName: 'java.math.BigDecimal',
      serializable: false,
    });
    expect(model.classifiers[1]).toMatchObject({
      kind: 'enum',
      literals: [{ name: 'READY', value: 7, literal: 'ready-now' }],
    });
  });

  it('keeps unresolved generic references explicit with diagnostics', () => {
    const model = build(`
      <eClassifiers xsi:type="e:EClass" name="Box">
        <eStructuralFeatures xsi:type="e:EAttribute" name="remote">
          <eGenericType eClassifier="external.ecore#//Remote"/>
        </eStructuralFeatures>
      </eClassifiers>`);

    expect(model.features[0]?.genericType?.classifier).toMatchObject({
      kind: 'external',
      resolution: 'unresolved',
    });
    expect(model.diagnostics.some((diagnostic) => diagnostic.code === 'ECORE_UNRESOLVED_EXTERNAL_REFERENCE')).toBe(true);
  });

  it('preserves the combined real-world advanced fixture through parse and resolution', async () => {
    const xml = await readFile(
      resolve(process.cwd(), 'tests/fixtures/ecore/real-world/advanced.ecore'),
      'utf8',
    );
    const model = buildEcoreModel(parseRawEcore(xml, { sourceName: 'advanced.ecore' }));
    const repository = model.classifiers.find((item) => item.name === 'Repository');

    expect(repository).toMatchObject({
      kind: 'class',
      superTypeRefs: [{ kind: 'local' }],
      typeParameters: [{ name: 'T', bounds: [{ classifier: { kind: 'local' } }] }],
    });
    expect(model.operations[0]?.exceptionRefs).toEqual([
      { kind: 'local', classifierId: model.classifiers[2]?.id, raw: '#//RepositoryError' },
    ]);
    expect(model.packages[0]?.annotations[0]?.details.documentation).toBe(
      'Advanced semantic regression model',
    );
  });
});
