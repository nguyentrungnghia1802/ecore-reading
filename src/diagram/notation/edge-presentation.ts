import type { AssociationEnd } from '../model';
import type { LayoutRelation, LayoutSection, Point } from '../../layout/model';

export type EdgeMarker =
  | 'uml-hollow-triangle'
  | 'uml-filled-diamond'
  | 'uml-navigable-arrow';

export interface EdgePresentation {
  markerStart: EdgeMarker | undefined;
  markerEnd: EdgeMarker | undefined;
  dash: string | undefined;
}

export interface EdgeMarkerShape {
  end: 'source' | 'target';
  marker: EdgeMarker;
  points: Point[];
}

export interface EdgeEndLabel {
  end: 'source' | 'target';
  point: Point;
  text: string;
}

function pointCommand(command: 'M' | 'L', point: Point): string {
  return `${command} ${point.x} ${point.y}`;
}

function firstRoutePoint(sections: readonly LayoutSection[]): { endpoint: Point; neighbor: Point } | null {
  const section = sections[0];
  if (section === undefined) return null;
  return {
    endpoint: section.start,
    neighbor: section.bendPoints[0] ?? section.end,
  };
}

function lastRoutePoint(sections: readonly LayoutSection[]): { endpoint: Point; neighbor: Point } | null {
  const section = sections.at(-1);
  if (section === undefined) return null;
  return {
    endpoint: section.end,
    neighbor: section.bendPoints.at(-1) ?? section.start,
  };
}

function unitVector(from: Point, to: Point): Point {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 1, y: 0 } : { x: x / length, y: y / length };
}

function triangle(point: Point, towardEndpoint: Point): Point[] {
  const base = {
    x: point.x - towardEndpoint.x * 12,
    y: point.y - towardEndpoint.y * 12,
  };
  const perpendicular = { x: -towardEndpoint.y * 7, y: towardEndpoint.x * 7 };
  return [
    { ...point },
    { x: base.x + perpendicular.x, y: base.y + perpendicular.y },
    { x: base.x - perpendicular.x, y: base.y - perpendicular.y },
  ];
}

function diamond(point: Point, routeDirection: Point): Point[] {
  const middle = { x: point.x + routeDirection.x * 8, y: point.y + routeDirection.y * 8 };
  const far = { x: point.x + routeDirection.x * 16, y: point.y + routeDirection.y * 16 };
  const perpendicular = { x: -routeDirection.y * 6, y: routeDirection.x * 6 };
  return [
    { ...point },
    { x: middle.x + perpendicular.x, y: middle.y + perpendicular.y },
    far,
    { x: middle.x - perpendicular.x, y: middle.y - perpendicular.y },
  ];
}

function markerShape(
  marker: EdgeMarker,
  end: 'source' | 'target',
  routePoint: { endpoint: Point; neighbor: Point },
): EdgeMarkerShape {
  const towardEndpoint = unitVector(routePoint.neighbor, routePoint.endpoint);
  return {
    end,
    marker,
    points: marker === 'uml-filled-diamond'
      ? diamond(routePoint.endpoint, { x: -towardEndpoint.x, y: -towardEndpoint.y })
      : triangle(routePoint.endpoint, towardEndpoint),
  };
}

export function sectionsToSvgPath(sections: readonly LayoutSection[]): string {
  return sections.map((section) => [
    pointCommand('M', section.start),
    ...section.bendPoints.map((point) => pointCommand('L', point)),
    pointCommand('L', section.end),
  ].join(' ')).join(' ');
}

export function edgePresentation(relation: Pick<LayoutRelation, 'kind' | 'sourceEnd' | 'targetEnd'>): EdgePresentation {
  if (relation.kind === 'generalization') {
    return {
      markerStart: undefined,
      markerEnd: 'uml-hollow-triangle',
      dash: undefined,
    };
  }

  return {
    markerStart: relation.kind === 'composition'
      ? 'uml-filled-diamond'
      : relation.sourceEnd?.navigable === true
        ? 'uml-navigable-arrow'
        : undefined,
    markerEnd: relation.targetEnd?.navigable === true
      ? 'uml-navigable-arrow'
      : undefined,
    dash: relation.kind === 'external-reference' ? '8 5' : undefined,
  };
}

export function formatMultiplicity(end: AssociationEnd | undefined): string | undefined {
  const multiplicity = end?.multiplicity;
  if (multiplicity === undefined) return undefined;

  const upper = multiplicity.upper === 'unbounded' ? '*' : String(multiplicity.upper);
  return multiplicity.lower === multiplicity.upper
    ? String(multiplicity.lower)
    : `${multiplicity.lower}..${upper}`;
}

export function formatAssociationEnd(end: AssociationEnd | undefined): string | undefined {
  const parts = [end?.roleName, formatMultiplicity(end)].filter(
    (part): part is string => part !== undefined && part.length > 0,
  );
  return parts.length === 0 ? undefined : parts.join(' ');
}

export function edgeAccessibleLabel(relation: Pick<LayoutRelation, 'kind' | 'sourceEnd' | 'targetEnd'>): string {
  const endLabels = [
    formatAssociationEnd(relation.sourceEnd),
    formatAssociationEnd(relation.targetEnd),
  ].filter((label): label is string => label !== undefined);

  return [relation.kind, ...endLabels].join(', ');
}

export function edgeMarkerShapes(relation: LayoutRelation): EdgeMarkerShape[] {
  const presentation = edgePresentation(relation);
  const source = firstRoutePoint(relation.sections);
  const target = lastRoutePoint(relation.sections);
  return [
    ...(presentation.markerStart === undefined || source === null
      ? []
      : [markerShape(presentation.markerStart, 'source', source)]),
    ...(presentation.markerEnd === undefined || target === null
      ? []
      : [markerShape(presentation.markerEnd, 'target', target)]),
  ];
}

function stableLabelLane(relationId: string): number {
  let hash = 2166136261;
  for (const character of relationId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return [-2, -1, 1, 2][(hash >>> 0) % 4] ?? 1;
}

function labelPoint(
  routePoint: { endpoint: Point; neighbor: Point },
  lane: number,
): Point {
  const inward = unitVector(routePoint.endpoint, routePoint.neighbor);
  const perpendicular = { x: -inward.y, y: inward.x };
  return {
    x: routePoint.endpoint.x + inward.x * (28 + lane * 4) + perpendicular.x * (18 + lane * 12),
    y: routePoint.endpoint.y + inward.y * (28 + lane * 4) + perpendicular.y * (18 + lane * 12),
  };
}

export function edgeEndLabels(relation: LayoutRelation): EdgeEndLabel[] {
  const source = firstRoutePoint(relation.sections);
  const target = lastRoutePoint(relation.sections);
  const sourceText = formatAssociationEnd(relation.sourceEnd);
  const targetText = formatAssociationEnd(relation.targetEnd);
  const lane = stableLabelLane(relation.id);
  return [
    ...(source === null || sourceText === undefined
      ? []
      : [{ end: 'source' as const, point: labelPoint(source, lane), text: sourceText }]),
    ...(target === null || targetText === undefined
      ? []
      : [{ end: 'target' as const, point: labelPoint(target, lane), text: targetText }]),
  ];
}

export function pointsToSvg(points: readonly Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
