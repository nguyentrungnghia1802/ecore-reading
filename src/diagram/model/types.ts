import type { Diagnostic, Multiplicity } from '../../ecore/model';

export type DiagramNodeKind = 'class' | 'enum' | 'datatype' | 'external';
export type DiagramRelationKind =
  | 'generalization'
  | 'association'
  | 'composition'
  | 'external-reference';
export type DiagramDetailMode = 'overview' | 'standard' | 'detailed' | 'ecore';

export interface DiagramRow {
  id: string;
  semanticId: string;
  kind: 'attribute' | 'reference' | 'operation' | 'literal' | 'metadata';
  primaryText: string;
  secondaryText?: string;
}

export interface DiagramBadge {
  id: string;
  semanticId: string;
  label: string;
  tone: 'neutral' | 'info' | 'warning' | 'error';
}

export interface DiagramNode {
  id: string;
  semanticId: string;
  kind: DiagramNodeKind;
  title: string;
  stereotype?: string;
  rows: DiagramRow[];
  badges: DiagramBadge[];
}

export interface AssociationEnd {
  classifierId: string;
  roleName?: string;
  multiplicity?: Multiplicity;
  navigable: boolean;
  sourceReferenceId?: string;
}

export interface DiagramRelation {
  id: string;
  kind: DiagramRelationKind;
  sourceNodeId: string;
  targetNodeId: string;
  sourceEnd?: AssociationEnd;
  targetEnd?: AssociationEnd;
  semanticIds: string[];
}

export interface DiagramModel {
  nodes: DiagramNode[];
  relations: DiagramRelation[];
  sourceSemanticIds: Set<string>;
  diagnostics: Diagnostic[];
}
