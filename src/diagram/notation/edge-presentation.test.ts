import { describe, expect, it } from 'vitest';
import type { LayoutRelation } from '../../layout/model';
import {
  edgeAccessibleLabel,
  edgeEndLabels,
  edgeMarkerShapes,
  edgePresentation,
  sectionsToSvgPath,
} from './edge-presentation';

function relation(overrides: Partial<LayoutRelation>): LayoutRelation {
  return {
    id: 'edge',
    kind: 'association',
    sourceNodeId: 'node:A',
    targetNodeId: 'node:B',
    semanticIds: ['ref:A.b'],
    sections: [{
      start: { x: 10, y: 20 },
      bendPoints: [{ x: 30, y: 20 }, { x: 30, y: 40 }],
      end: { x: 50, y: 40 },
    }],
    ...overrides,
  };
}

describe('semantic edge presentation', () => {
  it.each([
    ['generalization', { markerStart: undefined, markerEnd: 'uml-hollow-triangle', dash: undefined }],
    ['composition', { markerStart: 'uml-filled-diamond', markerEnd: 'uml-navigable-arrow', dash: undefined }],
    ['association', { markerStart: undefined, markerEnd: 'uml-navigable-arrow', dash: undefined }],
    ['external-reference', { markerStart: undefined, markerEnd: 'uml-navigable-arrow', dash: '8 5' }],
  ] as const)('maps %s to monochrome-distinct markers', (kind, expected) => {
    expect(edgePresentation(relation({
      kind,
      targetEnd: { classifierId: 'class:B', navigable: true },
    }))).toEqual(expected);
  });

  it('adds a source arrow for a bidirectional non-composition association', () => {
    expect(edgePresentation(relation({
      sourceEnd: { classifierId: 'class:A', navigable: true },
      targetEnd: { classifierId: 'class:B', navigable: true },
      semanticIds: ['ref:A.b', 'ref:B.a'],
    }))).toEqual({
      markerStart: 'uml-navigable-arrow',
      markerEnd: 'uml-navigable-arrow',
      dash: undefined,
    });
  });

  it('uses precomputed route sections including parallel/self routes', () => {
    expect(sectionsToSvgPath(relation({}).sections)).toBe('M 10 20 L 30 20 L 30 40 L 50 40');
  });

  it('builds accessible text from relation-end metadata', () => {
    const label = edgeAccessibleLabel(relation({
      kind: 'composition',
      sourceEnd: {
        classifierId: 'class:A', roleName: 'owner', multiplicity: { lower: 0, upper: 1 },
        navigable: true, sourceReferenceId: 'ref:B.owner',
      },
      targetEnd: {
        classifierId: 'class:B', roleName: 'children', multiplicity: { lower: 0, upper: 'unbounded' },
        navigable: true, sourceReferenceId: 'ref:A.children',
      },
      semanticIds: ['ref:A.children', 'ref:B.owner'],
    }));

    expect(label).toContain('composition');
    expect(label).toContain('owner 0..1');
    expect(label).toContain('children 0..*');
  });

  it('places semantic marker geometry at the correct relation ends', () => {
    const generalization = edgeMarkerShapes(relation({ kind: 'generalization' }));
    expect(generalization).toHaveLength(1);
    expect(generalization[0]).toMatchObject({
      end: 'target', marker: 'uml-hollow-triangle',
    });
    expect(generalization[0]?.points[0]).toEqual({ x: 50, y: 40 });

    const composition = edgeMarkerShapes(relation({
      kind: 'composition', targetEnd: { classifierId: 'class:B', navigable: true },
    }));
    expect(composition[0]).toMatchObject({ end: 'source', marker: 'uml-filled-diamond' });
    expect(composition[0]?.points[0]).toEqual({ x: 10, y: 20 });
    expect(composition[1]).toMatchObject({ end: 'target', marker: 'uml-navigable-arrow' });
    expect(composition[1]?.points[0]).toEqual({ x: 50, y: 40 });
  });

  it('places role and multiplicity labels from the matching semantic ends', () => {
    const labels = edgeEndLabels(relation({
      sourceEnd: { classifierId: 'class:A', roleName: 'owner', multiplicity: { lower: 0, upper: 1 }, navigable: true },
      targetEnd: { classifierId: 'class:B', roleName: 'items', multiplicity: { lower: 0, upper: 'unbounded' }, navigable: true },
    }));

    expect(labels).toEqual([
      expect.objectContaining({ end: 'source', text: 'owner 0..1' }),
      expect.objectContaining({ end: 'target', text: 'items 0..*' }),
    ]);
    expect(labels[0]?.point).not.toEqual(labels[1]?.point);
  });

  it('gives parallel relations distinct deterministic label lanes without suppressing labels', () => {
    const first = edgeEndLabels(relation({ id: 'parallel:one', targetEnd: {
      classifierId: 'class:B', roleName: 'first', multiplicity: { lower: 0, upper: 1 }, navigable: true,
    } }));
    const second = edgeEndLabels(relation({ id: 'parallel:two', targetEnd: {
      classifierId: 'class:B', roleName: 'second', multiplicity: { lower: 0, upper: 1 }, navigable: true,
    } }));

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.point).not.toEqual(second[0]?.point);
    expect(first[0]?.text).toBe('first 0..1');
    expect(second[0]?.text).toBe('second 0..1');
  });

  it('truncates long edge roles while preserving the higher-priority multiplicity', () => {
    const roleName = 'W'.repeat(120);
    const labels = edgeEndLabels(relation({
      targetEnd: {
        classifierId: 'class:B',
        roleName,
        multiplicity: { lower: 0, upper: 'unbounded' },
        navigable: true,
      },
    }));

    expect(labels[0]?.text.length).toBeLessThanOrEqual(36);
    expect(labels[0]?.text).toMatch(/… 0\.\.\*$/);
  });
});
