import type { LayoutRelation, LayoutSection, Point, Size } from '../../layout/model';

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * Determines which side (border) of a node a given endpoint belongs to.
 */
export function determinePortSide(nodePos: Point, nodeSize: Size, point: Point): PortSide {
  const right = nodePos.x + nodeSize.width;
  const bottom = nodePos.y + nodeSize.height;

  const dLeft = Math.abs(point.x - nodePos.x);
  const dRight = Math.abs(point.x - right);
  const dTop = Math.abs(point.y - nodePos.y);
  const dBottom = Math.abs(point.y - bottom);

  const minDistance = Math.min(dLeft, dRight, dTop, dBottom);
  if (minDistance === dRight) return 'right';
  if (minDistance === dLeft) return 'left';
  if (minDistance === dTop) return 'top';
  return 'bottom';
}

/**
 * Computes deterministic orthogonal intermediate bend points connecting two endpoints.
 */
export function computeOrthogonalBendPoints(
  start: Point,
  sourceSide: PortSide,
  end: Point,
  targetSide: PortSide,
): Point[] {
  // Case 1: Horizontal source to horizontal target (e.g. right -> left)
  if ((sourceSide === 'left' || sourceSide === 'right') && (targetSide === 'left' || targetSide === 'right')) {
    if (sourceSide === 'right' && targetSide === 'left') {
      if (start.x < end.x) {
        const midX = (start.x + end.x) / 2;
        return [
          { x: midX, y: start.y },
          { x: midX, y: end.y },
        ];
      }
      // Source dragged to the right of target: route around
      const midY =
        Math.abs(start.y - end.y) < 40
          ? Math.min(start.y, end.y) - 40
          : (start.y + end.y) / 2;
      return [
        { x: start.x + 24, y: start.y },
        { x: start.x + 24, y: midY },
        { x: end.x - 24, y: midY },
        { x: end.x - 24, y: end.y },
      ];
    }

    if (sourceSide === 'left' && targetSide === 'right') {
      if (start.x > end.x) {
        const midX = (start.x + end.x) / 2;
        return [
          { x: midX, y: start.y },
          { x: midX, y: end.y },
        ];
      }
      const midY =
        Math.abs(start.y - end.y) < 40
          ? Math.min(start.y, end.y) - 40
          : (start.y + end.y) / 2;
      return [
        { x: start.x - 24, y: start.y },
        { x: start.x - 24, y: midY },
        { x: end.x + 24, y: midY },
        { x: end.x + 24, y: end.y },
      ];
    }

    // Same horizontal side (e.g. right -> right or left -> left)
    const midX = sourceSide === 'right' ? Math.max(start.x, end.x) + 24 : Math.min(start.x, end.x) - 24;
    return [
      { x: midX, y: start.y },
      { x: midX, y: end.y },
    ];
  }

  // Case 2: Vertical source to vertical target (e.g. top -> bottom)
  if ((sourceSide === 'top' || sourceSide === 'bottom') && (targetSide === 'top' || targetSide === 'bottom')) {
    if (sourceSide === 'top' && targetSide === 'bottom') {
      if (start.y > end.y) {
        const midY = (start.y + end.y) / 2;
        return [
          { x: start.x, y: midY },
          { x: end.x, y: midY },
        ];
      }
      const midX =
        Math.abs(start.x - end.x) < 40
          ? Math.max(start.x, end.x) + 40
          : (start.x + end.x) / 2;
      return [
        { x: start.x, y: start.y - 24 },
        { x: midX, y: start.y - 24 },
        { x: midX, y: end.y + 24 },
        { x: end.x, y: end.y + 24 },
      ];
    }

    if (sourceSide === 'bottom' && targetSide === 'top') {
      if (start.y < end.y) {
        const midY = (start.y + end.y) / 2;
        return [
          { x: start.x, y: midY },
          { x: end.x, y: midY },
        ];
      }
      const midX =
        Math.abs(start.x - end.x) < 40
          ? Math.max(start.x, end.x) + 40
          : (start.x + end.x) / 2;
      return [
        { x: start.x, y: start.y + 24 },
        { x: midX, y: start.y + 24 },
        { x: midX, y: end.y - 24 },
        { x: end.x, y: end.y - 24 },
      ];
    }

    const midY = sourceSide === 'bottom' ? Math.max(start.y, end.y) + 24 : Math.min(start.y, end.y) - 24;
    return [
      { x: start.x, y: midY },
      { x: end.x, y: midY },
    ];
  }

  // Case 3: Mixed horizontal and vertical
  if (sourceSide === 'left' || sourceSide === 'right') {
    return [{ x: end.x, y: start.y }];
  }
  return [{ x: start.x, y: end.y }];
}

export interface DynamicEdgeParams {
  relation: LayoutRelation;
  sourceNode: { position: Point; size: Size };
  targetNode: { position: Point; size: Size };
  currentSourcePos: Point;
  currentTargetPos: Point;
}

/**
 * Computes dynamic edge sections reflecting current node positions in real-time.
 * If neither node has moved, retains the original precomputed ELK layout sections.
 */
export function computeDynamicEdgeSections({
  relation,
  sourceNode,
  targetNode,
  currentSourcePos,
  currentTargetPos,
}: DynamicEdgeParams): LayoutSection[] {
  const deltaSourceX = currentSourcePos.x - sourceNode.position.x;
  const deltaSourceY = currentSourcePos.y - sourceNode.position.y;
  const deltaTargetX = currentTargetPos.x - targetNode.position.x;
  const deltaTargetY = currentTargetPos.y - targetNode.position.y;

  // If neither node moved, preserve exact ELK sections
  if (deltaSourceX === 0 && deltaSourceY === 0 && deltaTargetX === 0 && deltaTargetY === 0) {
    return relation.sections;
  }

  const initialSection = relation.sections[0];
  if (initialSection === undefined) {
    return relation.sections;
  }

  // Self-reference: source and target are the same node
  if (relation.sourceNodeId === relation.targetNodeId) {
    return relation.sections.map((section) => ({
      start: { x: section.start.x + deltaSourceX, y: section.start.y + deltaSourceY },
      bendPoints: section.bendPoints.map((pt) => ({
        x: pt.x + deltaSourceX,
        y: pt.y + deltaSourceY,
      })),
      end: { x: section.end.x + deltaSourceX, y: section.end.y + deltaSourceY },
    }));
  }

  // Distinct nodes: compute start and end relative to their respective nodes
  const initialEnd = relation.sections.at(-1)?.end ?? initialSection.end;
  const currentStart: Point = {
    x: initialSection.start.x + deltaSourceX,
    y: initialSection.start.y + deltaSourceY,
  };
  const currentEnd: Point = {
    x: initialEnd.x + deltaTargetX,
    y: initialEnd.y + deltaTargetY,
  };

  const sourceSide = determinePortSide(sourceNode.position, sourceNode.size, initialSection.start);
  const targetSide = determinePortSide(targetNode.position, targetNode.size, initialEnd);

  const bendPoints = computeOrthogonalBendPoints(currentStart, sourceSide, currentEnd, targetSide);

  return [
    {
      start: currentStart,
      bendPoints,
      end: currentEnd,
    },
  ];
}
