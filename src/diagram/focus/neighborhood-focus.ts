import type { DiagramModel, DiagramRelation, DiagramRelationKind } from '../model';

export type FocusDepth = 1 | 2 | 3 | 'all';

export interface FocusOptions {
  depth: FocusDepth;
  enabledRelationKinds?: ReadonlySet<DiagramRelationKind>;
}

export interface FocusResult {
  rootNodeId: string;
  rootSemanticId: string;
  depth: FocusDepth;
  includedNodeIds: Set<string>;
  includedRelationIds: Set<string>;
  distances: Map<string, number>;
}

/**
 * Traverses diagram relations to find nodes within the specified semantic neighborhood distance.
 *
 * Traversal rules:
 * - Traversal is based on pure semantic graph distance, never visual or layout coordinates.
 * - Both outgoing and incoming edges are traversed (associations and inheritances represent bidirectional semantic neighborhood).
 * - Cycles are protected against by maintaining a shortest-distance visited map.
 * - External placeholder nodes are first-class diagram nodes and count as exactly 1 hop. Traversal stops at external nodes if they have no other connections.
 * - Multiple paths are handled correctly by maintaining the shortest distance to each node.
 * - Filtered relations (if enabledRelationKinds is specified) are not traversed and not included.
 */
export function computeNeighborhoodFocus(
  diagram: DiagramModel,
  rootIdentifier: string,
  options: FocusOptions,
): FocusResult {
  const rootNode = diagram.nodes.find(
    (n) => n.id === rootIdentifier || n.semanticId === rootIdentifier,
  );

  if (!rootNode) {
    return {
      rootNodeId: rootIdentifier,
      rootSemanticId: rootIdentifier,
      depth: options.depth,
      includedNodeIds: new Set<string>(),
      includedRelationIds: new Set<string>(),
      distances: new Map<string, number>(),
    };
  }

  const maxDepth = options.depth === 'all' ? Number.POSITIVE_INFINITY : options.depth;
  const enabledKinds = options.enabledRelationKinds;

  // Build adjacency map: nodeId -> array of { neighborId, relationId }
  const adjacency = new Map<string, Array<{ neighborId: string; relation: DiagramRelation }>>();
  for (const node of diagram.nodes) {
    adjacency.set(node.id, []);
  }

  for (const rel of diagram.relations) {
    if (enabledKinds && !enabledKinds.has(rel.kind)) {
      continue;
    }
    const sourceList = adjacency.get(rel.sourceNodeId);
    if (sourceList) {
      sourceList.push({ neighborId: rel.targetNodeId, relation: rel });
    }
    const targetList = adjacency.get(rel.targetNodeId);
    if (targetList) {
      targetList.push({ neighborId: rel.sourceNodeId, relation: rel });
    }
  }

  // BFS traversal with shortest-distance recording
  const distances = new Map<string, number>();
  distances.set(rootNode.id, 0);

  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: rootNode.id, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.distance >= maxDepth) {
      continue;
    }

    const neighbors = adjacency.get(current.nodeId) ?? [];
    for (const { neighborId } of neighbors) {
      const existingDist = distances.get(neighborId);
      const newDist = current.distance + 1;

      if (existingDist === undefined || newDist < existingDist) {
        distances.set(neighborId, newDist);
        if (newDist < maxDepth) {
          queue.push({ nodeId: neighborId, distance: newDist });
        }
      }
    }
  }

  const includedNodeIds = new Set<string>(distances.keys());

  // An edge is included if both endpoints are in the included node set and its kind is enabled
  const includedRelationIds = new Set<string>();
  for (const rel of diagram.relations) {
    if (enabledKinds && !enabledKinds.has(rel.kind)) {
      continue;
    }
    if (includedNodeIds.has(rel.sourceNodeId) && includedNodeIds.has(rel.targetNodeId)) {
      includedRelationIds.add(rel.id);
    }
  }

  return {
    rootNodeId: rootNode.id,
    rootSemanticId: rootNode.semanticId,
    depth: options.depth,
    includedNodeIds,
    includedRelationIds,
    distances,
  };
}

/**
 * Derives a focused DiagramModel containing only the nodes and relations included by the focus result.
 */
export function applyNeighborhoodFocus(
  diagram: DiagramModel,
  focus: FocusResult | null,
): DiagramModel {
  if (!focus || focus.includedNodeIds.size === 0) {
    return diagram;
  }

  return {
    ...diagram,
    nodes: diagram.nodes.filter((n) => focus.includedNodeIds.has(n.id)),
    relations: diagram.relations.filter((r) => focus.includedRelationIds.has(r.id)),
  };
}
