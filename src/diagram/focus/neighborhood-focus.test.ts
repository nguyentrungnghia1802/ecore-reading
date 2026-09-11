import { describe, expect, it } from 'vitest';
import type { DiagramModel, DiagramNode, DiagramRelation } from '../model';
import {
  applyNeighborhoodFocus,
  computeNeighborhoodFocus,
} from './neighborhood-focus';

function createMockDiagram(
  nodes: Array<{ id: string; semanticId?: string; kind?: DiagramNode['kind'] }>,
  relations: Array<{
    id: string;
    source: string;
    target: string;
    kind?: DiagramRelation['kind'];
  }>,
): DiagramModel {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      semanticId: n.semanticId ?? `semantic:${n.id}`,
      kind: n.kind ?? 'class',
      title: n.id,
      rows: [],
      badges: [],
    })),
    relations: relations.map((r) => ({
      id: r.id,
      kind: r.kind ?? 'association',
      sourceNodeId: r.source,
      targetNodeId: r.target,
      semanticIds: [r.id],
    })),
    sourceSemanticIds: new Set(nodes.map((n) => n.semanticId ?? `semantic:${n.id}`)),
    diagnostics: [],
  };
}

describe('computeNeighborhoodFocus', () => {
  it('traverses 1-hop neighbors correctly without exceeding depth', () => {
    // A -> B -> C -> D
    const diagram = createMockDiagram(
      [{ id: 'A' }, [{ id: 'B' }, { id: 'C' }, { id: 'D' }].map((x) => ({ id: x.id }))].flat(),
      [
        { id: 'r1', source: 'A', target: 'B' },
        { id: 'r2', source: 'B', target: 'C' },
        { id: 'r3', source: 'C', target: 'D' },
      ],
    );

    const focus = computeNeighborhoodFocus(diagram, 'A', { depth: 1 });
    expect(focus.includedNodeIds).toEqual(new Set(['A', 'B']));
    expect(focus.includedRelationIds).toEqual(new Set(['r1']));
    expect(focus.distances.get('A')).toBe(0);
    expect(focus.distances.get('B')).toBe(1);
    expect(focus.distances.get('C')).toBeUndefined();
  });

  it('traverses 2-hop and 3-hop neighbors', () => {
    // A -> B -> C -> D
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
      [
        { id: 'r1', source: 'A', target: 'B' },
        { id: 'r2', source: 'B', target: 'C' },
        { id: 'r3', source: 'C', target: 'D' },
      ],
    );

    const focus2 = computeNeighborhoodFocus(diagram, 'A', { depth: 2 });
    expect(focus2.includedNodeIds).toEqual(new Set(['A', 'B', 'C']));
    expect(focus2.includedRelationIds).toEqual(new Set(['r1', 'r2']));

    const focus3 = computeNeighborhoodFocus(diagram, 'A', { depth: 3 });
    expect(focus3.includedNodeIds).toEqual(new Set(['A', 'B', 'C', 'D']));
    expect(focus3.includedRelationIds).toEqual(new Set(['r1', 'r2', 'r3']));
  });

  it('handles cycles safely without infinite looping', () => {
    // Triangle cycle: A -> B -> C -> A
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [
        { id: 'r1', source: 'A', target: 'B' },
        { id: 'r2', source: 'B', target: 'C' },
        { id: 'r3', source: 'C', target: 'A' },
      ],
    );

    const focus = computeNeighborhoodFocus(diagram, 'A', { depth: 'all' });
    expect(focus.includedNodeIds).toEqual(new Set(['A', 'B', 'C']));
    expect(focus.includedRelationIds).toEqual(new Set(['r1', 'r2', 'r3']));
  });

  it('resolves multiple paths using shortest distance', () => {
    // A -> B -> C (2 hops)
    // A -> C (1 hop direct)
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [
        { id: 'r1', source: 'A', target: 'B' },
        { id: 'r2', source: 'B', target: 'C' },
        { id: 'r3', source: 'A', target: 'C' },
      ],
    );

    const focus = computeNeighborhoodFocus(diagram, 'A', { depth: 1 });
    expect(focus.distances.get('C')).toBe(1);
    expect(focus.includedNodeIds).toEqual(new Set(['A', 'B', 'C']));
    expect(focus.includedRelationIds).toEqual(new Set(['r1', 'r2', 'r3']));
  });

  it('treats external placeholders as 1 hop and terminates if dead end', () => {
    // LocalA -> ExternalX (kind='external')
    const diagram = createMockDiagram(
      [
        { id: 'LocalA', kind: 'class' },
        { id: 'ExternalX', kind: 'external' },
        { id: 'OtherNode', kind: 'class' },
      ],
      [
        { id: 'rExt', source: 'LocalA', target: 'ExternalX', kind: 'external-reference' },
      ],
    );

    const focus1 = computeNeighborhoodFocus(diagram, 'LocalA', { depth: 1 });
    expect(focus1.includedNodeIds).toEqual(new Set(['LocalA', 'ExternalX']));
    expect(focus1.distances.get('ExternalX')).toBe(1);
    expect(focus1.includedNodeIds.has('OtherNode')).toBe(false);
  });

  it('respects enabledRelationKinds filtering during traversal', () => {
    // A -[generalization]-> B -[association]-> C
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [
        { id: 'rGen', source: 'A', target: 'B', kind: 'generalization' },
        { id: 'rAssoc', source: 'B', target: 'C', kind: 'association' },
      ],
    );

    // If only generalization is enabled, traversal should stop at B
    const focus = computeNeighborhoodFocus(diagram, 'A', {
      depth: 3,
      enabledRelationKinds: new Set(['generalization']),
    });

    expect(focus.includedNodeIds).toEqual(new Set(['A', 'B']));
    expect(focus.includedRelationIds).toEqual(new Set(['rGen']));
  });

  it('applies focus to produce a filtered diagram model', () => {
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [
        { id: 'r1', source: 'A', target: 'B' },
        { id: 'r2', source: 'B', target: 'C' },
      ],
    );

    const focus = computeNeighborhoodFocus(diagram, 'A', { depth: 1 });
    const focusedDiagram = applyNeighborhoodFocus(diagram, focus);

    expect(focusedDiagram.nodes.map((n) => n.id)).toEqual(['A', 'B']);
    expect(focusedDiagram.relations.map((r) => r.id)).toEqual(['r1']);
  });
});
