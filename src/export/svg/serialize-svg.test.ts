import { describe, expect, it } from 'vitest';
import type { DiagramModel, NodeTextLayout } from '../../diagram/model';
import type { LayoutModel } from '../../layout/model';
import { serializeSvg } from './serialize-svg';

function textLayout(node: DiagramModel['nodes'][number]): NodeTextLayout {
  return {
    title: { fullText: node.title, displayText: node.title, truncated: false },
    ...(node.stereotype === undefined
      ? {}
      : {
          stereotype: {
            fullText: node.stereotype,
            displayText: node.stereotype,
            truncated: false,
          },
        }),
    rows: node.rows.map((row) => ({
      rowId: row.id,
      primary: { fullText: row.primaryText, displayText: row.primaryText, truncated: false },
      ...(row.secondaryText === undefined
        ? {}
        : {
            secondary: {
              fullText: row.secondaryText,
              displayText: row.secondaryText,
              truncated: false,
            },
          }),
    })),
  };
}

function fixture(): { diagram: DiagramModel; layout: LayoutModel } {
  const source = {
    id: 'node:source',
    semanticId: 'class:source',
    kind: 'class' as const,
    title: 'Source <unsafe> & "quoted"',
    stereotype: '«abstract»',
    rows: [{
      id: 'row:source.notes',
      semanticId: 'attribute:source.notes',
      kind: 'attribute' as const,
      primaryText: 'notes : EString & <unsafe> "quoted"',
      secondaryText: 'annotation <script>alert("x")</script>',
    }],
    badges: [{
      id: 'badge:source',
      semanticId: 'class:source',
      label: 'ECORE_<warning> & "quoted"',
      tone: 'warning' as const,
    }],
  };
  const target = {
    id: 'node:target',
    semanticId: 'class:target',
    kind: 'class' as const,
    title: 'Target',
    rows: [],
    badges: [],
  };
  const relations: DiagramModel['relations'] = [
    {
      id: 'relation:generalization',
      kind: 'generalization',
      sourceNodeId: source.id,
      targetNodeId: target.id,
      semanticIds: ['class:source', 'class:target'],
    },
    {
      id: 'relation:composition',
      kind: 'composition',
      sourceNodeId: source.id,
      targetNodeId: target.id,
      sourceEnd: {
        classifierId: source.semanticId,
        roleName: 'owner',
        multiplicity: { lower: 1, upper: 1 },
        navigable: true,
      },
      targetEnd: {
        classifierId: target.semanticId,
        roleName: 'children',
        multiplicity: { lower: 0, upper: 'unbounded' },
        navigable: true,
        sourceReferenceId: 'reference:source.children',
      },
      semanticIds: ['reference:source.children', 'reference:target.owner'],
    },
    {
      id: 'relation:association',
      kind: 'association',
      sourceNodeId: source.id,
      targetNodeId: target.id,
      targetEnd: {
        classifierId: target.semanticId,
        roleName: 'targets',
        multiplicity: { lower: 0, upper: 1 },
        navigable: true,
        sourceReferenceId: 'reference:source.targets',
      },
      semanticIds: ['reference:source.targets'],
    },
  ];
  const diagram: DiagramModel = {
    nodes: [source, target],
    relations,
    sourceSemanticIds: new Set([
      source.semanticId,
      target.semanticId,
      ...relations.flatMap((relation) => relation.semanticIds),
    ]),
    diagnostics: [],
  };
  const layout: LayoutModel = {
    nodes: [
      {
        ...source,
        position: { x: 100, y: 80 },
        size: { width: 220, height: 140 },
        text: textLayout(source),
      },
      {
        ...target,
        position: { x: 400, y: 80 },
        size: { width: 220, height: 100 },
        text: textLayout(target),
      },
    ],
    relations: relations.map((relation, index) => ({
      ...relation,
      sections: [{
        start: { x: 320, y: 115 + index * 35 },
        bendPoints: [],
        end: { x: 400, y: 115 + index * 35 },
      }],
    })),
    bounds: { x: 100, y: 80, width: 520, height: 140 },
    profileId: 'test',
  };
  return { diagram, layout };
}

