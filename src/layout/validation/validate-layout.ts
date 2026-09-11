import type { SizedDiagram } from '../../diagram/sizing';
import type { Diagnostic } from '../../ecore/model';
import type { LayoutModel, Point } from '../model';

function finitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function validateLayoutModel(
  layout: LayoutModel,
  input: SizedDiagram,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const inputNodes = new Map(input.nodes.map((node) => [node.id, node]));
  const inputRelations = new Map(input.relations.map((relation) => [relation.id, relation]));
  const seenNodes = new Set<string>();
  const seenRelations = new Set<string>();
  const add = (code: string, id: string, message: string): void => {
    diagnostics.push({ id: `${code}:${id}`, code, severity: 'error', message });
  };

  for (const node of layout.nodes) {
    if (seenNodes.has(node.id)) add('LAYOUT_DUPLICATE_NODE', node.id, `Layout node "${node.id}" is duplicated.`);
    seenNodes.add(node.id);
    if (!inputNodes.has(node.id)) add('LAYOUT_UNKNOWN_NODE', node.id, `Layout returned unknown node "${node.id}".`);
    if (!finitePoint(node.position) || !Number.isFinite(node.size.width) || !Number.isFinite(node.size.height)) {
      add('LAYOUT_NON_FINITE_GEOMETRY', node.id, `Layout node "${node.id}" has non-finite geometry.`);
    } else if (node.size.width <= 0 || node.size.height <= 0) {
      add('LAYOUT_INVALID_SIZE', node.id, `Layout node "${node.id}" has a non-positive size.`);
    }
  }
  for (const expectedId of inputNodes.keys()) {
    if (!seenNodes.has(expectedId)) add('LAYOUT_MISSING_NODE', expectedId, `Layout lost node "${expectedId}".`);
  }

  for (const relation of layout.relations) {
    if (seenRelations.has(relation.id)) add('LAYOUT_DUPLICATE_RELATION', relation.id, `Layout relation "${relation.id}" is duplicated.`);
    seenRelations.add(relation.id);
    const expected = inputRelations.get(relation.id);
    if (expected === undefined) {
      add('LAYOUT_UNKNOWN_RELATION', relation.id, `Layout returned unknown relation "${relation.id}".`);
    } else if (
      relation.sourceNodeId !== expected.sourceNodeId ||
      relation.targetNodeId !== expected.targetNodeId
    ) {
      add('LAYOUT_ENDPOINT_MISMATCH', relation.id, `Layout changed endpoints for relation "${relation.id}".`);
    }
    for (const section of relation.sections) {
      if (
        !finitePoint(section.start) ||
        !finitePoint(section.end) ||
        section.bendPoints.some((point) => !finitePoint(point))
      ) {
        add('LAYOUT_NON_FINITE_ROUTE', relation.id, `Layout relation "${relation.id}" has a non-finite route.`);
      }
    }
  }
  for (const expectedId of inputRelations.keys()) {
    if (!seenRelations.has(expectedId)) add('LAYOUT_MISSING_RELATION', expectedId, `Layout lost relation "${expectedId}".`);
  }
  if (
    !finitePoint(layout.bounds) ||
    !Number.isFinite(layout.bounds.width) ||
    !Number.isFinite(layout.bounds.height)
  ) {
    add('LAYOUT_NON_FINITE_BOUNDS', layout.profileId, 'Layout bounds are not finite.');
  }
  return diagnostics;
}
