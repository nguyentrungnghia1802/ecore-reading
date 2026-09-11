import type { Edge, Node } from '@xyflow/react';
import type {
  DiagramBadge,
  DiagramNodeKind,
  DiagramRow,
  NodeTextLayout,
} from '../../diagram/model';
import { edgeAccessibleLabel } from '../../diagram/notation';
import type { LayoutModel, LayoutRelation, Size } from '../../layout/model';
import type { SemanticSelection } from './selection-adapter';

export type SelectionState = 'normal' | 'selected' | 'neighbor' | 'dimmed';

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
  onSelectEdge?: (semanticIds: string[]) => void;
}

export type SemanticFlowEdge = Edge<SemanticEdgeData, 'semantic'>;

export interface ReactFlowElements {
  nodes: UmlFlowNode[];
  edges: SemanticFlowEdge[];
}

export interface ReactFlowAdapterOptions {
  selection: SemanticSelection | null;
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

function selectionStates(layout: LayoutModel, selection: SemanticSelection | null) {
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

  return { hasSelection, neighborNodeIds, selectedNodeIds, selectedRelationIds };
}

export function toReactFlowElements(
  layout: LayoutModel,
  options: ReactFlowAdapterOptions,
): ReactFlowElements {
  const states = selectionStates(layout, options.selection);

  const nodes = layout.nodes.map<UmlFlowNode>((node) => {
    const selectedState: SelectionState = states.selectedNodeIds.has(node.id)
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

  const edges = layout.relations.map<SemanticFlowEdge>((relation) => {
    const selectedState: SelectionState = states.selectedRelationIds.has(relation.id)
      ? 'selected'
      : states.selectedNodeIds.has(relation.sourceNodeId)
        || states.selectedNodeIds.has(relation.targetNodeId)
        ? 'neighbor'
        : states.hasSelection
          ? 'dimmed'
          : 'normal';

    return {
      id: relation.id,
      type: 'semantic',
      source: relation.sourceNodeId,
      target: relation.targetNodeId,
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
        ...(options.onSelectEdge === undefined ? {} : { onSelectEdge: options.onSelectEdge }),
      },
    };
  });

  return { nodes, edges };
}
