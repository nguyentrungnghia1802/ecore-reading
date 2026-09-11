import type { SizedDiagram } from '../../diagram/sizing';
import type { LayoutModel } from '../model';
import type { LayoutProfileId } from '../profiles/layout-profiles';

export interface LayoutRequest {
  requestId: number;
  diagram: SizedDiagram;
  profileId: LayoutProfileId;
}

export type LayoutResponse =
  | { requestId: number; result: LayoutModel }
  | { requestId: number; error: string };
