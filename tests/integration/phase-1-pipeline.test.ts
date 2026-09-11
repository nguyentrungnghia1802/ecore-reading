import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRawEcore } from '../../src/ecore/parser';
import { validateLayoutModel } from '../../src/layout';
import type { Point } from '../../src/layout/model';
import { generateStressEcore } from '../fixtures/generate-stress-model';
import { runPhaseOnePipeline } from '../support/run-phase-one-pipeline';

const fixtureDirectory = resolve(process.cwd(), 'tests/fixtures/ecore');
const realisticFixtures = [
  'real-world/advanced.ecore',
  'real-world/research-workflow.ecore',
  'real-world/workflow-engine.ecore',
] as const;

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

function expectFinitePoint(point: Point): void {
  expect(Number.isFinite(point.x)).toBe(true);
  expect(Number.isFinite(point.y)).toBe(true);
}

function expectInsideBounds(
  point: Point,
  bounds: { x: number; y: number; width: number; height: number },
): void {
  const tolerance = 0.001;
  expect(point.x).toBeGreaterThanOrEqual(bounds.x - tolerance);
  expect(point.y).toBeGreaterThanOrEqual(bounds.y - tolerance);
  expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width + tolerance);
  expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height + tolerance);
}

function assertPipelineInvariants(result: Awaited<ReturnType<typeof runPhaseOnePipeline>>): void {
  expect(result.raw.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  expect(result.model.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  expect(sorted(result.model.classifiers.map((classifier) => classifier.id))).toEqual(
    sorted(result.diagram.nodes.filter((node) => node.kind !== 'external').map((node) => node.semanticId)),
  );
  expect(sorted(result.diagram.nodes.map((node) => node.id))).toEqual(
    sorted(result.sized.nodes.map((node) => node.id)),
  );
  expect(sorted(result.diagram.nodes.map((node) => node.id))).toEqual(
    sorted(result.layout.nodes.map((node) => node.id)),
  );
  expect(sorted(result.diagram.relations.map((relation) => relation.id))).toEqual(
    sorted(result.layout.relations.map((relation) => relation.id)),
  );
  expect(result.diagram.nodes.every((node) => result.diagram.sourceSemanticIds.has(node.semanticId)))
    .toBe(true);
  expect(result.diagram.relations.every((relation) => relation.semanticIds.every(
    (semanticId) => result.diagram.sourceSemanticIds.has(semanticId),
  ))).toBe(true);
  expect(validateLayoutModel(result.layout, result.sized)).toEqual([]);

  expectFinitePoint(result.layout.bounds);
  expect(Number.isFinite(result.layout.bounds.width)).toBe(true);
  expect(Number.isFinite(result.layout.bounds.height)).toBe(true);
  for (const node of result.layout.nodes) {
    expectFinitePoint(node.position);
    expect(node.size.width).toBeGreaterThan(0);
    expect(node.size.height).toBeGreaterThan(0);
    expectInsideBounds(node.position, result.layout.bounds);
    expectInsideBounds({
      x: node.position.x + node.size.width,
      y: node.position.y + node.size.height,
    }, result.layout.bounds);
  }
  for (const relation of result.layout.relations) {
    expect(relation.sections.length).toBeGreaterThan(0);
    for (const section of relation.sections) {
      for (const point of [section.start, ...section.bendPoints, section.end]) {
        expectFinitePoint(point);
        expectInsideBounds(point, result.layout.bounds);
      }
    }
  }

  const svgDocument = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
  expect(svgDocument.querySelector('parsererror')).toBeNull();
  expect(sorted([...svgDocument.querySelectorAll('[data-node-id]')].map(
    (element) => element.getAttribute('data-node-id') ?? '',
  ))).toEqual(sorted(result.diagram.nodes.map((node) => node.id)));
  expect(sorted([...svgDocument.querySelectorAll('[data-relation-id]')].map(
    (element) => element.getAttribute('data-relation-id') ?? '',
  ))).toEqual(sorted(result.diagram.relations.map((relation) => relation.id)));
}

describe('Phase 1 complete semantic to SVG pipeline', () => {
  it.each(realisticFixtures)('preserves IDs and bounded geometry for %s', async (fixture) => {
    const source = await readFile(resolve(fixtureDirectory, fixture), 'utf8');
    assertPipelineInvariants(await runPhaseOnePipeline(source, fixture));
  }, 30_000);

  it.each([50, 120])('preserves IDs and bounded geometry for a %i-node stress model', async (classCount) => {
    const sourceName = `stress-${classCount}.ecore`;
    const source = generateStressEcore({ classCount, referencesPerClass: 2 });
    const result = await runPhaseOnePipeline(source, sourceName, 'compact');

    expect(result.diagram.nodes).toHaveLength(classCount);
    expect(result.diagram.relations.length).toBeGreaterThan(classCount * 2);
    assertPipelineInvariants(result);
  }, 30_000);

  it('recovers from malformed input at the non-UI boundary', async () => {
    const malformed = await readFile(resolve(fixtureDirectory, 'malformed.xml'), 'utf8');
    const invalid = parseRawEcore(malformed, { sourceName: 'malformed.xml' });
    expect(invalid.packages).toEqual([]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.code)).toContain('XML_PARSE_ERROR');

    const valid = await readFile(resolve(fixtureDirectory, 'minimal.ecore'), 'utf8');
    const recovered = await runPhaseOnePipeline(valid, 'minimal.ecore');
    expect(recovered.layout.nodes).toHaveLength(1);
    assertPipelineInvariants(recovered);
  });
});
