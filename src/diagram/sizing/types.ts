import type { Diagnostic } from '../../ecore/model';
import type { DiagramNode, DiagramRelation } from '../model';
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

export interface TextLayout {
  fullText: string;
  displayText: string;
  truncated: boolean;
}

export interface SizedRowText {
  rowId: string;
  primary: TextLayout;
  secondary?: TextLayout;
}

export interface SizedNodeText {
  title: TextLayout;
  stereotype?: TextLayout;
  rows: SizedRowText[];
}

export interface LayoutPort {
  id: string;
  nodeId: string;
  side: LayoutPortSide;
}

export interface SizedDiagramNode extends DiagramNode {
  size: Size;
  ports: LayoutPort[];
  text: SizedNodeText;
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
