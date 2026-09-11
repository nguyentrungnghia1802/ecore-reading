import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SearchIndexItem } from '../../search/search-index';
import { searchIndex } from '../../search/search-index';

interface SearchDialogProps {
  index: readonly SearchIndexItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SearchIndexItem) => void;
}

export function SearchDialog({ index, isOpen, onClose, onSelect }: SearchDialogProps) {
  if (!isOpen) return null;
  return <SearchDialogContent index={index} onClose={onClose} onSelect={onSelect} />;
}

function SearchDialogContent({
  index,
  onClose,
  onSelect,
}: Omit<SearchDialogProps, 'isOpen'>) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    return searchIndex(index, query, 30);
  }, [index, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = results[activeIndex];
      if (current) {
        onSelect(current.item);
        onClose();
      }
    }
  };

  return (
    <div
      className="search-modal-backdrop"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      data-testid="search-dialog"
      role="presentation"
    >
      <div
        className="search-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search metamodel"
      >
        <div className="search-dialog__input-wrapper">
          <svg className="search-dialog__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-dialog__input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search classes, features, packages… (Esc to close)"
            data-testid="search-input"
            aria-autocomplete="list"
            aria-controls="search-results-list"
          />
          <kbd className="search-dialog__kbd">ESC</kbd>
        </div>

        <div
          id="search-results-list"
          className="search-dialog__results"
          role="listbox"
          data-testid="search-results"
        >
          {query.trim().length > 0 && results.length === 0 && (
            <div className="search-dialog__empty" data-testid="search-no-results">
              No metamodel elements found for &quot;{query}&quot;.
            </div>
          )}

          {query.trim().length === 0 && (
            <div className="search-dialog__hint">
              Type to search classifiers, features, and packages…
            </div>
          )}

          {results.map(({ item }, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                className={`search-result-item ${isActive ? 'search-result-item--active' : ''}`}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                aria-selected={isActive}
                data-testid="search-result-item"
                data-semantic-id={item.id}
              >
                <KindIcon kind={item.kind} />
                <div className="search-result-item__text">
                  <div className="search-result-item__name">{item.name}</div>
                  <div className="search-result-item__context">{item.contextText}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: SearchIndexItem['kind'] }) {
  let letter = 'C';
  let className = 'kind-badge--class';

  switch (kind) {
    case 'enum':
      letter = 'E';
      className = 'kind-badge--enum';
      break;
    case 'datatype':
      letter = 'T';
      className = 'kind-badge--datatype';
      break;
    case 'attribute':
      letter = 'A';
      className = 'kind-badge--attribute';
      break;
    case 'reference':
      letter = 'R';
      className = 'kind-badge--reference';
      break;
    case 'operation':
      letter = 'M';
      className = 'kind-badge--operation';
      break;
    case 'literal':
      letter = 'L';
      className = 'kind-badge--literal';
      break;
    case 'package':
      letter = 'P';
      className = 'kind-badge--package';
      break;
  }

  return (
    <span className={`kind-badge ${className}`} aria-label={kind}>
      {letter}
    </span>
  );
}
