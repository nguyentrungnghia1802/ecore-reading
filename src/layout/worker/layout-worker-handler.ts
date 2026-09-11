import type { SizedDiagram } from '../../diagram/sizing';
import { layoutSizedDiagram } from '../elk/elk-layout';
import type { LayoutModel } from '../model';
import { getLayoutProfile, type LayoutProfile } from '../profiles/layout-profiles';
import type { LayoutRequest, LayoutResponse } from './protocol';

export type WorkerLayoutFunction = (
  diagram: SizedDiagram,
  profile: LayoutProfile,
) => Promise<LayoutModel>;

export async function handleLayoutRequest(
  request: LayoutRequest,
  layout: WorkerLayoutFunction = layoutSizedDiagram,
): Promise<LayoutResponse> {
  try {
    return {
      requestId: request.requestId,
      result: await layout(request.diagram, getLayoutProfile(request.profileId)),
    };
  } catch (error: unknown) {
    return {
      requestId: request.requestId,
      error: error instanceof Error ? error.message : 'Unknown layout failure',
    };
  }
}
