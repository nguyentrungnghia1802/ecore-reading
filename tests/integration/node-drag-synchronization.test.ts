import { describe, expect, it } from 'vitest';
import {
  edgeEndLabels,
  edgeMarkerShapes,
  sectionsToSvgPath,
} from '../../src/diagram/notation';
import type { LayoutModel, LayoutRelation } from '../../src/layout/model';
import { toReactFlowElements } from '../../src/renderer/canvas/react-flow-adapter';
import { computeDynamicEdgeSections } from '../../src/renderer/edges/edge-geometry';

const regressionLayout: LayoutModel = {
  nodes: [
    {
      id: 'node:Order',
      semanticId: 'class:Order',
      kind: 'class',
      title: 'Order',
      rows: [
        { id: 'row:id', semanticId: 'attr:Order.id', kind: 'attribute', primaryText: 'id : ELong' },
      ],
      badges: [],
      position: { x: 10, y: 20 },
      size: { width: 220, height: 100 },
      text: {
        title: { fullText: 'Order', displayText: 'Order', truncated: false },
        rows: [
          { rowId: 'row:id', primary: { fullText: 'id : ELong', displayText: 'id : ELong', truncated: false } },
        ],
      },
    },
    {
      id: 'node:Item',
      semanticId: 'class:Item',
      kind: 'class',
      title: 'Item',
      rows: [
        { id: 'row:sku', semanticId: 'attr:Item.sku', kind: 'attribute', primaryText: 'sku : EString' },
      ],
      badges: [],
      position: { x: 300, y: 20 },
      size: { width: 220, height: 100 },
      text: {
        title: { fullText: 'Item', displayText: 'Item', truncated: false },
        rows: [
          { rowId: 'row:sku', primary: { fullText: 'sku : EString', displayText: 'sku : EString', truncated: false } },
        ],
      },
    },
    {
      id: 'node:Unrelated',
      semanticId: 'class:Unrelated',
      kind: 'class',
      title: 'Unrelated',
      rows: [],
      badges: [],
      position: { x: 600, y: 300 },
      size: { width: 220, height: 60 },
      text: {
        title: { fullText: 'Unrelated', displayText: 'Unrelated', truncated: false },
        rows: [],
      },
    },
  ],
  relations: [
    {
      id: 'rel:composition',
      kind: 'composition',
      sourceNodeId: 'node:Order',
      targetNodeId: 'node:Item',
      semanticIds: ['ref:Order.items'],
      sourceEnd: { classifierId: 'class:Order', roleName: 'order', navigable: false },
      targetEnd: { classifierId: 'class:Item', roleName: 'items', navigable: true },
      sections: [
        {
          start: { x: 230, y: 70 },
          bendPoints: [{ x: 265, y: 70 }, { x: 265, y: 70 }],
          end: { x: 300, y: 70 },
        },
      ],
    },
    {
      id: 'rel:parallel-ref',
      kind: 'association',
      sourceNodeId: 'node:Order',
      targetNodeId: 'node:Item',
      semanticIds: ['ref:Order.primaryItem'],
      sourceEnd: { classifierId: 'class:Order', roleName: 'order', navigable: false },
      targetEnd: { classifierId: 'class:Item', roleName: 'primaryItem', navigable: true },
      sections: [
        {
          start: { x: 230, y: 95 },
          bendPoints: [{ x: 265, y: 95 }, { x: 265, y: 95 }],
          end: { x: 300, y: 95 },
        },
      ],
    },
  ],
  bounds: { x: 0, y: 0, width: 820, height: 360 },
  profileId: 'hierarchy-right',
};

