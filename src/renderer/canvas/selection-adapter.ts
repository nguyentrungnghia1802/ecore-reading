import type { DiagramRow } from '../../diagram/model';
import type { LayoutNode, LayoutRelation } from '../../layout/model';

export interface SemanticSelection {
  kind: 'node' | 'row' | 'relation';
  semanticIds: string[];
  primarySemanticId: string;
}

export function selectionForSemanticIds(
  kind: SemanticSelection['kind'],
  semanticIds: readonly string[],
): SemanticSelection {
  const [primarySemanticId] = semanticIds;
  if (primarySemanticId === undefined) {
    throw new Error(`Cannot select a ${kind} without a semantic identity`);
  }
  return {
    kind,
    semanticIds: [...semanticIds],
    primarySemanticId,
  };
}

export function selectionForNode(node: LayoutNode): SemanticSelection {
  return selectionForSemanticIds('node', [node.semanticId]);
}

export function selectionForRow(row: DiagramRow): SemanticSelection {
  return selectionForSemanticIds('row', [row.semanticId]);
}

export function selectionForEdge(relation: LayoutRelation): SemanticSelection {
  return selectionForSemanticIds('relation', relation.semanticIds);
}
