import {
  Background,
  ReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import type { LayoutModel } from '../../layout/model';
import { SemanticEdge } from '../edges/SemanticEdge';
import { UmlNode } from '../nodes/UmlNode';
import {
  selectionForSemanticIds,
  type SemanticSelection,
} from './selection-adapter';
import {
  toReactFlowElements,
  type SemanticFlowEdge,
  type UmlFlowNode,
} from './react-flow-adapter';

const nodeTypes = {
  class: UmlNode,
  enum: UmlNode,
  datatype: UmlNode,
  external: UmlNode,
} satisfies NodeTypes;

const edgeTypes = {
  semantic: SemanticEdge,
} satisfies EdgeTypes;

export interface DiagramCanvasProps {
  layout: LayoutModel;
  selection?: SemanticSelection | null;
  onSelectionChange?: (selection: SemanticSelection | null) => void;
  className?: string;
}

export function DiagramCanvas({
  layout,
  selection,
  onSelectionChange,
  className,
}: DiagramCanvasProps) {
  const [localSelection, setLocalSelection] = useState<SemanticSelection | null>(null);
  const [isLowZoom, setIsLowZoom] = useState(false);
  const activeSelection = selection === undefined ? localSelection : selection;
  const publishSelection = useCallback((next: SemanticSelection | null) => {
    if (selection === undefined) setLocalSelection(next);
    onSelectionChange?.(next);
  }, [onSelectionChange, selection]);
  const elements = useMemo(
    () => toReactFlowElements(layout, {
      selection: activeSelection,
      onSelectRow: (semanticId) => publishSelection(selectionForSemanticIds('row', [semanticId])),
      onSelectEdge: (semanticIds) => publishSelection(selectionForSemanticIds('relation', semanticIds)),
    }),
    [activeSelection, layout, publishSelection],
  );
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: UmlFlowNode) => {
    publishSelection(selectionForSemanticIds('node', [node.data.semanticId]));
  }, [publishSelection]);
  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: SemanticFlowEdge) => {
    if (edge.data === undefined) return;
    publishSelection(selectionForSemanticIds('relation', edge.data.semanticIds));
  }, [publishSelection]);
  const handleFlowSelectionChange = useCallback(({ nodes, edges }: {
    nodes: UmlFlowNode[];
    edges: SemanticFlowEdge[];
  }) => {
    const edge = edges[0];
    if (edge?.data !== undefined) {
      publishSelection(selectionForSemanticIds('relation', edge.data.semanticIds));
      return;
    }
    const node = nodes[0];
    if (node !== undefined) {
      publishSelection(selectionForSemanticIds('node', [node.data.semanticId]));
    }
  }, [publishSelection]);
  return (
    <div
      className={['diagram-canvas', isLowZoom ? 'diagram-canvas--low-zoom' : '', className]
        .filter(Boolean)
        .join(' ')}
      data-testid="diagram-canvas"
    >
      <ReactFlow<UmlFlowNode, SemanticFlowEdge>
        aria-label="Ecore semantic diagram"
        edgeTypes={edgeTypes}
        edges={elements.edges}
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ minZoom: 0.05, padding: 0.12 }}
        minZoom={0.05}
        nodes={elements.nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        onEdgeClick={handleEdgeClick}
        onMove={(_event, viewport) => setIsLowZoom(viewport.zoom < 0.45)}
        onNodeClick={handleNodeClick}
        onPaneClick={() => publishSelection(null)}
        onSelectionChange={handleFlowSelectionChange}
        panOnDrag
        zoomOnScroll
      >
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
