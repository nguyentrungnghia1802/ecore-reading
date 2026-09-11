import type { DiagramModel } from '../../diagram/model';
import type { DiagramOptions } from '../../diagram/mapper';
import type { SizedDiagram } from '../../diagram/sizing';
import type { Diagnostic, EcoreModel } from '../../ecore/model';
import type { RawEcoreDocument } from '../../ecore/raw';
import type { LayoutModel } from '../../layout/model';
import type { LayoutProfileId } from '../../layout/profiles/layout-profiles';
import type { SemanticSelection } from '../../renderer';

export type WorkspaceStatus = 'empty' | 'loading' | 'ready' | 'error';

export interface WorkspaceError {
  message: string;
  diagnostics?: Diagnostic[];
}

export interface WorkspaceEmptyState {
  status: 'empty';
  sourceName: null;
  error: null;
  selection: null;
}

export interface WorkspaceLoadingState {
  status: 'loading';
  sourceName: string | null;
  message: string;
  error: null;
  selection: null;
}

export interface WorkspaceErrorState {
  status: 'error';
  sourceName: string | null;
  error: WorkspaceError;
  selection: null;
  raw?: RawEcoreDocument | null;
  model?: EcoreModel | null;
  diagram?: DiagramModel | null;
  layout?: LayoutModel | null;
}

export interface WorkspaceReadyState {
  status: 'ready';
  sourceName: string;
  raw: RawEcoreDocument;
  model: EcoreModel;
  diagram: DiagramModel;
  sized: SizedDiagram;
  layout: LayoutModel;
  error: null;
  selection: SemanticSelection | null;
  options: DiagramOptions;
  layoutProfile: LayoutProfileId;
}

export type WorkspaceState =
  | WorkspaceEmptyState
  | WorkspaceLoadingState
  | WorkspaceErrorState
  | WorkspaceReadyState;