describe('Regression test: node drag to edge synchronization pipeline', () => {
  it('render → drag node → verify new node position → verify edge path/endpoints change accordingly', () => {
    // 1. Initial render from layout
    const elements = toReactFlowElements(regressionLayout, { selection: null });
    expect(elements.nodes).toHaveLength(3);
    expect(elements.edges).toHaveLength(2);

    const compEdge = elements.edges.find((e) => e.id === 'rel:composition');
    expect(compEdge).toBeDefined();
    const edgeData = compEdge?.data;
    const srcNode = edgeData?.sourceNode;
    const tgtNode = edgeData?.targetNode;
    if (!edgeData || !srcNode || !tgtNode) return;

    // Check initial edge geometry from ELK
    const initialSections = edgeData.relation.sections;
    const initialPath = sectionsToSvgPath(initialSections);
    expect(initialPath).toContain('M 230 70');
    expect(initialPath).toContain('300 70');

    // Check initial composition diamond marker at (230, 70)
    const initialMarkers = edgeMarkerShapes(edgeData.relation);
    const initialDiamond = initialMarkers.find((m) => m.marker === 'uml-filled-diamond');
    expect(initialDiamond).toBeDefined();
    expect(initialDiamond?.points[0]).toEqual({ x: 230, y: 70 });

    // 2. Simulate dragging Order node by (+120, +80) -> new position (130, 100)
    const currentOrderPos = { x: 10 + 120, y: 20 + 80 };
    const currentItemPos = { x: 300, y: 20 }; // unchanged

    const updatedSections = computeDynamicEdgeSections({
      relation: edgeData.relation,
      sourceNode: srcNode,
      targetNode: tgtNode,
      currentSourcePos: currentOrderPos,
      currentTargetPos: currentItemPos,
    });

    // Verify new start endpoint followed the dragged node in real-time
    // Original start was (230, 70). New start must be (230+120, 70+80) = (350, 150)
    expect(updatedSections[0]?.start).toEqual({ x: 350, y: 150 });
    // Target endpoint remained anchored at Item (300, 70)
    expect(updatedSections[0]?.end).toEqual({ x: 300, y: 70 });

    // Verify edge path string changed accordingly
    const updatedPath = sectionsToSvgPath(updatedSections);
    expect(updatedPath).not.toBe(initialPath);
    expect(updatedPath).toContain('M 350 150');
    expect(updatedPath).toContain('300 70');

    // Verify diamond marker updated and sticks to the new start endpoint (350, 150)
    const updatedMarkers = edgeMarkerShapes({
      ...edgeData.relation,
      sections: updatedSections,
    });
    const updatedDiamond = updatedMarkers.find((m) => m.marker === 'uml-filled-diamond');
    expect(updatedDiamond).toBeDefined();
    expect(updatedDiamond?.points[0]).toEqual({ x: 350, y: 150 });

    // Verify navigable arrow marker at target remained anchored at (300, 70)
    const updatedArrow = updatedMarkers.find((m) => m.marker === 'uml-navigable-arrow');
    expect(updatedArrow).toBeDefined();
    expect(updatedArrow?.points[0]).toEqual({ x: 300, y: 70 });

    // Verify edge end labels updated relative to the new endpoints
    const updatedLabels = edgeEndLabels({
      ...edgeData.relation,
      sections: updatedSections,
    });
    expect(updatedLabels).toHaveLength(2);
    // Source label (near Order) moved significantly compared to initial
    const initialLabels = edgeEndLabels(edgeData.relation);
    const sourceLabelInitial = initialLabels.find((l) => l.end === 'source');
    const sourceLabelUpdated = updatedLabels.find((l) => l.end === 'source');
    expect(Math.abs(sourceLabelUpdated!.point.x - sourceLabelInitial!.point.x)).toBeGreaterThan(50);
  });

  it('preserves parallel edge spacing without collapsing when connected node moves', () => {
    const elements = toReactFlowElements(regressionLayout, { selection: null });
    const edge1 = elements.edges.find((e) => e.id === 'rel:composition');
    const edge2 = elements.edges.find((e) => e.id === 'rel:parallel-ref');
    if (!edge1?.data?.sourceNode || !edge1.data.targetNode) return;
    if (!edge2?.data?.sourceNode || !edge2.data.targetNode) return;

    // Move source node Order by (-50, +40)
    const currentOrderPos = { x: 10 - 50, y: 20 + 40 };
    const currentItemPos = { x: 300, y: 20 };

    const sections1 = computeDynamicEdgeSections({
      relation: edge1.data.relation,
      sourceNode: edge1.data.sourceNode,
      targetNode: edge1.data.targetNode,
      currentSourcePos: currentOrderPos,
      currentTargetPos: currentItemPos,
    });
    const sections2 = computeDynamicEdgeSections({
      relation: edge2.data.relation,
      sourceNode: edge2.data.sourceNode,
      targetNode: edge2.data.targetNode,
      currentSourcePos: currentOrderPos,
      currentTargetPos: currentItemPos,
    });

    // Start endpoints both moved by (-50, +40)
    expect(sections1[0]?.start).toEqual({ x: 230 - 50, y: 70 + 40 }); // (180, 110)
    expect(sections2[0]?.start).toEqual({ x: 230 - 50, y: 95 + 40 }); // (180, 135)

    // Parallel edge vertical distance remains exactly 25px (135 - 110)
    expect(sections2[0]!.start.y - sections1[0]!.start.y).toBe(25);
  });

  it('maintains generalization triangle at target end when sub-class is dragged', () => {
    const genLayout: LayoutRelation = {
      id: 'rel:inheritance',
      kind: 'generalization',
      sourceNodeId: 'node:Child',
      targetNodeId: 'node:Parent',
      semanticIds: ['class:Child', 'class:Parent'],
      sections: [{ start: { x: 100, y: 200 }, bendPoints: [], end: { x: 100, y: 80 } }],
    };

    const childNode = { position: { x: 50, y: 200 }, size: { width: 100, height: 60 } };
    const parentNode = { position: { x: 50, y: 20 }, size: { width: 100, height: 60 } };

    // Drag Child to the right by 150px
    const dynamicSections = computeDynamicEdgeSections({
      relation: genLayout,
      sourceNode: childNode,
      targetNode: parentNode,
      currentSourcePos: { x: 200, y: 200 },
      currentTargetPos: { x: 50, y: 20 },
    });

    expect(dynamicSections[0]?.start).toEqual({ x: 250, y: 200 });
    expect(dynamicSections[0]?.end).toEqual({ x: 100, y: 80 });

    const markers = edgeMarkerShapes({ ...genLayout, sections: dynamicSections });
    const triangle = markers.find((m) => m.marker === 'uml-hollow-triangle');
    expect(triangle).toBeDefined();
    // Triangle tip remains firmly anchored at super-class bottom (100, 80)
    expect(triangle?.points[0]).toEqual({ x: 100, y: 80 });
  });

  it('restores exact original ELK layout geometry when manual drag is reset', () => {
    const elements = toReactFlowElements(regressionLayout, { selection: null });
    const compEdge = elements.edges.find((e) => e.id === 'rel:composition');
    if (!compEdge?.data?.sourceNode || !compEdge.data.targetNode) return;

    // After reset, current positions match original positions
    const restoredSections = computeDynamicEdgeSections({
      relation: compEdge.data.relation,
      sourceNode: compEdge.data.sourceNode,
      targetNode: compEdge.data.targetNode,
      currentSourcePos: compEdge.data.sourceNode.position,
      currentTargetPos: compEdge.data.targetNode.position,
    });

    expect(restoredSections).toEqual(regressionLayout.relations[0]?.sections);
    expect(sectionsToSvgPath(restoredSections)).toBe(
      sectionsToSvgPath(regressionLayout.relations[0]!.sections),
    );
  });
});
