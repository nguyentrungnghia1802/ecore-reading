import { buildDiagram } from '../../src/diagram/mapper';
import { sizeDiagram } from '../../src/diagram/sizing';
import { buildEcoreModel } from '../../src/ecore/model';
import { parseRawEcore } from '../../src/ecore/parser';
import { serializeSvg } from '../../src/export';
import { getLayoutProfile, layoutSizedDiagram } from '../../src/layout';
import type { LayoutProfileId } from '../../src/layout';

/** Executes the canonical browser-first pipeline with real project adapters. */
export async function runPhaseOnePipeline(
  source: string,
  sourceName: string,
  profileId: LayoutProfileId = 'hierarchy-down',
) {
  const raw = parseRawEcore(source, { sourceName });
  if (raw.packages.length === 0) {
    const message = raw.diagnostics.map((diagnostic) => diagnostic.message).join(' ');
    throw new Error(message || `Fixture ${sourceName} did not contain an EPackage.`);
  }
  const model = buildEcoreModel(raw);
  const diagram = buildDiagram(model, {
    detailMode: 'ecore',
    externalReferences: 'placeholder',
  });
  const sized = sizeDiagram(diagram);
  const layout = await layoutSizedDiagram(sized, getLayoutProfile(profileId));
  const svg = serializeSvg(diagram, layout, { background: 'light' });
  return { raw, model, diagram, sized, layout, svg };
}
