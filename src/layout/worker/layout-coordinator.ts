import type { SizedDiagram } from '../../diagram/sizing';
import type { LayoutModel } from '../model';
import type { LayoutProfileId } from '../profiles/layout-profiles';
import type { LayoutRequest, LayoutResponse } from './protocol';

export interface LayoutTransport {
  request(request: LayoutRequest): Promise<LayoutResponse>;
}

export type CoordinatedLayoutResult =
  | { status: 'applied'; requestId: number; result: LayoutModel }
  | { status: 'stale'; requestId: number }
  | { status: 'error'; requestId: number; error: string; diagram: SizedDiagram };

export class LayoutCoordinator {
  private latestRequestId = 0;

  public constructor(private readonly transport: LayoutTransport) {}

  public async layout(
    diagram: SizedDiagram,
    profileId: LayoutProfileId,
  ): Promise<CoordinatedLayoutResult> {
    const requestId = ++this.latestRequestId;
    const response = await this.transport.request({ requestId, diagram, profileId });
    if (response.requestId !== this.latestRequestId) {
      return { status: 'stale', requestId: response.requestId };
    }
    if ('error' in response) {
      return {
        status: 'error',
        requestId: response.requestId,
        error: response.error,
        diagram,
      };
    }
    return { status: 'applied', requestId: response.requestId, result: response.result };
  }
}
