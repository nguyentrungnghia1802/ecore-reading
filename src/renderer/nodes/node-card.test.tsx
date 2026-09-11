import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UmlNodeData } from '../canvas/react-flow-adapter';
import { NodeCard } from './NodeCard';

describe('NodeCard', () => {
  it('renders accessible class compartments at precomputed dimensions', () => {
    const data: UmlNodeData = {
      semanticId: 'class:Agent',
      kind: 'class',
      title: 'Agent',
      stereotype: '«abstract»',
      rows: [
        { id: 'row:name', semanticId: 'attribute:Agent.name', kind: 'attribute', primaryText: 'name : EString' },
        { id: 'row:run', semanticId: 'operation:Agent.run', kind: 'operation', primaryText: 'run() : void' },
      ],
      badges: [],
      size: { width: 260, height: 124 },
      text: {
        title: { fullText: 'Agent', displayText: 'Agent', truncated: false },
        stereotype: { fullText: '«abstract»', displayText: '«abstract»', truncated: false },
        rows: [
          { rowId: 'row:name', primary: { fullText: 'name : EString', displayText: 'name : EString', truncated: false } },
          { rowId: 'row:run', primary: { fullText: 'run() : void', displayText: 'run() : void', truncated: false } },
        ],
      },
      selectedState: 'selected',
      onSelectRow: vi.fn(),
    };

    const markup = renderToStaticMarkup(<NodeCard data={data} />);

    expect(markup).toContain('aria-label="class Agent"');
    expect(markup).toContain('aria-label="Select name : EString"');
    expect(markup).toContain('width:260px');
    expect(markup).toContain('height:124px');
    expect(markup).toContain('uml-node--selected');
    expect(markup).toContain('uml-node__compartment');
  });

  it('marks external targets explicitly in accessible text', () => {
    const markup = renderToStaticMarkup(<NodeCard data={{
      semanticId: 'external:Remote',
      kind: 'external',
      title: 'Remote',
      stereotype: '«external unresolved»',
      rows: [],
      badges: [],
      size: { width: 220, height: 52 },
      text: {
        title: { fullText: 'Remote', displayText: 'Remote', truncated: false },
        stereotype: { fullText: '«external unresolved»', displayText: '«external unresolved»', truncated: false },
        rows: [],
      },
      selectedState: 'normal',
    }} />);

    expect(markup).toContain('aria-label="external unresolved Remote"');
  });
});
