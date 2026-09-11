import { useEffect, useRef, useState } from 'react';
import {
  activeFilterCount,
  isDefaultFilter,
  type DiagramFilterOptions,
} from '../../diagram/filter/diagram-filter';

export interface FilterControlsProps {
  filters: DiagramFilterOptions;
  onChangeFilters: (filters: DiagramFilterOptions) => void;
  onResetFilters: () => void;
}

export function FilterControls({
  filters,
  onChangeFilters,
  onResetFilters,
}: FilterControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCount = activeFilterCount(filters);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleNodeFilter = (key: keyof DiagramFilterOptions['nodes']) => {
    onChangeFilters({
      ...filters,
      nodes: {
        ...filters.nodes,
        [key]: !filters.nodes[key],
      },
    });
  };

  const toggleRelationFilter = (key: keyof DiagramFilterOptions['relations']) => {
    onChangeFilters({
      ...filters,
      relations: {
        ...filters.relations,
        [key]: !filters.relations[key],
      },
    });
  };

  return (
    <div className="filter-controls" ref={containerRef} data-testid="filter-controls">
      <button
        type="button"
        className={`filter-controls__btn ${activeCount > 0 ? 'filter-controls__btn--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="toggle-filters-menu"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Filter diagram nodes and relations"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="filter-controls__badge" data-testid="filter-badge">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="filter-controls__popover"
          data-testid="filter-popover"
          role="dialog"
          aria-label="Diagram Filters"
        >
          <div className="filter-controls__header">
            <span className="filter-controls__title">Diagram Filters</span>
            {!isDefaultFilter(filters) && (
              <button
                type="button"
                className="filter-controls__reset-btn"
                onClick={onResetFilters}
                data-testid="reset-filters"
                title="Reset all filters to default (all enabled)"
              >
                Reset
              </button>
            )}
          </div>

          <div className="filter-controls__section">
            <div className="filter-controls__section-title">Relations</div>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.relations.inheritance}
                onChange={() => toggleRelationFilter('inheritance')}
                data-testid="filter-relation-inheritance"
              />
              <span>Inheritance (Generalization)</span>
            </label>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.relations.containment}
                onChange={() => toggleRelationFilter('containment')}
                data-testid="filter-relation-containment"
              />
              <span>Containment (Composition)</span>
            </label>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.relations.references}
                onChange={() => toggleRelationFilter('references')}
                data-testid="filter-relation-references"
              />
              <span>Ordinary References</span>
            </label>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.relations.externals}
                onChange={() => toggleRelationFilter('externals')}
                data-testid="filter-relation-externals"
              />
              <span>External References</span>
            </label>
          </div>

          <div className="filter-controls__section">
            <div className="filter-controls__section-title">Classifiers / Nodes</div>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.nodes.classes}
                onChange={() => toggleNodeFilter('classes')}
                data-testid="filter-node-classes"
              />
              <span>Classes</span>
            </label>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.nodes.enums}
                onChange={() => toggleNodeFilter('enums')}
                data-testid="filter-node-enums"
              />
              <span>Enums</span>
            </label>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.nodes.datatypes}
                onChange={() => toggleNodeFilter('datatypes')}
                data-testid="filter-node-datatypes"
              />
              <span>Data Types</span>
            </label>
            <label className="filter-controls__item">
              <input
                type="checkbox"
                checked={filters.nodes.externals}
                onChange={() => toggleNodeFilter('externals')}
                data-testid="filter-node-externals"
              />
              <span>External Placeholders</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
