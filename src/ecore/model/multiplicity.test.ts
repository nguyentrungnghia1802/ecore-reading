import { describe, expect, it } from 'vitest';
import { formatMultiplicity, normalizeMultiplicity } from './multiplicity';

describe('multiplicity', () => {
  it.each([
    [undefined, undefined, { lower: 0, upper: 1 }, '0..1'],
    ['1', '1', { lower: 1, upper: 1 }, '1'],
    ['0', '-1', { lower: 0, upper: 'unbounded' }, '0..*'],
    ['1', '-1', { lower: 1, upper: 'unbounded' }, '1..*'],
    ['3', '3', { lower: 3, upper: 3 }, '3'],
    ['2', '5', { lower: 2, upper: 5 }, '2..5'],
  ] as const)(
    'normalizes lower=%s upper=%s using Ecore defaults',
    (rawLower, rawUpper, expected, label) => {
      const result = normalizeMultiplicity(rawLower, rawUpper);

      expect(result.multiplicity).toEqual(expected);
      expect(result.diagnostics).toEqual([]);
      expect(formatMultiplicity(result.multiplicity)).toBe(label);
    },
  );

  it.each([
    ['2', '1'],
    ['-1', '1'],
    ['0', '-2'],
    ['not-a-number', '1'],
  ])('diagnoses invalid bounds lower=%s upper=%s', (rawLower, rawUpper) => {
    const result = normalizeMultiplicity(rawLower, rawUpper);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe('ECORE_INVALID_BOUNDS');
  });
});
