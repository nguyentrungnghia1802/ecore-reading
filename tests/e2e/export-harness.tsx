import '@xyflow/react/dist/style.css';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { buildDiagram } from '../../src/diagram/mapper';
import type { DiagramModel } from '../../src/diagram/model';
import { sizeDiagram } from '../../src/diagram/sizing';
import { buildEcoreModel } from '../../src/ecore/model';
import { parseRawEcore } from '../../src/ecore/parser';
import { serializeSvg } from '../../src/export/svg';
import { getLayoutProfile, layoutSizedDiagram } from '../../src/layout';
import type { LayoutModel } from '../../src/layout/model';
import { DiagramCanvas } from '../../src/renderer';
import '../../src/styles.css';

const fixtureNames = new Set([
  'inheritance-multiple.ecore',
  'containment.ecore',
  'opposite-valid.ecore',
]);

function requestedFixture(): string {
  const fixture = new URLSearchParams(window.location.search).get('fixture') ?? 'containment.ecore';
  return fixtureNames.has(fixture) ? fixture : 'containment.ecore';
}

interface ExportResult {
  diagram: DiagramModel;
  layout: LayoutModel;
  svg: string;
}

export function ExportHarness() {
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fixture = requestedFixture();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/tests/fixtures/ecore/${fixture}`);
        if (!response.ok) throw new Error(`Could not load ${fixture}.`);
        const raw = parseRawEcore(await response.text(), { sourceName: fixture });
        const model = buildEcoreModel(raw);
        const diagram = buildDiagram(model, {
          detailMode: 'ecore',
          externalReferences: 'placeholder',
        });
        const layout = await layoutSizedDiagram(
          sizeDiagram(diagram),
          getLayoutProfile('hierarchy-down'),
        );
        const svg = serializeSvg(diagram, layout, { background: 'light' });
        if (!cancelled) setResult({ diagram, layout, svg });
      } catch (reason: unknown) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unexpected export harness failure.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixture]);

  if (error !== null) return <main data-testid="export-error">{error}</main>;
  if (result === null) return <main data-testid="export-loading">Exporting {fixture}…</main>;

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`;
  return (
    <main
      data-testid="export-ready"
      style={{ background: '#e2e8f0', minHeight: '100vh', padding: 20 }}
    >
      <h1 style={{ margin: '0 0 6px' }}>Canvas / vector SVG notation comparison</h1>
      <p style={{ margin: '0 0 16px' }}>{fixture}</p>
      <div
        data-testid="canvas-svg-comparison"
        style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', height: 750 }}
      >
        <section style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 16, height: 20, lineHeight: '20px', margin: '0 0 10px' }}>React Flow canvas</h2>
          <DiagramCanvas layout={result.layout} />
        </section>
        <section style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 16, height: 20, lineHeight: '20px', margin: '0 0 10px' }}>Standalone vector SVG</h2>
          <div
            data-testid="svg-export-preview"
            style={{
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 12,
              boxSizing: 'border-box',
              display: 'flex',
              height: 720,
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 12,
            }}
          >
            <img
              alt={`Standalone SVG export of ${fixture}`}
              data-node-count={result.diagram.nodes.length}
              data-relation-count={result.diagram.relations.length}
              src={svgUrl}
              style={{ height: '100%', objectFit: 'contain', width: '100%' }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

const root = document.getElementById('root');
if (root === null) throw new Error('Export harness root was not found.');
createRoot(root).render(<ExportHarness />);
