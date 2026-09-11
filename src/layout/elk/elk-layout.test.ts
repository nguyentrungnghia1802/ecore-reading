import { describe, expect, it } from 'vitest';
import type { DiagramModel, DiagramNode, DiagramRelation } from '../../diagram/model';
import { sizeDiagram } from '../../diagram/sizing';
import { toElkGraph } from './elk-graph';
import { layoutSizedDiagram } from './elk-layout';
import { getLayoutProfile, LAYOUT_PROFILES } from '../profiles/layout-profiles';
import { validateLayoutModel } from '../validation/validate-layout';

function node(id: string): DiagramNode {
  return { id, semanticId: id.slice(5), kind: 'class', title: id, rows: [], badges: [] };
}

function relation(
  id: string,
  kind: DiagramRelation['kind'],
  sourceNodeId: string,
  targetNodeId: string,
): DiagramRelation {
  return { id, kind, sourceNodeId, targetNodeId, semanticIds: [id] };
}

function corpus(): ReturnType<typeof sizeDiagram> {
  const nodes = ['node:A', 'node:B', 'node:C', 'node:D', 'node:E'].map(node);
  const relations = [
    relation('general:A-C', 'generalization', 'node:C', 'node:A'),
    relation('general:B-C', 'generalization', 'node:C', 'node:B'),
    relation('contain:C-D', 'composition', 'node:C', 'node:D'),
    relation('parallel:1', 'association', 'node:D', 'node:E'),
    relation('parallel:2', 'association', 'node:D', 'node:E'),
    relation('self:E', 'association', 'node:E', 'node:E'),
  ];
  const diagram: DiagramModel = {
    nodes,
    relations,
    sourceSemanticIds: new Set([...nodes.map((item) => item.semanticId), ...relations.map((item) => item.id)]),
    diagnostics: [],
  };
  return sizeDiagram(diagram);
}

describe('ELK layout adapter', () => {
  it('defines the three project-owned routing profiles', () => {
    expect(Object.keys(LAYOUT_PROFILES)).toEqual(['hierarchy-down', 'hierarchy-right', 'compact']);
    expect(getLayoutProfile('hierarchy-down').elkOptions).toMatchObject({
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
    });
    expect(getLayoutProfile('hierarchy-right').elkOptions['elk.direction']).toBe('RIGHT');
    expect(getLayoutProfile('compact').elkOptions['elk.spacing.nodeNode']).toBe('24');
  });

  it('converts every stable node, port and relation ID without deduplicating edges', () => {
    const input = corpus();
    const graph = toElkGraph(input, getLayoutProfile('hierarchy-down'));

    expect(graph.children?.map((child) => child.id)).toEqual(input.nodes.map((item) => item.id));
    expect(graph.children?.[0]?.width).toBe(input.nodes[0]?.size.width);
    expect(graph.edges?.map((edge) => edge.id)).toEqual(input.relations.map((item) => item.id));
    expect(graph.edges?.filter((edge) => edge.sources[0] === 'node:D' && edge.targets[0] === 'node:E')).toHaveLength(2);
    expect(graph.edges?.find((edge) => edge.id === 'self:E')).toMatchObject({
      sources: ['node:E'], targets: ['node:E'],
    });
  });

  it.each(['hierarchy-down', 'hierarchy-right', 'compact'] as const)(
    'lays out dense semantic cases with finite geometry using %s',
    async (profileId) => {
      const input = corpus();
      const output = await layoutSizedDiagram(input, getLayoutProfile(profileId));

      expect(output.profileId).toBe(profileId);
      expect(output.nodes.map((item) => item.id).sort()).toEqual(input.nodes.map((item) => item.id).sort());
      expect(output.relations.map((item) => item.id).sort()).toEqual(input.relations.map((item) => item.id).sort());
      expect(validateLayoutModel(output, input)).toEqual([]);
      const self = output.relations.find((item) => item.id === 'self:E');
      expect(self?.sections.length).toBeGreaterThan(0);
      expect(self?.sections[0]?.start).not.toEqual(self?.sections[0]?.end);
    },
  );

  it('produces stable normalized layout output for identical input', async () => {
    const input = corpus();
    const profile = getLayoutProfile('hierarchy-down');
    const normalize = (value: Awaited<ReturnType<typeof layoutSizedDiagram>>) => ({
      nodes: value.nodes.map(({ id, position, size }) => ({ id, position, size })),
      relations: value.relations.map(({ id, sections }) => ({ id, sections })),
      bounds: value.bounds,
    });

    expect(normalize(await layoutSizedDiagram(input, profile))).toEqual(
      normalize(await layoutSizedDiagram(input, profile)),
    );
  });

  it('rejects non-finite geometry returned by the layout engine', async () => {
    const input = sizeDiagram({
      nodes: [node('node:Broken')],
      relations: [],
      sourceSemanticIds: new Set(['Broken']),
      diagnostics: [],
    });
    const engine = {
      layout: () => Promise.resolve({
        id: 'root',
        width: 100,
        height: 100,
        children: [{ id: 'node:Broken', x: Number.NaN, y: 0, width: 220, height: 52 }],
      }),
    };

    await expect(
      layoutSizedDiagram(input, getLayoutProfile('compact'), engine),
    ).rejects.toThrow('non-finite geometry');
  });
});
