import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DIAGRAM_FILTER } from '../../diagram/filter/diagram-filter';
import { FilterControls } from './FilterControls';

describe('FilterControls component', () => {
  it('renders closed button with default state', () => {
    const markup = renderToStaticMarkup(
      <FilterControls
        filters={DEFAULT_DIAGRAM_FILTER}
        onChangeFilters={() => {}}
        onResetFilters={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="filter-controls"');
    expect(markup).toContain('data-testid="toggle-filters-menu"');
    expect(markup).toContain('Filters');
    expect(markup).not.toContain('data-testid="filter-badge"');
  });

  it('renders badge when filters are active', () => {
    const activeFilters = {
      ...DEFAULT_DIAGRAM_FILTER,
      relations: {
        ...DEFAULT_DIAGRAM_FILTER.relations,
        inheritance: false,
      },
    };

    const markup = renderToStaticMarkup(
      <FilterControls
        filters={activeFilters}
        onChangeFilters={() => {}}
        onResetFilters={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="filter-badge"');
    expect(markup).toContain('1');
  });
});
