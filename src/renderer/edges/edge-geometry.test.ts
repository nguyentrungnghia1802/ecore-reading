import { describe, expect, it } from 'vitest';
import type { LayoutRelation } from '../../layout/model';
import {
  computeDynamicEdgeSections,
  computeOrthogonalBendPoints,
  determinePortSide,
} from './edge-geometry';

const sampleRelation: LayoutRelation = {
  id: 'rel:order-items',
  kind: 'composition',
  sourceNodeId: 'node:Order',
  targetNodeId: 'node:Item',
  semanticIds: ['ref:Order.items'],
  sourceEnd: { classifierId: 'class:Order', navigable: false },
  targetEnd: { classifierId: 'class:Item', navigable: true },
  sections: [
    {
      start: { x: 230, y: 70 },
      bendPoints: [{ x: 265, y: 70 }, { x: 265, y: 70 }],
      end: { x: 300, y: 70 },
    },
  ],
};

const sourceNode = {
  position: { x: 10, y: 20 },
  size: { width: 220, height: 100 },
};

const targetNode = {
  position: { x: 300, y: 20 },
  size: { width: 220, height: 100 },
};

describe('edge-geometry', () => {
  it('determines the correct port side based on endpoint coordinates relative to node bounds', () => {
    expect(determinePortSide({ x: 10, y: 20 }, { width: 220, height: 100 }, { x: 230, y: 70 })).toBe('right');
    expect(determinePortSide({ x: 10, y: 20 }, { width: 220, height: 100 }, { x: 10, y: 70 })).toBe('left');
    expect(determinePortSide({ x: 10, y: 20 }, { width: 220, height: 100 }, { x: 120, y: 20 })).toBe('top');
    expect(determinePortSide({ x: 10, y: 20 }, { width: 220, height: 100 }, { x: 120, y: 120 })).toBe('bottom');
  });

  it('returns exact initial ELK sections when neither node has moved', () => {
    const sections = computeDynamicEdgeSections({
      relation: sampleRelation,
      sourceNode,
      targetNode,
      currentSourcePos: { x: 10, y: 20 },
      currentTargetPos: { x: 300, y: 20 },
    });

    expect(sections).toEqual(sampleRelation.sections);
  });

  it('translates start endpoint in real-time when source node is dragged', () => {
    // Drag Order by 100px right and 50px down
    const sections = computeDynamicEdgeSections({
      relation: sampleRelation,
      sourceNode,
      targetNode,
      currentSourcePos: { x: 110, y: 70 },
      currentTargetPos: { x: 300, y: 20 },
    });

    // Start endpoint moves with source node (230+100, 70+50)
    expect(sections[0]?.start).toEqual({ x: 330, y: 120 });
    // Target endpoint remains anchored at Item (300, 70)
    expect(sections[0]?.end).toEqual({ x: 300, y: 70 });
  });

  it('translates target endpoint in real-time when target node is dragged', () => {
    // Drag Item by 80px right and -30px up
    const sections = computeDynamicEdgeSections({
      relation: sampleRelation,
      sourceNode,
      targetNode,
      currentSourcePos: { x: 10, y: 20 },
      currentTargetPos: { x: 380, y: -10 },
    });

    // Start endpoint stays at Order (230, 70)
    expect(sections[0]?.start).toEqual({ x: 230, y: 70 });
    // Target endpoint moves with target node (300+80, 70-30)
    expect(sections[0]?.end).toEqual({ x: 380, y: 40 });
  });

  it('preserves distinct port offsets for parallel edges when source node moves', () => {
    const parallelRel1: LayoutRelation = {
      ...sampleRelation,
      id: 'rel:1',
      sections: [{ start: { x: 230, y: 50 }, bendPoints: [], end: { x: 300, y: 50 } }],
    };
    const parallelRel2: LayoutRelation = {
      ...sampleRelation,
      id: 'rel:2',
      sections: [{ start: { x: 230, y: 80 }, bendPoints: [], end: { x: 300, y: 80 } }],
    };

    // Move source node by (40, 60)
    const sections1 = computeDynamicEdgeSections({
      relation: parallelRel1,
      sourceNode,
      targetNode,
      currentSourcePos: { x: 50, y: 80 },
      currentTargetPos: { x: 300, y: 20 },
    });
    const sections2 = computeDynamicEdgeSections({
      relation: parallelRel2,
      sourceNode,
      targetNode,
      currentSourcePos: { x: 50, y: 80 },
      currentTargetPos: { x: 300, y: 20 },
    });

    expect(sections1[0]?.start).toEqual({ x: 270, y: 110 });
    expect(sections2[0]?.start).toEqual({ x: 270, y: 140 });
    // 30px distance between parallel edges is preserved!
    expect(sections2[0]!.start.y - sections1[0]!.start.y).toBe(30);
  });

  it('shifts entire self-reference loop when self-referencing node moves', () => {
    const selfRel: LayoutRelation = {
      id: 'rel:self',
      kind: 'association',
      sourceNodeId: 'node:Order',
      targetNodeId: 'node:Order',
      semanticIds: ['ref:Order.parent'],
      sections: [
        {
          start: { x: 230, y: 70 },
          bendPoints: [
            { x: 260, y: 70 },
            { x: 260, y: 10 },
            { x: 120, y: 10 },
          ],
          end: { x: 120, y: 20 },
        },
      ],
    };

    const moved = computeDynamicEdgeSections({
      relation: selfRel,
      sourceNode,
      targetNode: sourceNode,
      currentSourcePos: { x: 60, y: 50 }, // dx=50, dy=30
      currentTargetPos: { x: 60, y: 50 },
    });

    expect(moved[0]?.start).toEqual({ x: 280, y: 100 });
    expect(moved[0]?.end).toEqual({ x: 170, y: 50 });
    expect(moved[0]?.bendPoints).toEqual([
      { x: 310, y: 100 },
      { x: 310, y: 40 },
      { x: 170, y: 40 },
    ]);
  });

  it('computes clean orthogonal bend points for moved edges', () => {
    const bendPoints = computeOrthogonalBendPoints(
      { x: 230, y: 70 },
      'right',
      { x: 400, y: 150 },
      'left',
    );

    // Should create a 2-bend orthogonal step
    expect(bendPoints).toHaveLength(2);
    expect(bendPoints[0]?.y).toBe(70);
    expect(bendPoints[1]?.y).toBe(150);
    expect(bendPoints[0]?.x).toBe(bendPoints[1]?.x);
  });
});
