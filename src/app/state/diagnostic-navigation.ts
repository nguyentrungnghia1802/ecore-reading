import type { Diagnostic, EcoreModel } from '../../ecore/model';
import type { LayoutModel } from '../../layout/model';
import { selectionForSemanticIds, type SemanticSelection } from '../../renderer';

export interface DiagnosticNavigation {
  selection: SemanticSelection | null;
  highlightedNodeIds: string[];
  highlightedRelationIds: string[];
  focusNodeIds: string[];
}

export function resolveDiagnosticNavigation(
  diagnostic: Diagnostic,
  model: EcoreModel,
  layout: LayoutModel,
): DiagnosticNavigation {
  const primaryId = diagnostic.sourceElementId ?? diagnostic.semanticId;
  const ids = [primaryId, ...(diagnostic.relatedElementIds ?? [])]
    .filter((id): id is string => id !== undefined);
  const relationIds = new Set<string>();
  const nodeIds = new Set<string>();
  const focusIds = new Set<string>();
  let selection: SemanticSelection | null = null;

  for (const id of ids) {
    const relations = layout.relations.filter((relation) => relation.semanticIds.includes(id));
    for (const relation of relations) {
      relationIds.add(relation.id);
      nodeIds.add(relation.sourceNodeId);
      nodeIds.add(relation.targetNodeId);
      focusIds.add(relation.sourceNodeId);
      focusIds.add(relation.targetNodeId);
    }
    if (selection === null && relations[0] !== undefined) {
      selection = selectionForSemanticIds('relation', relations[0].semanticIds);
    }

    const directNode = layout.nodes.find((node) => node.semanticId === id);
    const rowNode = layout.nodes.find((node) => node.rows.some((row) => row.semanticId === id));
    const feature = model.featureById.get(id);
    const ownerId = feature?.ownerClassId
      ?? model.operationById.get(id)?.ownerClassId
      ?? model.parameterById.get(id)?.ownerOperationId;
    const ownerNode = layout.nodes.find((node) => node.semanticId === ownerId);
    const node = directNode ?? rowNode ?? ownerNode;
    if (node !== undefined) {
      nodeIds.add(node.id);
      focusIds.add(node.id);
      if (selection === null) {
        selection = selectionForSemanticIds(rowNode !== undefined && rowNode === node ? 'row' : 'node', [rowNode !== undefined && rowNode === node ? id : node.semanticId]);
      }
    }
  }
  return {
    selection,
    highlightedNodeIds: [...nodeIds],
    highlightedRelationIds: [...relationIds],
    focusNodeIds: [...focusIds],
  };
}
