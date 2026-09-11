import type { Diagnostic } from './diagnostic';

export interface Multiplicity {
  lower: number;
  upper: number | 'unbounded';
}

export interface MultiplicityResult {
  multiplicity: Multiplicity;
  rawLower: number | undefined;
  rawUpper: number | undefined;
  diagnostics: Diagnostic[];
}

function parseInteger(raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback;
  }

  if (!/^-?\d+$/.test(raw)) {
    return Number.NaN;
  }

  return Number(raw);
}

export function normalizeMultiplicity(
  rawLower: string | undefined,
  rawUpper: string | undefined,
  path?: string,
): MultiplicityResult {
  const lower = parseInteger(rawLower, 0);
  const parsedUpper = parseInteger(rawUpper, 1);
  const invalid =
    !Number.isSafeInteger(lower) ||
    !Number.isSafeInteger(parsedUpper) ||
    lower < 0 ||
    parsedUpper < -1 ||
    (parsedUpper !== -1 && lower > parsedUpper);
  const multiplicity: Multiplicity = {
    lower: Number.isSafeInteger(lower) && lower >= 0 ? lower : 0,
    upper:
      parsedUpper === -1
        ? 'unbounded'
        : Number.isSafeInteger(parsedUpper) && parsedUpper >= 0
          ? parsedUpper
          : 1,
  };

  return {
    multiplicity,
    rawLower: rawLower === undefined || !Number.isSafeInteger(lower) ? undefined : lower,
    rawUpper: rawUpper === undefined || !Number.isSafeInteger(parsedUpper) ? undefined : parsedUpper,
    diagnostics: invalid
      ? [
          {
            id: `ECORE_INVALID_BOUNDS:${path ?? 'unknown'}:${rawLower ?? ''}:${rawUpper ?? ''}`,
            code: 'ECORE_INVALID_BOUNDS',
            severity: 'error',
            message: `Invalid Ecore bounds lower=${rawLower ?? '<default>'}, upper=${rawUpper ?? '<default>'}.`,
            ...(path === undefined ? {} : { path }),
          },
        ]
      : [],
  };
}

export function formatMultiplicity(multiplicity: Multiplicity): string {
  const upper = multiplicity.upper === 'unbounded' ? '*' : String(multiplicity.upper);
  return multiplicity.upper === multiplicity.lower ? String(multiplicity.lower) : `${multiplicity.lower}..${upper}`;
}
