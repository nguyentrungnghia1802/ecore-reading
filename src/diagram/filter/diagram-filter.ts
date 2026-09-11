import type { DiagramModel, DiagramNodeKind, DiagramRelationKind } from '../model';

export interface DiagramFilterOptions {
  nodes: {
    classes: boolean;
    enums: boolean;
    datatypes: boolean;
    externals: boolean;
  };
  relations: {
    inheritance: boolean;
    containment: boolean;
    references: boolean;
    externals: boolean;
  };
}

export const DEFAULT_DIAGRAM_FILTER: DiagramFilterOptions = {
  nodes: {
    classes: true,
    enums: true,
    datatypes: true,
    externals: true,
  },
  relations: {
    inheritance: true,
    containment: true,
    references: true,
    externals: true,
  },
};

export function isDefaultFilter(filters: DiagramFilterOptions): boolean {
  return (
    filters.nodes.classes &&
    filters.nodes.enums &&
    filters.nodes.datatypes &&
    filters.nodes.externals &&
    filters.relations.inheritance &&
    filters.relations.containment &&
    filters.relations.references &&
    filters.relations.externals
  );
}

export function activeFilterCount(filters: DiagramFilterOptions): number {
  let count = 0;
  if (!filters.nodes.classes) count++;
  if (!filters.nodes.enums) count++;
  if (!filters.nodes.datatypes) count++;
  if (!filters.nodes.externals) count++;
  if (!filters.relations.inheritance) count++;
  if (!filters.relations.containment) count++;
  if (!filters.relations.references) count++;
  if (!filters.relations.externals) count++;
  return count;
}

/**
 * Checks if a relation kind is permitted by the filter options.
 */
export function isRelationKindEnabled(
  kind: DiagramRelationKind,
  filters: DiagramFilterOptions,
): boolean {
  switch (kind) {
    case 'generalization':
      return filters.relations.inheritance;
    case 'composition':
      return filters.relations.containment;
    case 'association':
      return filters.relations.references;
    case 'external-reference':
      return filters.relations.externals;
  }
}

/**
 * Checks if a node kind is permitted by the filter options.
 */
export function isNodeKindEnabled(
  kind: DiagramNodeKind,
  filters: DiagramFilterOptions,
): boolean {
  switch (kind) {
    case 'class':
      return filters.nodes.classes;
    case 'enum':
      return filters.nodes.enums;
    case 'datatype':
      return filters.nodes.datatypes;
    case 'external':
      return filters.nodes.externals;
  }
}

/**
 * Pure function that applies node and relation filters to a DiagramModel.
 *
 * Guarantees:
 * - Applied at DiagramModel derivation boundary (before sizing and layout).
 * - Guaranteed NO dangling edges: any relation whose source or target node is filtered out is also omitted.
 * - Bidirectional composition (merged eOpposite containment) is controlled strictly by `containment`.
 */
export function applyDiagramFilters(
  diagram: DiagramModel,
  filters: DiagramFilterOptions,
): DiagramModel {
  if (isDefaultFilter(filters)) {
    return diagram;
  }

  // 1. Filter nodes
  const filteredNodes = diagram.nodes.filter((node) => isNodeKindEnabled(node.kind, filters));
  const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

  // 2. Filter relations (kind must be enabled AND both endpoints must be visible)
  const filteredRelations = diagram.relations.filter((rel) => {
    if (!isRelationKindEnabled(rel.kind, filters)) {
      return false;
    }
    return visibleNodeIds.has(rel.sourceNodeId) && visibleNodeIds.has(rel.targetNodeId);
  });

  return {
    ...diagram,
    nodes: filteredNodes,
    relations: filteredRelations,
  };
}
