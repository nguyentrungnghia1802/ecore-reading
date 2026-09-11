import { describe, expect, it } from 'vitest';
import type { DiagramModel, DiagramNode, DiagramRow } from '../model';
import { DEFAULT_DIAGRAM_METRICS, layoutText, sizeDiagram } from './size-diagram';

function node(overrides: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id: 'node:class:A',
    semanticId: 'class:A',
    kind: 'class',
    title: 'A',
    rows: [],
    badges: [],
    ...overrides,
  };
}

function diagram(nodes: DiagramNode[], relations: DiagramModel['relations'] = []): DiagramModel {
  return {
    nodes,
    relations,
    sourceSemanticIds: new Set(nodes.map((item) => item.semanticId)),
    diagnostics: [],
  };
}

describe('sizeDiagram', () => {
  it('gives an empty class deterministic positive minimum geometry', () => {
    const input = diagram([node()]);

    const first = sizeDiagram(input, DEFAULT_DIAGRAM_METRICS);
    const second = sizeDiagram(input, DEFAULT_DIAGRAM_METRICS);

    expect(first).toEqual(second);
    expect(first.nodes[0]?.size).toEqual({
      width: DEFAULT_DIAGRAM_METRICS.minWidth,
      height: DEFAULT_DIAGRAM_METRICS.headerHeight,
    });
  });

  it('expands for long names only up to the documented maximum and preserves full text', () => {
    const title = 'A'.repeat(200);
    const sized = sizeDiagram(diagram([node({ title })]), DEFAULT_DIAGRAM_METRICS);

    expect(sized.nodes[0]?.size.width).toBe(DEFAULT_DIAGRAM_METRICS.maxWidth);
    expect(sized.nodes[0]?.text.title.fullText).toBe(title);
    expect(sized.nodes[0]?.text.title.displayText.endsWith('…')).toBe(true);
    expect(sized.nodes[0]?.text.title.truncated).toBe(true);
  });

  it('computes height from rows, compartments and secondary text', () => {
    const rows = [
      { id: 'row:1', semanticId: 'attr:1', kind: 'attribute' as const, primaryText: 'first' },
      {
        id: 'row:2', semanticId: 'ref:2', kind: 'reference' as const,
        primaryText: 'second', secondaryText: 'containment=true',
      },
      { id: 'row:3', semanticId: 'op:3', kind: 'operation' as const, primaryText: 'third()' },
    ];
    const sized = sizeDiagram(diagram([node({ rows })]), DEFAULT_DIAGRAM_METRICS);

    expect(sized.nodes[0]?.size.height).toBe(
      DEFAULT_DIAGRAM_METRICS.headerHeight +
      DEFAULT_DIAGRAM_METRICS.compartmentPadding * 2 +
      DEFAULT_DIAGRAM_METRICS.rowHeight * 3 +
      DEFAULT_DIAGRAM_METRICS.secondaryRowHeight,
    );
  });

  it.each([
    ['class', 0],
    ['enum', 4],
    ['datatype', 2],
  ] as const)('sizes %s nodes with %i visible rows', (kind, rowCount) => {
    const rowKind: DiagramRow['kind'] = kind === 'enum' ? 'literal' : 'metadata';
    const rows: DiagramRow[] = Array.from({ length: rowCount }, (_, index) => ({
      id: `row:${index}`,
      semanticId: `semantic:${index}`,
      kind: rowKind,
      primaryText: `row ${index}`,
    }));
    const sized = sizeDiagram(diagram([node({ kind, rows })]), DEFAULT_DIAGRAM_METRICS);

    expect(sized.nodes[0]?.size.width).toBeGreaterThan(0);
    expect(sized.nodes[0]?.size.height).toBeGreaterThanOrEqual(DEFAULT_DIAGRAM_METRICS.headerHeight);
  });

  it('reflects detail-mode row changes deterministically without reading DOM measurements', () => {
    const overview = sizeDiagram(diagram([node({ rows: [] })]), DEFAULT_DIAGRAM_METRICS);
    const ecore = sizeDiagram(diagram([node({
      rows: Array.from({ length: 6 }, (_, index) => ({
        id: `row:${index}`, semanticId: `s:${index}`, kind: 'metadata' as const,
        primaryText: `metadata ${index}`,
      })),
    })]), DEFAULT_DIAGRAM_METRICS);

    expect(ecore.nodes[0]?.size.height).toBeGreaterThan(overview.nodes[0]?.size.height ?? 0);
  });

  it('assigns stable side-aware ports and hierarchy-facing generalization ports', () => {
    const child = node({ id: 'node:Child', semanticId: 'Child', title: 'Child' });
    const parent = node({ id: 'node:Parent', semanticId: 'Parent', title: 'Parent' });
    const sized = sizeDiagram(diagram([child, parent], [{
      id: 'relation:generalization',
      kind: 'generalization',
      sourceNodeId: child.id,
      targetNodeId: parent.id,
      semanticIds: ['Child', 'Parent'],
    }]), DEFAULT_DIAGRAM_METRICS);

    expect(sized.nodes[0]?.ports.map((port) => port.side)).toEqual(['top', 'right', 'bottom', 'left']);
    expect(sized.relations[0]).toMatchObject({
      sourcePortId: 'port:node:Child:top',
      targetPortId: 'port:node:Parent:bottom',
    });
  });

  it('keeps association ports flexible', () => {
    const a = node({ id: 'node:A', semanticId: 'A' });
    const b = node({ id: 'node:B', semanticId: 'B' });
    const sized = sizeDiagram(diagram([a, b], [{
      id: 'relation:association',
      kind: 'association',
      sourceNodeId: a.id,
      targetNodeId: b.id,
      semanticIds: ['ref:A.b'],
    }]), DEFAULT_DIAGRAM_METRICS);

    expect(sized.relations[0]?.sourcePortId).toBeUndefined();
    expect(sized.relations[0]?.targetPortId).toBeUndefined();
  });

  it('uses one deterministic text overflow contract', () => {
    expect(layoutText('short', 10)).toEqual({
      fullText: 'short', displayText: 'short', truncated: false,
    });
    expect(layoutText('a long label', 7)).toEqual({
      fullText: 'a long label', displayText: 'a long…', truncated: true,
    });
  });

  it('returns JSON-serializable worker input without losing IDs', () => {
    const sized = sizeDiagram(diagram([node()]), DEFAULT_DIAGRAM_METRICS);
    const roundTrip = JSON.parse(JSON.stringify(sized)) as typeof sized;

    expect(roundTrip.nodes[0]?.id).toBe('node:class:A');
    expect(roundTrip.sourceSemanticIds).toEqual(['class:A']);
  });
});
