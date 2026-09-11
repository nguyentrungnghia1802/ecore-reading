import { describe, expect, it } from 'vitest';
import type { DiagramModel, DiagramNode, DiagramRelation } from '../model';
import {
  applyDiagramFilters,
  DEFAULT_DIAGRAM_FILTER,
  isDefaultFilter,
  type DiagramFilterOptions,
} from './diagram-filter';

function createMockDiagram(
  nodes: Array<{ id: string; kind?: DiagramNode['kind'] }>,
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
      semanticId: `semantic:${n.id}`,
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
    sourceSemanticIds: new Set(nodes.map((n) => `semantic:${n.id}`)),
    diagnostics: [],
  };
}

describe('applyDiagramFilters', () => {
  it('returns exact diagram when all filters are enabled by default', () => {
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }],
      [{ id: 'r1', source: 'A', target: 'B' }],
    );

    const filtered = applyDiagramFilters(diagram, DEFAULT_DIAGRAM_FILTER);
    expect(isDefaultFilter(DEFAULT_DIAGRAM_FILTER)).toBe(true);
    expect(filtered).toBe(diagram);
  });

  it('filters out relation kinds according to toggles', () => {
    const diagram = createMockDiagram(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
      [
        { id: 'rGen', source: 'A', target: 'B', kind: 'generalization' },
        { id: 'rComp', source: 'B', target: 'C', kind: 'composition' },
        { id: 'rAssoc', source: 'C', target: 'D', kind: 'association' },
      ],
    );

    const filters: DiagramFilterOptions = {
      ...DEFAULT_DIAGRAM_FILTER,
      relations: {
        ...DEFAULT_DIAGRAM_FILTER.relations,
        inheritance: false,
        containment: false,
      },
    };

    const filtered = applyDiagramFilters(diagram, filters);
    expect(filtered.relations.map((r) => r.id)).toEqual(['rAssoc']);
  });

  it('filters out nodes and guarantees no dangling edges', () => {
    const diagram = createMockDiagram(
      [
        { id: 'ClassA', kind: 'class' },
        { id: 'EnumB', kind: 'enum' },
        { id: 'DataC', kind: 'datatype' },
      ],
      [
        { id: 'r1', source: 'ClassA', target: 'EnumB', kind: 'association' },
        { id: 'r2', source: 'ClassA', target: 'DataC', kind: 'association' },
      ],
    );

    // Disable enums
    const filters: DiagramFilterOptions = {
      ...DEFAULT_DIAGRAM_FILTER,
      nodes: {
        ...DEFAULT_DIAGRAM_FILTER.nodes,
        enums: false,
      },
    };

    const filtered = applyDiagramFilters(diagram, filters);
    expect(filtered.nodes.map((n) => n.id)).toEqual(['ClassA', 'DataC']);
    // r1 is omitted because its target EnumB is filtered out
    expect(filtered.relations.map((r) => r.id)).toEqual(['r2']);
  });

  it('handles merged opposite composition relations correctly', () => {
    // In Ecore, a bidirectional relation where one end is containment is a 'composition'
    const diagram = createMockDiagram(
      [{ id: 'Parent', kind: 'class' }, { id: 'Child', kind: 'class' }],
      [{ id: 'parent_children', source: 'Parent', target: 'Child', kind: 'composition' }],
    );

    // If references is FALSE but containment is TRUE: composition MUST be kept
    const filtersKeepComposition: DiagramFilterOptions = {
      ...DEFAULT_DIAGRAM_FILTER,
      relations: {
        ...DEFAULT_DIAGRAM_FILTER.relations,
        references: false,
        containment: true,
      },
    };
    const kept = applyDiagramFilters(diagram, filtersKeepComposition);
    expect(kept.relations.map((r) => r.id)).toEqual(['parent_children']);

    // If containment is FALSE: composition MUST be filtered out
    const filtersHideComposition: DiagramFilterOptions = {
      ...DEFAULT_DIAGRAM_FILTER,
      relations: {
        ...DEFAULT_DIAGRAM_FILTER.relations,
        references: true,
        containment: false,
      },
    };
    const hidden = applyDiagramFilters(diagram, filtersHideComposition);
    expect(hidden.relations).toHaveLength(0);
  });
});
