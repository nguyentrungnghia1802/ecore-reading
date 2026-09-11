import { describe, expect, it } from 'vitest';
import { buildEcoreModel } from '../../src/ecore/model';
import { parseRawEcore } from '../../src/ecore/parser';
import { generateStressEcore } from './generate-stress-model';

describe('deterministic stress Ecore generator', () => {
  it.each([50, 120])('generates a valid %i-class model with stable local references', (classCount) => {
    const first = generateStressEcore({ classCount, referencesPerClass: 2 });
    const second = generateStressEcore({ classCount, referencesPerClass: 2 });
    const raw = parseRawEcore(first, { sourceName: `stress-${classCount}.ecore` });
    const model = buildEcoreModel(raw);

    expect(first).toBe(second);
    expect(raw.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(model.classifiers).toHaveLength(classCount);
    expect(model.features.filter((feature) => feature.kind === 'reference')).toHaveLength(
      classCount * 2,
    );
    expect(model.features.every((feature) => feature.type?.kind !== 'external')).toBe(true);
  });

  it('rejects invalid generator sizes instead of producing malformed fixtures', () => {
    expect(() => generateStressEcore({ classCount: 0, referencesPerClass: 1 }))
      .toThrow('classCount');
    expect(() => generateStressEcore({ classCount: 10, referencesPerClass: -1 }))
      .toThrow('referencesPerClass');
  });
});
