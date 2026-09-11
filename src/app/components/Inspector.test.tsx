import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildEcoreModel } from '../../ecore/model';
import { parseRawEcore } from '../../ecore/parser';
import { selectionForSemanticIds } from '../../renderer';
import { Inspector } from './Inspector';

describe('Inspector component', () => {
  it('renders EClass details including supertypes, members, and diagnostics', () => {
    const raw = parseRawEcore(`
      <ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="core">
        <eClassifiers xsi:type="ecore:EClass" name="Base" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" abstract="true" />
        <eClassifiers xsi:type="ecore:EClass" name="Sub" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" eSuperTypes="#//Base">
          <eStructuralFeatures xsi:type="ecore:EAttribute" name="code" eType="ecore:EDataType http://www.eclipse.org/emf/2002/Ecore#//EString" />
        </eClassifiers>
      </ecore:EPackage>
    `, { sourceName: 'test.ecore' });
    const model = buildEcoreModel(raw);

    const subClass = model.classifiers.find((c) => c.name === 'Sub');
    expect(subClass).toBeDefined();

    const selection = selectionForSemanticIds('node', [subClass!.id]);

    const markup = renderToStaticMarkup(
      <Inspector
        model={model}
        selection={selection}
        onSelectSemanticId={() => {}}
        isOpen={true}
        onToggleOpen={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="semantic-inspector"');
    expect(markup).toContain('Sub');
    expect(markup).toContain('core');
    expect(markup).toContain('Base');
    expect(markup).toContain('code');
  });

  it('renders merged eOpposite association showing both underlying EReference IDs', () => {
    const raw = parseRawEcore(`
      <ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="opp">
        <eClassifiers xsi:type="ecore:EClass" name="A" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <eStructuralFeatures xsi:type="ecore:EReference" name="b" eType="#//B" eOpposite="#//B/a" />
        </eClassifiers>
        <eClassifiers xsi:type="ecore:EClass" name="B" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <eStructuralFeatures xsi:type="ecore:EReference" name="a" eType="#//A" eOpposite="#//A/b" />
        </eClassifiers>
      </ecore:EPackage>
    `, { sourceName: 'opp.ecore' });
    const model = buildEcoreModel(raw);

    const refA = model.features.find((f) => f.name === 'b');
    const refB = model.features.find((f) => f.name === 'a');
    expect(refA).toBeDefined();
    expect(refB).toBeDefined();

    const selection = selectionForSemanticIds('relation', [refA!.id, refB!.id]);

    const markup = renderToStaticMarkup(
      <Inspector
        model={model}
        selection={selection}
        onSelectSemanticId={() => {}}
        isOpen={true}
        onToggleOpen={() => {}}
      />,
    );

    expect(markup).toContain('Bidirectional Association');
    expect(markup).toContain(refA!.id);
    expect(markup).toContain(refB!.id);
    expect(markup).toContain('eOpposite');
  });

  it('clearly describes unresolved external targets as unresolved', () => {
    const raw = parseRawEcore(`
      <ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="ext">
        <eClassifiers xsi:type="ecore:EClass" name="Local" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <eStructuralFeatures xsi:type="ecore:EReference" name="remote" eType="http://example.com/other.ecore#//Foreign" />
        </eClassifiers>
      </ecore:EPackage>
    `, { sourceName: 'ext.ecore' });
    const model = buildEcoreModel(raw);

    const ref = model.features.find((f) => f.name === 'remote');
    expect(ref).toBeDefined();

    const selection = selectionForSemanticIds('row', [ref!.id]);

    const markup = renderToStaticMarkup(
      <Inspector
        model={model}
        selection={selection}
        onSelectSemanticId={() => {}}
        isOpen={true}
        onToggleOpen={() => {}}
      />,
    );

    expect(markup).toContain('remote');
    expect(markup).toContain('unresolved');
    expect(markup).toContain('http://example.com/other.ecore#//Foreign');
  });
});
