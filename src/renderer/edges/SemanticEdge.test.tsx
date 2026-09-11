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
});
