import type { LayoutTransport } from './layout-coordinator';
import type { LayoutRequest, LayoutResponse } from './protocol';

export class WebWorkerLayoutTransport implements LayoutTransport {
  private readonly pending = new Map<
    number,
    { resolve: (response: LayoutResponse) => void; reject: (error: Error) => void }
  >();

  public constructor(private readonly worker: Worker) {
    worker.addEventListener('message', (event: MessageEvent<LayoutResponse>) => {
      const pending = this.pending.get(event.data.requestId);
      if (pending === undefined) return;
      this.pending.delete(event.data.requestId);
      pending.resolve(event.data);
    });
    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Layout worker failed');
      this.pending.forEach((pending) => pending.reject(error));
      this.pending.clear();
    });
  }

  public request(request: LayoutRequest): Promise<LayoutResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(request.requestId, { resolve, reject });
      this.worker.postMessage(request);
    });
  }
}

export function createLayoutWorkerTransport(): WebWorkerLayoutTransport {
  return new WebWorkerLayoutTransport(
    new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' }),
  );
}