describe('serializeSvg', () => {
  it('produces deterministic, standalone, well-formed vector SVG', () => {
    const { diagram, layout } = fixture();
    const svg = serializeSvg(diagram, layout, { background: 'light', padding: 24 });
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');

    expect(svg).toBe(serializeSvg(diagram, layout, { background: 'light', padding: 24 }));
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.documentElement.localName).toBe('svg');
    expect(document.documentElement.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    expect(document.querySelector('foreignObject')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('image')).toBeNull();
    expect(document.querySelector('[data-export-background="light"]')).not.toBeNull();
  });

  it('escapes every model-controlled text surface without creating executable markup', () => {
    const { diagram, layout } = fixture();
    const svg = serializeSvg(diagram, layout, { background: 'transparent' });

    expect(svg).toContain('Source &lt;unsafe&gt; &amp; &quot;quoted&quot;');
    expect(svg).toContain('annotation &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(svg).toContain('ECORE_&lt;warning&gt; &amp; &quot;quoted&quot;');
    expect(svg).not.toContain('<script>');
    expect(svg).not.toMatch(/\son[a-z]+=\s*["']/i);
    expect(svg).not.toContain('foreignObject');
  });

  it('round-trips hostile role names and semantic IDs as inert XML data', () => {
    const { diagram, layout } = fixture();
    const hostileNodeId = `node:'<&"`;
    const hostileRelationId = `relation:'<&"`;
    diagram.nodes[0]!.id = hostileNodeId;
    diagram.relations[2]!.id = hostileRelationId;
    diagram.relations[2]!.sourceNodeId = hostileNodeId;
    diagram.relations[2]!.targetEnd!.roleName = `role'<&"`;
    layout.nodes[0]!.id = hostileNodeId;
    layout.relations[2]!.id = hostileRelationId;
    layout.relations[2]!.sourceNodeId = hostileNodeId;
    layout.relations[2]!.targetEnd!.roleName = `role'<&"`;
    const svg = serializeSvg(diagram, layout, { background: 'transparent' });
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const node = document.querySelector('[data-semantic-id="class:source"]');
    const relation = document.querySelector('[data-relation-kind="association"]');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(node?.getAttribute('data-node-id')).toBe(hostileNodeId);
    expect(relation?.getAttribute('data-relation-id')).toBe(hostileRelationId);
    expect(relation?.querySelector('text')?.textContent).toBe(`role'<&" 0..1`);
    expect(svg).toContain('&apos;');
  });

  it('keeps graph geometry, labels, and semantic marker direction inside the exported viewBox', () => {
    const { diagram, layout } = fixture();
    const svg = serializeSvg(diagram, layout, { background: 'transparent', padding: 24 });
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const viewBox = document.documentElement.getAttribute('viewBox')?.split(' ').map(Number);

    expect(viewBox).toHaveLength(4);
    const [x, y, width, height] = viewBox ?? [];
    expect(x).toBeLessThanOrEqual(76);
    expect(y).toBeLessThanOrEqual(56);
    expect((x ?? 0) + (width ?? 0)).toBeGreaterThanOrEqual(644);
    expect((y ?? 0) + (height ?? 0)).toBeGreaterThanOrEqual(244);
    expect([...document.querySelectorAll('[data-relation-id="relation:composition"] text')].map((item) => item.textContent))
      .toEqual(expect.arrayContaining(['owner 1', 'children 0..*']));

    expect(document.querySelector('defs marker#ecore-svg-generalization')).not.toBeNull();
    expect(document.querySelector('defs marker#ecore-svg-reference')).not.toBeNull();
    expect(document.querySelector('defs marker#ecore-svg-generalization')?.getAttribute('overflow')).toBe('visible');
    expect(document.querySelector('defs marker#ecore-svg-reference')?.getAttribute('overflow')).toBe('visible');
    expect(document.querySelector('[data-relation-id="relation:generalization"] path')?.getAttribute('marker-end'))
      .toBe('url(#ecore-svg-generalization)');
    expect(document.querySelector('[data-relation-id="relation:association"] path')?.getAttribute('marker-end'))
      .toBe('url(#ecore-svg-reference)');

    const diamond = document.querySelector('[data-relation-id="relation:composition"] polygon[data-marker="composition"]');
    const points = diamond?.getAttribute('points')?.split(' ').map((point) => point.split(',').map(Number));
    expect(points?.[0]).toEqual([320, 150]);
    expect(points?.[2]?.[0]).toBeGreaterThan(points?.[0]?.[0] ?? Number.POSITIVE_INFINITY);
  });

  it('uses DiagramModel as semantic authority when layout metadata is stale', () => {
    const { diagram, layout } = fixture();
    const staleLayout: LayoutModel = {
      ...layout,
      relations: layout.relations.map((relation) => relation.id === 'relation:composition'
        ? { ...relation, kind: 'association' }
        : relation),
    };
    const document = new DOMParser().parseFromString(
      serializeSvg(diagram, staleLayout, { background: 'light' }),
      'image/svg+xml',
    );

    const group = document.querySelector('[data-relation-id="relation:composition"]');
    expect(group?.getAttribute('data-relation-kind')).toBe('composition');
    expect(group?.querySelector('polygon[data-marker="composition"]')).not.toBeNull();
  });

  it('keeps a long wide-character edge role bounded and preserves multiplicity', () => {
    const { diagram, layout } = fixture();
    const roleName = 'W'.repeat(120);
    diagram.relations[2]!.targetEnd!.roleName = roleName;
    layout.relations[2]!.targetEnd!.roleName = roleName;
    const document = new DOMParser().parseFromString(
      serializeSvg(diagram, layout, { background: 'transparent', padding: 0 }),
      'image/svg+xml',
    );
    const label = document.querySelector('[data-relation-id="relation:association"] text');
    const displayText = label?.lastChild?.textContent;

    expect(displayText).toMatch(/… 0\.\.1$/);
    expect(displayText?.length).toBeLessThanOrEqual(36);
    expect(label?.querySelector('title')?.textContent).toBe(`${roleName} 0..1`);
  });

  it('changes only the export background when a themed background is requested', () => {
    const { diagram, layout } = fixture();
    const transparent = new DOMParser().parseFromString(
      serializeSvg(diagram, layout, { background: 'transparent' }),
      'image/svg+xml',
    );
    const dark = new DOMParser().parseFromString(
      serializeSvg(diagram, layout, { background: 'dark' }),
      'image/svg+xml',
    );

    expect(transparent.querySelector('[data-export-background]')).toBeNull();
    expect(dark.querySelector('[data-export-background="dark"]')?.getAttribute('fill')).toBe('#0f172a');
  });
});
