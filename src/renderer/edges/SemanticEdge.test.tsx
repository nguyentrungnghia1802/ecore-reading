import { Position } from '@xyflow/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SemanticEdgeData } from '../canvas/react-flow-adapter';
import { SemanticEdge } from './SemanticEdge';

const composition: SemanticEdgeData = {
  semanticIds: ['reference:Folder.documents', 'reference:Document.folder'],
  selectedState: 'selected',
  relation: {
    id: 'relation:composition', kind: 'composition', sourceNodeId: 'node:Folder', targetNodeId: 'node:Document',
    sourceEnd: {
      classifierId: 'class:Folder', roleName: 'folder', multiplicity: { lower: 0, upper: 1 },
      navigable: true, sourceReferenceId: 'reference:Document.folder',
    },
    targetEnd: {
      classifierId: 'class:Document', roleName: 'documents', multiplicity: { lower: 0, upper: 'unbounded' },
      navigable: true, sourceReferenceId: 'reference:Folder.documents',
    },
    semanticIds: ['reference:Folder.documents', 'reference:Document.folder'],
    sections: [{ start: { x: 10, y: 20 }, bendPoints: [], end: { x: 80, y: 20 } }],
  },
};

describe('SemanticEdge', () => {
  it('renders precomputed routes, end labels and monochrome-distinct marker geometry', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <SemanticEdge
          data={composition}
          id="relation:composition"
          selectable
          source="node:Folder"
          sourcePosition={Position.Right}
          sourceX={10}
          sourceY={20}
          target="node:Document"
          targetPosition={Position.Left}
          targetX={80}
          targetY={20}
        />
      </svg>,
    );

    expect(markup).toContain('M 10 20 L 80 20');
    expect(markup).toContain('semantic-edge__marker--uml-filled-diamond');
    expect(markup).toContain('semantic-edge__marker--uml-navigable-arrow');
    expect(markup).toContain('folder 0..1');
    expect(markup).toContain('documents 0..*');
    expect(markup).toContain('semantic-edge__path--selected');
  });

  it('updates path and marker points dynamically when runtime coordinates move', () => {
    // Simulate source handle moved from (10, 20) to (50, 60)
    const markup = renderToStaticMarkup(
      <svg>
        <SemanticEdge
          data={composition}
          id="relation:composition"
          selectable
          source="node:Folder"
          sourcePosition={Position.Right}
          sourceX={50}
          sourceY={60}
          target="node:Document"
          targetPosition={Position.Left}
          targetX={120}
          targetY={80}
        />
      </svg>,
    );

    // Path must start at (50, 60) and end at (120, 80)
    expect(markup).toContain('M 50 60');
    expect(markup).toContain('L 120 80');
    // Diamond marker at source must anchor at (50, 60)
    expect(markup).toContain('points="50,60');
    // Navigable arrow at target must anchor at (120, 80)
    expect(markup).toContain('points="120,80');
  });

  it('updates generalization triangle position dynamically when super-class moves', () => {
    const generalizationData: SemanticEdgeData = {
      semanticIds: ['class:Child', 'class:Parent'],
      selectedState: 'normal',
      relation: {
        id: 'rel:gen',
        kind: 'generalization',
        sourceNodeId: 'node:Child',
        targetNodeId: 'node:Parent',
        semanticIds: ['class:Child', 'class:Parent'],
        sections: [{ start: { x: 100, y: 200 }, bendPoints: [], end: { x: 100, y: 80 } }],
      },
    };

    // Simulate Parent (target) dragged from y=80 to y=40, and x from 100 to 150
    const markup = renderToStaticMarkup(
      <svg>
        <SemanticEdge
          data={generalizationData}
          id="rel:gen"
          selectable
          source="node:Child"
          sourcePosition={Position.Top}
          sourceX={100}
          sourceY={200}
          target="node:Parent"
          targetPosition={Position.Bottom}
          targetX={150}
          targetY={40}
        />
      </svg>,
    );

    expect(markup).toContain('M 100 200');
    expect(markup).toContain('L 150 40');
    expect(markup).toContain('semantic-edge__marker--uml-hollow-triangle');
    // Triangle tip must be anchored at target endpoint (150, 40)
    expect(markup).toContain('points="150,40');
  });

  it('renders diagnostic highlight class when selectedState is diagnostic', () => {
    const diagnosticData: SemanticEdgeData = {
      ...composition,
      selectedState: 'diagnostic',
    };
    const markup = renderToStaticMarkup(
      <svg>
        <SemanticEdge
          data={diagnosticData}
          id="relation:composition"
          selectable
          source="node:Folder"
          sourcePosition={Position.Right}
          sourceX={10}
          sourceY={20}
          target="node:Document"
          targetPosition={Position.Left}
          targetX={80}
          targetY={20}
        />
      </svg>,
    );
    expect(markup).toContain('semantic-edge__path--diagnostic');
  });
});

