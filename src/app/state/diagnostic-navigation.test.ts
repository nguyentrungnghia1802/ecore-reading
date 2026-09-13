import { describe, expect, it } from 'vitest';
import type { Diagnostic, EcoreModel } from '../../ecore/model';
import type { LayoutModel } from '../../layout/model';
import { resolveDiagnosticNavigation } from './diagnostic-navigation';

const layout = {
  nodes: [
    { id: 'node:A', semanticId: 'class:A', rows: [{ semanticId: 'ref:A.b' }], position: { x: 0, y: 0 }, size: { width: 100, height: 70 } },
    { id: 'node:B', semanticId: 'class:B', rows: [{ semanticId: 'ref:B.a' }], position: { x: 300, y: 0 }, size: { width: 100, height: 70 } },
  ],
  relations: [
    { id: 'edge:A.b', semanticIds: ['ref:A.b'], sourceNodeId: 'node:A', targetNodeId: 'node:B' },
    { id: 'edge:B.a', semanticIds: ['ref:B.a'], sourceNodeId: 'node:B', targetNodeId: 'node:A' },
  ],
} as LayoutModel;
const model = {
  featureById: new Map([['ref:A.b', { ownerClassId: 'class:A' }]]),
  operationById: new Map(),
  parameterById: new Map(),
} as unknown as EcoreModel;

describe('diagnostic navigation mapping', () => {
  it('selects a relation and highlights both related edges and endpoints', () => {
    const diagnostic: Diagnostic = { id: 'd', code: 'ECORE_INVALID_OPPOSITE', severity: 'error', message: 'Mismatch', semanticId: 'ref:A.b', relatedElementIds: ['ref:B.a'] };
    expect(resolveDiagnosticNavigation(diagnostic, model, layout)).toMatchObject({
      selection: { kind: 'relation', primarySemanticId: 'ref:A.b' },
      highlightedRelationIds: ['edge:A.b', 'edge:B.a'],
      highlightedNodeIds: ['node:A', 'node:B'],
      focusNodeIds: ['node:A', 'node:B'],
    });
  });

  it('falls back to owner node when a broken target has no rendered edge or row', () => {
    const filtered = { ...layout, nodes: [{ ...layout.nodes[0]!, rows: [] }], relations: [] } as LayoutModel;
    const diagnostic: Diagnostic = { id: 'd', code: 'ECORE_UNRESOLVED_LOCAL_REFERENCE', severity: 'error', message: 'Missing', semanticId: 'ref:A.b' };
    expect(resolveDiagnosticNavigation(diagnostic, model, filtered)).toMatchObject({
      selection: { kind: 'node', primarySemanticId: 'class:A' },
      highlightedNodeIds: ['node:A'],
      highlightedRelationIds: [],
    });
  });

  it('retains a diagnostic without a renderable source and never guesses a target', () => {
    const diagnostic: Diagnostic = { id: 'd', code: 'XML_PARSE_ERROR', severity: 'error', message: 'Bad XML' };
    expect(resolveDiagnosticNavigation(diagnostic, model, layout)).toEqual({
      selection: null, highlightedNodeIds: [], highlightedRelationIds: [], focusNodeIds: [],
    });
  });
});
