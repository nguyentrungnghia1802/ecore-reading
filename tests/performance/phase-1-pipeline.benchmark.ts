import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDiagram } from '../../src/diagram/mapper';
import { sizeDiagram } from '../../src/diagram/sizing';
import { buildEcoreModel } from '../../src/ecore/model';
import { parseRawEcore } from '../../src/ecore/parser';
import { serializeSvg } from '../../src/export';
import { getLayoutProfile, layoutSizedDiagram } from '../../src/layout';
import { generateStressEcore } from '../fixtures/generate-stress-model';

interface StageDurations {
  parseMs: number;
  resolveMs: number;
  mapMs: number;
  sizeMs: number;
  layoutMs: number;
  exportMs: number;
  totalMs: number;
}

interface PipelineMeasurement extends StageDurations {
  nodeCount: number;
  relationCount: number;
  sourceBytes: number;
}

function elapsed(start: number): number {
  return performance.now() - start;
}

async function measurePipeline(source: string, sourceName: string): Promise<PipelineMeasurement> {
  const totalStart = performance.now();
  let stageStart = performance.now();
  const raw = parseRawEcore(source, { sourceName });
  const parseMs = elapsed(stageStart);

  stageStart = performance.now();
  const model = buildEcoreModel(raw);
  const resolveMs = elapsed(stageStart);

  stageStart = performance.now();
  const diagram = buildDiagram(model, {
    detailMode: 'ecore',
    externalReferences: 'placeholder',
  });
  const mapMs = elapsed(stageStart);

  stageStart = performance.now();
  const sized = sizeDiagram(diagram);
  const sizeMs = elapsed(stageStart);

  stageStart = performance.now();
  const layout = await layoutSizedDiagram(sized, getLayoutProfile('compact'));
  const layoutMs = elapsed(stageStart);

  stageStart = performance.now();
  serializeSvg(diagram, layout, { background: 'light' });
  const exportMs = elapsed(stageStart);

  return {
    parseMs,
    resolveMs,
    mapMs,
    sizeMs,
    layoutMs,
    exportMs,
    totalMs: elapsed(totalStart),
    nodeCount: diagram.nodes.length,
    relationCount: diagram.relations.length,
    sourceBytes: new TextEncoder().encode(source).byteLength,
  };
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function medianMeasurement(samples: readonly PipelineMeasurement[]): PipelineMeasurement {
  const first = samples[0];
  if (first === undefined) throw new Error('At least one performance sample is required.');
  return {
    ...first,
    parseMs: rounded(median(samples.map((sample) => sample.parseMs))),
    resolveMs: rounded(median(samples.map((sample) => sample.resolveMs))),
    mapMs: rounded(median(samples.map((sample) => sample.mapMs))),
    sizeMs: rounded(median(samples.map((sample) => sample.sizeMs))),
    layoutMs: rounded(median(samples.map((sample) => sample.layoutMs))),
    exportMs: rounded(median(samples.map((sample) => sample.exportMs))),
    totalMs: rounded(median(samples.map((sample) => sample.totalMs))),
  };
}

const advancedFixture = await readFile(
  resolve(process.cwd(), 'tests/fixtures/ecore/real-world/advanced.ecore'),
  'utf8',
);
const cases = [
  { name: 'realistic-small', source: advancedFixture },
  { name: 'stress-50', source: generateStressEcore({ classCount: 50, referencesPerClass: 2 }) },
  { name: 'stress-120', source: generateStressEcore({ classCount: 120, referencesPerClass: 2 }) },
];

describe('Phase 1 pipeline performance measurement', () => {
  it.each(cases)('records a non-gating median baseline for $name', async ({ name, source }) => {
    const samples: PipelineMeasurement[] = [];
    for (let run = 0; run < 3; run += 1) {
      samples.push(await measurePipeline(source, `${name}.ecore`));
    }
    const result = medianMeasurement(samples);

    console.info(`PERF_BASELINE ${name} ${JSON.stringify(result)}`);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.relationCount).toBeGreaterThanOrEqual(0);
  });
});
