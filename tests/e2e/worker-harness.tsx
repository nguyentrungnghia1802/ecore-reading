import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { buildDiagram } from '../../src/diagram/mapper';
import { sizeDiagram } from '../../src/diagram/sizing';
import { buildEcoreModel } from '../../src/ecore/model';
import { parseRawEcore } from '../../src/ecore/parser';
import { createLayoutWorkerTransport, LayoutCoordinator } from '../../src/layout';
import { generateStressEcore } from '../fixtures/generate-stress-model';

interface WorkerResult {
  frameCount: number;
  nodeCount: number;
  relationCount: number;
}

export function WorkerHarness() {
  const [result, setResult] = useState<WorkerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    let frameCount = 0;
    const countFrames = () => {
      if (settled) return;
      frameCount += 1;
      requestAnimationFrame(countFrames);
    };
    requestAnimationFrame(countFrames);

    void (async () => {
      try {
        const source = generateStressEcore({ classCount: 50, referencesPerClass: 2 });
        const model = buildEcoreModel(parseRawEcore(source, { sourceName: 'worker-stress-50.ecore' }));
        const diagram = buildDiagram(model, {
          detailMode: 'ecore',
          externalReferences: 'placeholder',
        });
        const coordinator = new LayoutCoordinator(createLayoutWorkerTransport());
        const response = await coordinator.layout(sizeDiagram(diagram), 'compact');
        settled = true;
        if (cancelled) return;
        if (response.status === 'error') throw new Error(response.error);
        if (response.status !== 'applied') throw new Error(`Worker layout did not apply: ${response.status}`);
        setResult({
          frameCount,
          nodeCount: response.result.nodes.length,
          relationCount: response.result.relations.length,
        });
      } catch (reason: unknown) {
        settled = true;
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unexpected worker harness failure.');
        }
      }
    })();
    return () => {
      cancelled = true;
      settled = true;
    };
  }, []);

  if (error !== null) return <main data-testid="worker-error">{error}</main>;
  if (result === null) return <main data-testid="worker-loading">Layout worker running…</main>;
  return (
    <main
      data-frame-count={result.frameCount}
      data-node-count={result.nodeCount}
      data-relation-count={result.relationCount}
      data-testid="worker-ready"
    >
      Worker layout complete
    </main>
  );
}

const root = document.getElementById('root');
if (root === null) throw new Error('Worker harness root was not found.');
createRoot(root).render(<WorkerHarness />);
