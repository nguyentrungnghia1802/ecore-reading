import { describe, expect, it, vi } from 'vitest';
import type { LayoutModel } from '../../layout/model';
import { toReactFlowElements } from './react-flow-adapter';
import { selectionForEdge, selectionForNode, selectionForRow } from './selection-adapter';

const layout: LayoutModel = {
  nodes: [
    {
      id: 'node:A', semanticId: 'class:A', kind: 'class', title: 'A', rows: [
        { id: 'row:a', semanticId: 'attribute:A.name', kind: 'attribute', primaryText: 'name : EString' },
      ], badges: [], position: { x: 10, y: 20 }, size: { width: 220, height: 100 },
      text: {
        title: { fullText: 'A', displayText: 'A', truncated: false },
        rows: [{
          rowId: 'row:a',
          primary: { fullText: 'name : EString', displayText: 'name : EString', truncated: false },
        }],
      },
    },
    {
      id: 'node:B', semanticId: 'class:B', kind: 'enum', title: 'B',
      stereotype: '«enumeration»', rows: [], badges: [], position: { x: 300, y: 20 },
      size: { width: 220, height: 70 },
      text: {
        title: { fullText: 'B', displayText: 'B', truncated: false },
        stereotype: { fullText: '«enumeration»', displayText: '«enumeration»', truncated: false },
        rows: [],
      },
    },
  ],
  relations: [
    {
      id: 'edge:reference', kind: 'association', sourceNodeId: 'node:A', targetNodeId: 'node:B',
      sourceEnd: { classifierId: 'class:A', navigable: false },
      targetEnd: {
        classifierId: 'class:B', roleName: 'states', multiplicity: { lower: 0, upper: 'unbounded' },
        navigable: true, sourceReferenceId: 'reference:A.states',
      },
      semanticIds: ['reference:A.states'],
      sections: [{ start: { x: 230, y: 60 }, bendPoints: [], end: { x: 300, y: 60 } }],
    },
  ],
  bounds: { x: 0, y: 0, width: 520, height: 120 },
  profileId: 'hierarchy-right',
};

describe('React Flow adapter and semantic selection', () => {
  it('maps LayoutModel geometry without becoming semantic truth', () => {
    const rowSelection = vi.fn();
    const elements = toReactFlowElements(layout, {
      selection: { kind: 'node', semanticIds: ['class:A'], primarySemanticId: 'class:A' },
      onSelectRow: rowSelection,
    });

    expect(elements.nodes[0]).toMatchObject({
      id: 'node:A',
      type: 'class',
      position: { x: 10, y: 20 },
      width: 220,
      height: 100,
      draggable: true,
      data: {
        semanticId: 'class:A',
        selectedState: 'selected',
      },
    });
    expect(elements.nodes[1]?.data.selectedState).toBe('neighbor');
    expect(elements.edges[0]).toMatchObject({
      id: 'edge:reference',
      type: 'semantic',
      source: 'node:A',
      target: 'node:B',
      data: { semanticIds: ['reference:A.states'] },
    });
    expect(elements.edges[0]?.data?.selectedState).toBe('neighbor');
    expect(elements.edges[0]?.ariaLabel).toBe('association, states 0..*');
    elements.nodes[0]?.data.onSelectRow?.('attribute:A.name');
    expect(rowSelection).toHaveBeenCalledWith('attribute:A.name');
  });

  it('returns exact semantic identities for node, row and merged relation selections', () => {
    expect(selectionForNode(layout.nodes[0]!)).toEqual({
      kind: 'node', semanticIds: ['class:A'], primarySemanticId: 'class:A',
    });
    expect(selectionForRow(layout.nodes[0]!.rows[0]!)).toEqual({
      kind: 'row', semanticIds: ['attribute:A.name'], primarySemanticId: 'attribute:A.name',
    });
    expect(selectionForEdge({
      ...layout.relations[0]!,
      semanticIds: ['reference:A.states', 'reference:B.owner'],
    })).toEqual({
      kind: 'relation',
      semanticIds: ['reference:A.states', 'reference:B.owner'],
      primarySemanticId: 'reference:A.states',
    });
  });

  it('does not mutate LayoutModel when React Flow positions change', () => {
    const elements = toReactFlowElements(layout, { selection: null });

    elements.nodes[0]!.position.x = 999;
    expect(layout.nodes[0]?.position.x).toBe(10);
  });

  it('does not mistake classifier IDs on a generalization for an edge selection', () => {
    const generalization: LayoutModel = {
      ...layout,
      relations: [{
        id: 'edge:generalization', kind: 'generalization', sourceNodeId: 'node:A', targetNodeId: 'node:B',
        semanticIds: ['class:A', 'class:B'],
        sections: [{ start: { x: 230, y: 60 }, bendPoints: [], end: { x: 300, y: 60 } }],
      }],
    };

    const nodeSelected = toReactFlowElements(generalization, {
      selection: { kind: 'node', semanticIds: ['class:A'], primarySemanticId: 'class:A' },
    });
    const edgeSelected = toReactFlowElements(generalization, {
      selection: { kind: 'relation', semanticIds: ['class:A', 'class:B'], primarySemanticId: 'class:A' },
    });

    expect(nodeSelected.edges[0]?.data?.selectedState).toBe('neighbor');
    expect(edgeSelected.edges[0]?.data?.selectedState).toBe('selected');
  });
});
