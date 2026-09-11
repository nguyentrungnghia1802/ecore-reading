import { describe, expect, it } from 'vitest';
import { sanitizeExportFilename } from './filename';

describe('sanitizeExportFilename', () => {
  it('formats standard .ecore filename correctly', () => {
    expect(sanitizeExportFilename('workflow.ecore', 'svg')).toBe('workflow-ecore-diagram.svg');
    expect(sanitizeExportFilename('my-metamodel.xmi', 'png')).toBe('my-metamodel-ecore-diagram.png');
  });

  it('strips paths and sanitizes unsafe characters', () => {
    expect(sanitizeExportFilename('C:\\models\\research/complex?*model.ecore', 'svg')).toBe(
      'complex--model-ecore-diagram.svg',
    );
    expect(sanitizeExportFilename('deep:nested"file<name>.xml', 'png')).toBe(
      'deep-nested-file-name--ecore-diagram.png',
    );
  });

  it('handles spaces and empty basenames safely', () => {
    expect(sanitizeExportFilename('My Cool Model.ecore', 'png')).toBe(
      'My-Cool-Model-ecore-diagram.png',
    );
    expect(sanitizeExportFilename('.ecore', 'svg')).toBe('metamodel-ecore-diagram.svg');
    expect(sanitizeExportFilename('', 'svg')).toBe('metamodel-ecore-diagram.svg');
  });
});
