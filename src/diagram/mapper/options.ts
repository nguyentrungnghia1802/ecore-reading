import type { DiagramDetailMode, DiagramRelationKind } from '../model';

export interface DiagramOptions {
  detailMode: DiagramDetailMode;
  visibleRelationKinds?: ReadonlySet<DiagramRelationKind>;
  externalReferences: 'omit' | 'placeholder';
  focusSemanticIds?: ReadonlySet<string>;
}
