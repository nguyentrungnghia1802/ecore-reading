import { buildDiagram, type DiagramOptions } from '../../diagram/mapper';
import { sizeDiagram } from '../../diagram/sizing';
import { buildEcoreModel } from '../../ecore/model';
import { parseRawEcore } from '../../ecore/parser';
import { getLayoutProfile, layoutSizedDiagram, type LayoutProfileId } from '../../layout';
import type { LayoutModel } from '../../layout/model';
import type {
  WorkspaceErrorState,
  WorkspaceReadyState,
  WorkspaceState,
} from './workspace-types';

export interface LoadDocumentOptions {
  diagramOptions?: Partial<DiagramOptions>;
  layoutProfile?: LayoutProfileId;
  layoutEngine?: (sized: ReturnType<typeof sizeDiagram>, profileId: LayoutProfileId) => Promise<LayoutModel>;
}

export const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
  detailMode: 'standard',
  externalReferences: 'placeholder',
};

export const DEFAULT_LAYOUT_PROFILE: LayoutProfileId = 'hierarchy-down';

export async function loadEcoreDocument(
  source: string,
  sourceName: string,
  options: LoadDocumentOptions = {},
): Promise<WorkspaceReadyState | WorkspaceErrorState> {
  const diagramOpts: DiagramOptions = {
    ...DEFAULT_DIAGRAM_OPTIONS,
    ...options.diagramOptions,
  };
  const profileId = options.layoutProfile ?? DEFAULT_LAYOUT_PROFILE;

  try {
    const raw = parseRawEcore(source, { sourceName });
    const errors = raw.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

    if (errors.length > 0) {
      return {
        status: 'error',
        sourceName,
        error: {
          message: errors.map((e) => e.message).join('; ') || `Failed to parse ${sourceName}.`,
          diagnostics: raw.diagnostics,
        },
        selection: null,
        raw,
      };
    }

    if (raw.packages.length === 0) {
      return {
        status: 'error',
        sourceName,
        error: {
          message: `The file "${sourceName}" does not contain any Ecore packages.`,
          diagnostics: raw.diagnostics,
        },
        selection: null,
        raw,
      };
    }

    const model = buildEcoreModel(raw);
    const modelErrors = model.diagnostics.filter((d) => d.severity === 'error');
    if (modelErrors.length > 0) {
      return {
        status: 'error',
        sourceName,
        error: {
          message: modelErrors.map((e) => e.message).join('; '),
          diagnostics: model.diagnostics,
        },
        selection: null,
        raw,
        model,
      };
    }

    const diagram = buildDiagram(model, diagramOpts);
    const sized = sizeDiagram(diagram);

    const layout = options.layoutEngine
      ? await options.layoutEngine(sized, profileId)
      : await layoutSizedDiagram(sized, getLayoutProfile(profileId));

    return {
      status: 'ready',
      sourceName,
      raw,
      model,
      diagram,
      sized,
      layout,
      error: null,
      selection: null,
      options: diagramOpts,
      layoutProfile: profileId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      sourceName,
      error: {
        message: message || 'An unexpected error occurred while processing the Ecore file.',
      },
      selection: null,
    };
  }
}

export function createEmptyWorkspace(): WorkspaceState {
  return {
    status: 'empty',
    sourceName: null,
    error: null,
    selection: null,
  };
}
