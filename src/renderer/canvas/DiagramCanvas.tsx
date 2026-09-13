import {
  Background,
  Controls,
  ControlButton,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutModel, Point } from '../../layout/model';
import { computeDynamicEdgeSections } from '../edges/edge-geometry';
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
  onResetLayout?: () => void;
  minimapVisible?: boolean;
  onToggleMinimap?: (visible: boolean) => void;
  highlightedNodeIds?: readonly string[] | undefined;
  highlightedRelationIds?: readonly string[] | undefined;
  focusNodeIds?: readonly string[] | undefined;
  focusKey?: number | undefined;
}

function DiagramCanvasInner({
  layout,
  selection,
  onSelectionChange,
  className,
  onResetLayout,
  minimapVisible,
  onToggleMinimap,
  highlightedNodeIds,
  highlightedRelationIds,
  focusNodeIds,
  focusKey,
}: DiagramCanvasProps) {
  const { fitView, setCenter, getZoom } = useReactFlow();
  const [localSelection, setLocalSelection] = useState<SemanticSelection | null>(null);
  const [isLowZoom, setIsLowZoom] = useState(false);
  const [localMiniMap, setLocalMiniMap] = useState(true);
  const showMiniMap = minimapVisible ?? localMiniMap;
  const [manualOverrides, setManualOverrides] = useState<Record<string, { x: number; y: number }>>({});

  const handleToggleMiniMap = useCallback(() => {
    if (minimapVisible === undefined) {
      setLocalMiniMap((prev) => !prev);
    }
    onToggleMinimap?.(!showMiniMap);
  }, [minimapVisible, onToggleMinimap, showMiniMap]);

  const activeSelection = selection === undefined ? localSelection : selection;
  const publishSelection = useCallback(
    (next: SemanticSelection | null) => {
      if (selection === undefined) setLocalSelection(next);
      onSelectionChange?.(next);
    },
    [onSelectionChange, selection],
  );

  // When layout model updates (e.g. from relayout triggered by mode/filter/focus change),
  // discard manual position overrides and re-center on the selected node if one exists.
  const prevLayoutRef = useRef<LayoutModel | null>(null);
  useEffect(() => {
    if (prevLayoutRef.current !== null && prevLayoutRef.current !== layout) {
      setManualOverrides({});

      // Attempt to keep selected node near previous viewport center if present
      if (activeSelection?.kind === 'node' && activeSelection.primarySemanticId) {
        const targetNode = layout.nodes.find(
          (n) => n.semanticId === activeSelection.primarySemanticId || n.id === activeSelection.primarySemanticId,
        );
        if (targetNode) {
          const currentZoom = getZoom();
          void setCenter(
            targetNode.position.x + targetNode.size.width / 2,
            targetNode.position.y + targetNode.size.height / 2,
            { duration: 250, zoom: Math.max(currentZoom, 0.45) },
          );
        } else {
          void fitView({ padding: 0.12, duration: 250 });
        }
      }
    }
    prevLayoutRef.current = layout;
  }, [layout, activeSelection, getZoom, setCenter, fitView]);

  // Keyboard shortcut 'F' / 'f' for Fit View scoped safely outside editable inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable) {
          return;
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        void fitView({ padding: 0.12, duration: 200 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  useEffect(() => {
    if (!focusNodeIds || focusNodeIds.length === 0) return;
    const targetNodes = layout.nodes.filter(
      (n) => focusNodeIds.includes(n.id) || focusNodeIds.includes(n.semanticId),
    );
    if (targetNodes.length === 0) return;

    if (targetNodes.length === 1) {
      const target = targetNodes[0]!;
      const currentZoom = getZoom();
      void setCenter(
        target.position.x + target.size.width / 2,
        target.position.y + target.size.height / 2,
        { duration: 300, zoom: Math.max(currentZoom, 0.75) },
      );
    } else {
      void fitView({
        nodes: targetNodes.map((n) => ({ id: n.id })),
        padding: 0.25,
        duration: 300,
      });
    }
  }, [focusKey, focusNodeIds, layout.nodes, getZoom, setCenter, fitView]);

  const baseElements = useMemo(
    () =>
      toReactFlowElements(layout, {
        selection: activeSelection,
        highlightedNodeIds,
        highlightedRelationIds,
        onSelectRow: (semanticId) => publishSelection(selectionForSemanticIds('row', [semanticId])),
        onSelectEdge: (semanticIds) => publishSelection(selectionForSemanticIds('relation', semanticIds)),
      }),
    [activeSelection, highlightedNodeIds, highlightedRelationIds, layout, publishSelection],
  );

  // Merge manual position overrides as view-only state (semantics and layout model untouched)
  const elements = useMemo(() => {
    const overrideKeys = Object.keys(manualOverrides);
    if (overrideKeys.length === 0) return baseElements;

    const currentPositions = new Map<string, Point>();
    for (const node of baseElements.nodes) {
      currentPositions.set(node.id, manualOverrides[node.id] ?? node.position);
    }

    return {
      nodes: baseElements.nodes.map((node) => {
        const override = manualOverrides[node.id];
        return override ? { ...node, position: { ...override } } : node;
      }),
      edges: baseElements.edges.map((edge) => {
        const edgeData = edge.data;
        if (edgeData?.sourceNode === undefined || edgeData.targetNode === undefined) return edge;

        const currentSourcePos = currentPositions.get(edge.source) ?? edgeData.sourceNode.position;
        const currentTargetPos = currentPositions.get(edge.target) ?? edgeData.targetNode.position;

        const updatedSections = computeDynamicEdgeSections({
          relation: edgeData.relation,
          sourceNode: edgeData.sourceNode,
          targetNode: edgeData.targetNode,
          currentSourcePos,
          currentTargetPos,
        });

        return {
          ...edge,
          data: {
            ...edgeData,
            relation: {
              ...edgeData.relation,
              sections: updatedSections,
            },
          },
        };
      }),
    };
  }, [baseElements, manualOverrides]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: UmlFlowNode) => {
      publishSelection(selectionForSemanticIds('node', [node.data.semanticId]));
    },
    [publishSelection],
  );


  const handleNodeDrag = useCallback(
    (_event: MouseEvent | TouchEvent, node: UmlFlowNode) => {
      setManualOverrides((prev) => ({
        ...prev,
        [node.id]: { x: node.position.x, y: node.position.y },
      }));
    },
    [],
  );

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: UmlFlowNode) => {
      setManualOverrides((prev) => ({
        ...prev,
        [node.id]: { x: node.position.x, y: node.position.y },
      }));
    },
    [],
  );

  const handleResetManualLayout = useCallback(() => {
    setManualOverrides({});
    onResetLayout?.();
    void fitView({ padding: 0.12, duration: 250 });
  }, [fitView, onResetLayout]);

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: SemanticFlowEdge) => {
      if (edge.data === undefined) return;
      publishSelection(selectionForSemanticIds('relation', edge.data.semanticIds));
    },
    [publishSelection],
  );

  const handleFlowSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: UmlFlowNode[]; edges: SemanticFlowEdge[] }) => {
      const edge = edges[0];
      if (edge?.data !== undefined) {
        publishSelection(selectionForSemanticIds('relation', edge.data.semanticIds));
        return;
      }
      const node = nodes[0];
      if (node !== undefined) {
        publishSelection(selectionForSemanticIds('node', [node.data.semanticId]));
      }
    },
    [publishSelection],
  );

  const hasManualOverrides = Object.keys(manualOverrides).length > 0;

  return (
    <div
      className={['diagram-canvas', isLowZoom ? 'diagram-canvas--low-zoom' : '', className]
        .filter(Boolean)
        .join(' ')}
      data-testid="diagram-canvas"
    >
      {/* 
        Interaction configuration tuned for design-tool feel:
        - panOnDrag: pan canvas with pointer drag
        - zoomOnScroll: wheel zooms toward cursor position
        - panOnScroll=false: avoids fighting vertical wheel scroll
        - preventScrolling: avoids page viewport jitter during zoom
        - nodesDraggable: view-only manual drag adjustments
      */}
      <ReactFlow<UmlFlowNode, SemanticFlowEdge>
        aria-label="Ecore semantic diagram"
        edgeTypes={edgeTypes}
        edges={elements.edges}
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ minZoom: 0.05, padding: 0.12 }}
        maxZoom={3.0}
        minZoom={0.05}
        nodes={elements.nodes}
        nodesConnectable={false}
        nodesDraggable={true}
        nodeTypes={nodeTypes}
        onEdgeClick={handleEdgeClick}
        onMove={(_event, viewport) => {
          const nextLow = viewport.zoom < 0.45;
          setIsLowZoom((prev) => (prev !== nextLow ? nextLow : prev));
        }}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => publishSelection(null)}
        onSelectionChange={handleFlowSelectionChange}
        panOnDrag
        panOnScroll={false}
        preventScrolling
        zoomOnScroll
      >
        <Background gap={20} size={1} />
        <Controls
          className="canvas-controls"
          data-testid="canvas-controls"
          position="bottom-left"
          showFitView
          showInteractive={false}
          showZoom
        >
          <ControlButton
            aria-label="Reset to Auto Layout"
            data-testid="reset-layout-btn"
            disabled={!hasManualOverrides}
            onClick={handleResetManualLayout}
            title={
              hasManualOverrides
                ? 'Discard manual node moves and restore automatic layout'
                : 'Auto layout active (move nodes to adjust)'
            }
          >
            <svg
              fill="none"
              height="14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </ControlButton>
          <ControlButton
            aria-label="Toggle Minimap"
            data-testid="toggle-minimap-btn"
            onClick={handleToggleMiniMap}
            title="Toggle Minimap"
          >
            <svg
              fill="none"
              height="14"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="14"
            >
              <rect height="18" rx="2" width="18" x="3" y="3" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </ControlButton>
        </Controls>
        {showMiniMap && (
          <MiniMap
            className="canvas-minimap"
            data-testid="canvas-minimap"
            nodeColor={(node) => {
              switch (node.type) {
                case 'class':
                  return '#3b82f6';
                case 'enum':
                  return '#10b981';
                case 'datatype':
                  return '#f59e0b';
                case 'external':
                  return '#ef4444';
                default:
                  return '#94a3b8';
              }
            }}
            pannable
            zoomable
          />
        )}
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas(props: DiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
