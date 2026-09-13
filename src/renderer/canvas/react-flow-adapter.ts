import type { Edge, Node } from '@xyflow/react';
import type {
  DiagramBadge,
  DiagramNodeKind,
  DiagramRow,
  NodeTextLayout,
} from '../../diagram/model';
import { edgeAccessibleLabel } from '../../diagram/notation';
import type { LayoutModel, LayoutRelation, Point, Size } from '../../layout/model';
import { determinePortSide } from '../edges/edge-geometry';
import type { SemanticSelection } from './selection-adapter';

export type SelectionState = 'normal' | 'selected' | 'neighbor' | 'dimmed' | 'diagnostic';

export interface UmlNodeData extends Record<string, unknown> {
  semanticId: string;
  kind: DiagramNodeKind;
  title: string;
  stereotype?: string;
  rows: DiagramRow[];
  badges: DiagramBadge[];
  size: Size;
  text: NodeTextLayout;
  selectedState: SelectionState;
  onSelectRow?: (semanticId: string) => void;
}

export type UmlFlowNode = Node<UmlNodeData, DiagramNodeKind>;

export interface SemanticEdgeData extends Record<string, unknown> {
  semanticIds: string[];
  relation: LayoutRelation;
  selectedState: SelectionState;
  sourceNode?: { position: Point; size: Size };
  targetNode?: { position: Point; size: Size };
  onSelectEdge?: (semanticIds: string[]) => void;
}

export type SemanticFlowEdge = Edge<SemanticEdgeData, 'semantic'>;

export interface ReactFlowElements {
  nodes: UmlFlowNode[];
  edges: SemanticFlowEdge[];
}

export interface ReactFlowAdapterOptions {
  selection: SemanticSelection | null;
  highlightedNodeIds?: readonly string[] | undefined;
  highlightedRelationIds?: readonly string[] | undefined;
  onSelectRow?: (semanticId: string) => void;
  onSelectEdge?: (semanticIds: string[]) => void;
}

function intersects(values: readonly string[], selected: ReadonlySet<string>): boolean {
  return values.some((value) => selected.has(value));
}

function nodeSemanticIds(node: LayoutModel['nodes'][number]): string[] {
  return [
    node.semanticId,
    ...node.rows.map((row) => row.semanticId),
    ...node.badges.map((badge) => badge.semanticId),
  ];
}

function selectionStates(
  layout: LayoutModel,
  selection: SemanticSelection | null,
  highlightedNodeIds?: readonly string[],
  highlightedRelationIds?: readonly string[],
) {
  const diagNodeIds = new Set(highlightedNodeIds ?? []);
  const diagRelationIds = new Set(highlightedRelationIds ?? []);
  const hasDiagnosticHighlight = diagNodeIds.size > 0 || diagRelationIds.size > 0;

  const selected = new Set(selection?.semanticIds ?? []);
  const hasSelection = selection !== null;
  const selectedNodeIds = new Set(
    selection?.kind === 'relation'
      ? []
      : layout.nodes
        .filter((node) => intersects(nodeSemanticIds(node), selected))
        .map((node) => node.id),
  );
  const selectedRelationIds = new Set(
    selection?.kind === 'relation'
      ? layout.relations
        .filter((relation) => intersects(relation.semanticIds, selected))
        .map((relation) => relation.id)
      : [],
  );
  const neighborNodeIds = new Set<string>();

  for (const relation of layout.relations) {
    if (selectedRelationIds.has(relation.id)) {
      neighborNodeIds.add(relation.sourceNodeId);
      neighborNodeIds.add(relation.targetNodeId);
    }

    if (selectedNodeIds.has(relation.sourceNodeId)) {
      neighborNodeIds.add(relation.targetNodeId);
    }
    if (selectedNodeIds.has(relation.targetNodeId)) {
      neighborNodeIds.add(relation.sourceNodeId);
    }
  }

  return {
    hasSelection,
    neighborNodeIds,
    selectedNodeIds,
    selectedRelationIds,
    diagNodeIds,
    diagRelationIds,
    hasDiagnosticHighlight,
  };
}

