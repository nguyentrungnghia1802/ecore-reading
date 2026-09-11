/// <reference lib="webworker" />
import { handleLayoutRequest } from './layout-worker-handler';
import type { LayoutRequest } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener('message', (event: MessageEvent<LayoutRequest>) => {
  void handleLayoutRequest(event.data).then((response) => self.postMessage(response));
});
