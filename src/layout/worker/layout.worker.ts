/// <reference lib="webworker" />
import ELK from 'elkjs/lib/elk-api.js';
import ElkWorker from 'elkjs/lib/elk-worker.min.js?worker';
import { layoutSizedDiagram } from '../elk/elk-layout';
import { handleLayoutRequest } from './layout-worker-handler';
import type { LayoutRequest } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

const engine = new ELK({ workerFactory: () => new ElkWorker() });

self.addEventListener('message', (event: MessageEvent<LayoutRequest>) => {
  void handleLayoutRequest(
    event.data,
    (diagram, profile) => layoutSizedDiagram(diagram, profile, engine),
  ).then((response) => self.postMessage(response));
});
