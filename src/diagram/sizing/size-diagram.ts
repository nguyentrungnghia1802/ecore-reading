import type { DiagramModel, DiagramNode, DiagramRow } from '../model';
import type {
  DiagramMetrics,
  LayoutPort,
  SizedDiagram,
  SizedDiagramNode,
  SizedDiagramRelation,
  TextLayout,
} from './types';
import type { SizedRowText } from './types';

export const DEFAULT_DIAGRAM_METRICS: DiagramMetrics = Object.freeze({
  minWidth: 220,
  maxWidth: 480,
  horizontalPadding: 16,
  headerHeight: 52,
  rowHeight: 24,
  secondaryRowHeight: 18,
  compartmentPadding: 8,
  approximateCharacterWidth: 7.5,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function layoutText(text: string, maxCharacters: number): TextLayout {
  const safeMaximum = Math.max(1, Math.floor(maxCharacters));
  if (text.length <= safeMaximum) {
    return { fullText: text, displayText: text, truncated: false };
  }
  return {
    fullText: text,
    displayText: `${text.slice(0, Math.max(0, safeMaximum - 1))}…`,
    truncated: true,
  };
}

function longestTextLength(node: DiagramNode): number {
  return Math.max(
    node.title.length,
    node.stereotype?.length ?? 0,
    ...node.rows.flatMap((row) => [row.primaryText.length, row.secondaryText?.length ?? 0]),
  );
}

function nodeWidth(node: DiagramNode, metrics: DiagramMetrics): number {
  return Math.ceil(
    clamp(
      longestTextLength(node) * metrics.approximateCharacterWidth +
        metrics.horizontalPadding * 2,
      metrics.minWidth,
      metrics.maxWidth,
    ),
  );
}

function nodeHeight(node: DiagramNode, metrics: DiagramMetrics): number {
  if (node.rows.length === 0) return metrics.headerHeight;
  const secondaryRows = node.rows.filter((row) => row.secondaryText !== undefined).length;
  return (
    metrics.headerHeight +
    metrics.compartmentPadding * 2 +
    node.rows.length * metrics.rowHeight +
    secondaryRows * metrics.secondaryRowHeight
  );
}

function ports(nodeId: string): LayoutPort[] {
  return (['top', 'right', 'bottom', 'left'] as const).map((side) => ({
    id: `port:${nodeId}:${side}`,
    nodeId,
    side,
  }));
}

function sizedRow(
  row: DiagramRow,
  maxCharacters: number,
): SizedRowText {
  return {
    rowId: row.id,
    primary: layoutText(row.primaryText, maxCharacters),
    ...(row.secondaryText === undefined
      ? {}
      : { secondary: layoutText(row.secondaryText, maxCharacters) }),
  };
}

function sizeNode(node: DiagramNode, metrics: DiagramMetrics): SizedDiagramNode {
  const width = nodeWidth(node, metrics);
  const maxCharacters = Math.floor(
    (width - metrics.horizontalPadding * 2) / metrics.approximateCharacterWidth,
  );
  return {
    ...node,
    size: { width, height: nodeHeight(node, metrics) },
    ports: ports(node.id),
    text: {
      title: layoutText(node.title, maxCharacters),
      ...(node.stereotype === undefined
        ? {}
        : { stereotype: layoutText(node.stereotype, maxCharacters) }),
      rows: node.rows.map((row) => sizedRow(row, maxCharacters)),
    },
  };
}

function sizeRelation(relation: DiagramModel['relations'][number]): SizedDiagramRelation {
  if (relation.kind !== 'generalization') return relation;
  return {
    ...relation,
    sourcePortId: `port:${relation.sourceNodeId}:top`,
    targetPortId: `port:${relation.targetNodeId}:bottom`,
  };
}

export function sizeDiagram(
  diagram: DiagramModel,
  metrics: DiagramMetrics = DEFAULT_DIAGRAM_METRICS,
): SizedDiagram {
  return {
    nodes: diagram.nodes.map((node) => sizeNode(node, metrics)),
    relations: diagram.relations.map(sizeRelation),
    sourceSemanticIds: [...diagram.sourceSemanticIds],
    diagnostics: [...diagram.diagnostics],
  };
}
