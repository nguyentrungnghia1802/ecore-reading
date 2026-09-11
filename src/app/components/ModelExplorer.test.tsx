import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildEcoreModel } from '../../ecore/model';
import { parseRawEcore } from '../../ecore/parser';
import { ModelExplorer } from './ModelExplorer';

describe('ModelExplorer', () => {
  it('renders package hierarchy with distinct classifier kinds and duplicate names', () => {
    const raw = parseRawEcore(`
      <ecore:EPackage xmlns:xmi="http://www.omg.org/XMI" xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="root">
        <eSubpackages name="left">
          <eClassifiers xsi:type="ecore:EClass" name="Item" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" />
          <eClassifiers xsi:type="ecore:EEnum" name="Status" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" />
        </eSubpackages>
        <eSubpackages name="right">
          <eClassifiers xsi:type="ecore:EClass" name="Item" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" />
          <eClassifiers xsi:type="ecore:EDataType" name="CustomText" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" />
        </eSubpackages>
      </ecore:EPackage>
    `, { sourceName: 'nested.ecore' });
    const model = buildEcoreModel(raw);

    const onSelect = vi.fn();
    const markup = renderToStaticMarkup(
      <ModelExplorer
        model={model}
        selectedSemanticId={null}
        onSelectSemanticId={onSelect}
        isOpen={true}
        onToggleOpen={() => {}}
      />,
    );

    // Root and subpackages rendered
    expect(markup).toContain('root');
    expect(markup).toContain('left');
    expect(markup).toContain('right');

    // Kind badges / icons present (not color only)
    expect(markup).toContain('kind-badge--class');
    expect(markup).toContain('kind-badge--enum');
    expect(markup).toContain('kind-badge--datatype');
    expect(markup).toContain('Class');
    expect(markup).toContain('Enum');
    expect(markup).toContain('DataType');

    // Both same-named Items exist with their respective semantic IDs in data attributes
    const leftItem = model.classifiers.find(
      (c) => c.name === 'Item' && model.packageById.get(c.packageId)?.name === 'left',
    );
    const rightItem = model.classifiers.find(
      (c) => c.name === 'Item' && model.packageById.get(c.packageId)?.name === 'right',
    );
    expect(leftItem).toBeDefined();
    expect(rightItem).toBeDefined();
    expect(leftItem?.id).not.toEqual(rightItem?.id);
    expect(markup).toContain(`data-semantic-id="${leftItem?.id}"`);
    expect(markup).toContain(`data-semantic-id="${rightItem?.id}"`);
  });

  it('renders collapsed state when isOpen is false', () => {
    const raw = parseRawEcore(`
      <ecore:EPackage xmlns:ecore="http://www.eclipse.org/emf/2002/Ecore" name="root" />
    `, { sourceName: 'empty.ecore' });
    const model = buildEcoreModel(raw);

    const markup = renderToStaticMarkup(
      <ModelExplorer
        model={model}
        selectedSemanticId={null}
        onSelectSemanticId={() => {}}
        isOpen={false}
        onToggleOpen={() => {}}
      />,
    );

    expect(markup).toContain('model-explorer--collapsed');
    expect(markup).toContain('data-testid="model-explorer-collapsed"');
  });
});
