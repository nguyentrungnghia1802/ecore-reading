import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SearchIndexItem } from '../../search/search-index';
import { SearchDialog } from './SearchDialog';

describe('SearchDialog component', () => {
  const sampleIndex: SearchIndexItem[] = [
    {
      id: 'class:Agent',
      name: 'Agent',
      kind: 'class',
      contextText: 'EClass • core',
    },
    {
      id: 'attr:Agent.name',
      name: 'name',
      kind: 'attribute',
      contextText: 'EAttribute • Agent',
      ownerNodeId: 'class:Agent',
    },
    {
      id: 'ref:Agent.beliefs',
      name: 'beliefs',
      kind: 'reference',
      contextText: 'EReference • Agent',
      ownerNodeId: 'class:Agent',
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const markup = renderToStaticMarkup(
      <SearchDialog
        index={sampleIndex}
        isOpen={false}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders input and search modal when isOpen is true', () => {
    const markup = renderToStaticMarkup(
      <SearchDialog
        index={sampleIndex}
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="search-dialog"');
    expect(markup).toContain('data-testid="search-input"');
    expect(markup).toContain('Search classes, features, packages');
  });
});
