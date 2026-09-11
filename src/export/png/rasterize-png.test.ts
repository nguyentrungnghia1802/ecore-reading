import { describe, expect, it } from 'vitest';
import { calculatePngDimensions, parseSvgViewBox } from './rasterize-png';

describe('PNG rasterization helpers', () => {
  it('parses viewBox width and height from SVG string', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect /></svg>';
    expect(parseSvgViewBox(svg)).toEqual({ width: 1200, height: 800 });
  });

  it('falls back to explicit width and height attributes when viewBox is missing', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect /></svg>';
    expect(parseSvgViewBox(svg)).toEqual({ width: 640, height: 480 });
  });

  it('calculates PNG dimensions at 2x scale by default', () => {
    const dimensions = calculatePngDimensions(500, 300);
    expect(dimensions).toEqual({ width: 1000, height: 600 });
  });

  it('calculates PNG dimensions at custom scales 1x, 3x, and 4x', () => {
    expect(calculatePngDimensions(400, 200, 1)).toEqual({ width: 400, height: 200 });
    expect(calculatePngDimensions(400, 200, 3)).toEqual({ width: 1200, height: 600 });
    expect(calculatePngDimensions(400, 200, 4)).toEqual({ width: 1600, height: 800 });
  });

  it('clamps extreme scale values to safe bounds [1, 4]', () => {
    expect(calculatePngDimensions(100, 100, 0.2)).toEqual({ width: 100, height: 100 });
    expect(calculatePngDimensions(100, 100, 10)).toEqual({ width: 400, height: 400 });
  });
});
