import type { Diagnostic } from '../../ecore/model';
import type {
  DiagramNode,
  DiagramRelation,
  NodeTextLayout,
} from '../model';
import type { Size } from '../../layout/model';

export type LayoutPortSide = 'top' | 'right' | 'bottom' | 'left';

export interface DiagramMetrics {
  minWidth: number;
  maxWidth: number;
  horizontalPadding: number;
  headerHeight: number;
  rowHeight: number;
  secondaryRowHeight: number;
  compartmentPadding: number;
  approximateCharacterWidth: number;
}

export type {
  NodeTextLayout as SizedNodeText,
  RowTextLayout as SizedRowText,
  TextLayout,
} from '../model';

export interface LayoutPort {
  id: string;
  nodeId: string;
  side: LayoutPortSide;
}

export interface SizedDiagramNode extends DiagramNode {
  size: Size;
  ports: LayoutPort[];
  text: NodeTextLayout;
}

export interface SizedDiagramRelation extends DiagramRelation {
  sourcePortId?: string;
  targetPortId?: string;
}

export interface SizedDiagram {
  nodes: SizedDiagramNode[];
  relations: SizedDiagramRelation[];
  sourceSemanticIds: string[];
  diagnostics: Diagnostic[];
}
