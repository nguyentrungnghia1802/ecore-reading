import '@xyflow/react/dist/style.css';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { buildDiagram } from '../../src/diagram/mapper';
import { sizeDiagram } from '../../src/diagram/sizing';
import { buildEcoreModel } from '../../src/ecore/model';
import { parseRawEcore } from '../../src/ecore/parser';
import { getLayoutProfile, layoutSizedDiagram } from '../../src/layout';
import type { LayoutModel } from '../../src/layout/model';
import {
  DiagramCanvas,
  type SemanticSelection,
} from '../../src/renderer';
import '../../src/styles.css';

const fixtureNames = new Set([
  'inheritance-multiple.ecore',
  'containment.ecore',
  'opposite-valid.ecore',
  'external-reference.ecore',
  'self-reference.ecore',
  'all-features.ecore',
]);

function requestedFixture(): string {
  const fixture = new URLSearchParams(window.location.search).get('fixture') ?? 'all-features.ecore';
  return fixtureNames.has(fixture) ? fixture : 'all-features.ecore';
}

function selectionText(selection: SemanticSelection | null): string {
  return selection === null ? 'none' : `${selection.kind}:${selection.semanticIds.join('|')}`;
}

export function RendererHarness() {
  const [layout, setLayout] = useState<LayoutModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SemanticSelection | null>(null);
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
        const nextLayout = await layoutSizedDiagram(sizeDiagram(diagram), getLayoutProfile('hierarchy-down'));
        if (!cancelled) setLayout(nextLayout);
      } catch (reason: unknown) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unexpected renderer harness failure.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixture]);

  if (error !== null) {
    return <main data-testid="renderer-error">{error}</main>;
  }
  if (layout === null) {
    return <main data-testid="renderer-loading">Rendering {fixture}…</main>;
  }

  return (
    <main data-testid="renderer-ready">
      <h1>Ecore renderer visual harness</h1>
      <p>{fixture}</p>
      <DiagramCanvas layout={layout} onSelectionChange={setSelection} selection={selection} />
      <output data-testid="semantic-selection">{selectionText(selection)}</output>
    </main>
  );
}

const root = document.getElementById('root');
if (root === null) throw new Error('Renderer harness root was not found.');

createRoot(root).render(<RendererHarness />);
