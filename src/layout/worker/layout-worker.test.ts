import { describe, expect, it } from 'vitest';
import type { SizedDiagram } from '../../diagram/sizing';
import { LayoutCoordinator, type LayoutTransport } from './layout-coordinator';
import { handleLayoutRequest } from './layout-worker-handler';
import type { LayoutRequest, LayoutResponse } from './protocol';

const emptyDiagram: SizedDiagram = {
  nodes: [],
  relations: [],
  sourceSemanticIds: [],
  diagnostics: [],
};

function deferred<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value: T) {
      if (resolvePromise === undefined) throw new Error('Deferred promise is not initialized');
      resolvePromise(value);
    },
  };
}

describe('layout worker protocol and coordination', () => {
  it('echoes requestId on successful worker execution', async () => {
    const response = await handleLayoutRequest(
      { requestId: 41, diagram: emptyDiagram, profileId: 'compact' },
      (_diagram, profile) => Promise.resolve({
        nodes: [], relations: [], bounds: { x: 0, y: 0, width: 0, height: 0 }, profileId: profile.id,
      }),
    );

    expect(response).toEqual({
      requestId: 41,
      result: {
        nodes: [], relations: [], bounds: { x: 0, y: 0, width: 0, height: 0 }, profileId: 'compact',
      },
    });
  });

  it('returns a recoverable failure response instead of throwing through the worker boundary', async () => {
    const response = await handleLayoutRequest(
      { requestId: 9, diagram: emptyDiagram, profileId: 'hierarchy-down' },
      () => Promise.reject(new Error('ELK exploded')),
    );

    expect(response).toEqual({ requestId: 9, error: 'ELK exploded' });
  });

  it('ignores an older response that arrives after the newest request', async () => {
    const first = deferred<LayoutResponse>();
    const second = deferred<LayoutResponse>();
    const requests: LayoutRequest[] = [];
    const transport: LayoutTransport = {
      request(request) {
        requests.push(request);
        return requests.length === 1 ? first.promise : second.promise;
      },
    };
    const coordinator = new LayoutCoordinator(transport);
    const oldResult = coordinator.layout(emptyDiagram, 'hierarchy-down');
    const newResult = coordinator.layout(emptyDiagram, 'compact');

    second.resolve({
      requestId: 2,
      result: { nodes: [], relations: [], bounds: { x: 0, y: 0, width: 0, height: 0 }, profileId: 'compact' },
    });
    expect(await newResult).toMatchObject({ status: 'applied', requestId: 2 });
    first.resolve({
      requestId: 1,
      result: { nodes: [], relations: [], bounds: { x: 0, y: 0, width: 0, height: 0 }, profileId: 'hierarchy-down' },
    });
    expect(await oldResult).toEqual({ status: 'stale', requestId: 1 });
  });

  it('keeps semantic geometry input available on recoverable coordinator errors', async () => {
    const transport: LayoutTransport = {
      request: (request) => Promise.resolve({ requestId: request.requestId, error: 'bad layout' }),
    };
    const coordinator = new LayoutCoordinator(transport);

    expect(await coordinator.layout(emptyDiagram, 'compact')).toEqual({
      status: 'error',
      requestId: 1,
      error: 'bad layout',
      diagram: emptyDiagram,
    });
  });
});
