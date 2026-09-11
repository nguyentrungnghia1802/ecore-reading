import type { DiagramNode, DiagramRelation } from '../../diagram/model';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface LayoutSection {
  start: Point;
  bendPoints: Point[];
  end: Point;
}

export interface LayoutNode extends DiagramNode {
  position: Point;
  size: Size;
}

export interface LayoutRelation extends DiagramRelation {
  sections: LayoutSection[];
}

export interface LayoutBounds extends Point, Size {}

export interface LayoutModel {
  nodes: LayoutNode[];
  relations: LayoutRelation[];
  bounds: LayoutBounds;
  profileId: string;
}