export function toReactFlowElements(
  layout: LayoutModel,
  options: ReactFlowAdapterOptions,
): ReactFlowElements {
  const states = selectionStates(
    layout,
    options.selection,
    options.highlightedNodeIds,
    options.highlightedRelationIds,
  );

  const nodes = layout.nodes.map<UmlFlowNode>((node) => {
    const selectedState: SelectionState = states.diagNodeIds.has(node.id)
      ? 'diagnostic'
      : states.hasDiagnosticHighlight
        ? 'dimmed'
        : states.selectedNodeIds.has(node.id)
          ? 'selected'
          : states.neighborNodeIds.has(node.id)
            ? 'neighbor'
            : states.hasSelection
              ? 'dimmed'
              : 'normal';

    return {
      id: node.id,
      type: node.kind,
      position: { ...node.position },
      width: node.size.width,
      height: node.size.height,
      draggable: true,
      selectable: true,
      ariaLabel: `${node.kind} ${node.title}`,
      data: {
        semanticId: node.semanticId,
        kind: node.kind,
        title: node.title,
        ...(node.stereotype === undefined ? {} : { stereotype: node.stereotype }),
        rows: node.rows.map((row) => ({ ...row })),
        badges: node.badges.map((badge) => ({ ...badge })),
        size: { ...node.size },
        text: {
          title: { ...node.text.title },
          ...(node.text.stereotype === undefined
            ? {}
            : { stereotype: { ...node.text.stereotype } }),
          rows: node.text.rows.map((row) => ({
            rowId: row.rowId,
            primary: { ...row.primary },
            ...(row.secondary === undefined ? {} : { secondary: { ...row.secondary } }),
          })),
        },
        selectedState,
        ...(options.onSelectRow === undefined ? {} : { onSelectRow: options.onSelectRow }),
      },
    };
  });

  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));

  const edges = layout.relations.map<SemanticFlowEdge>((relation) => {
    const selectedState: SelectionState = states.diagRelationIds.has(relation.id)
      ? 'diagnostic'
      : states.hasDiagnosticHighlight
        ? 'dimmed'
        : states.selectedRelationIds.has(relation.id)
          ? 'selected'
          : states.neighborNodeIds.has(relation.sourceNodeId) ||
            states.neighborNodeIds.has(relation.targetNodeId)
            ? 'neighbor'
            : states.hasSelection
              ? 'dimmed'
              : 'normal';

    const srcNode = nodeMap.get(relation.sourceNodeId);
    const tgtNode = nodeMap.get(relation.targetNodeId);

    const firstSection = relation.sections[0];
    const lastSection = relation.sections.at(-1) ?? firstSection;
    const sourceSide = srcNode && firstSection
      ? determinePortSide(srcNode.position, srcNode.size, firstSection.start)
      : 'right';
    const targetSide = tgtNode && lastSection
      ? determinePortSide(tgtNode.position, tgtNode.size, lastSection.end)
      : 'left';

    return {
      id: relation.id,
      type: 'semantic',
      source: relation.sourceNodeId,
      target: relation.targetNodeId,
      sourceHandle: sourceSide,
      targetHandle: `${targetSide}-target`,
      selectable: true,
      focusable: true,
      ariaLabel: edgeAccessibleLabel(relation),
      data: {
        semanticIds: [...relation.semanticIds],
        relation: {
          ...relation,
          semanticIds: [...relation.semanticIds],
          sections: relation.sections.map((section) => ({
            start: { ...section.start },
            bendPoints: section.bendPoints.map((point) => ({ ...point })),
            end: { ...section.end },
          })),
        },
        selectedState,
        ...(srcNode !== undefined
          ? { sourceNode: { position: { ...srcNode.position }, size: { ...srcNode.size } } }
          : {}),
        ...(tgtNode !== undefined
          ? { targetNode: { position: { ...tgtNode.position }, size: { ...tgtNode.size } } }
          : {}),
        ...(options.onSelectEdge === undefined ? {} : { onSelectEdge: options.onSelectEdge }),
      },
    };
  });

  return { nodes, edges };
}
