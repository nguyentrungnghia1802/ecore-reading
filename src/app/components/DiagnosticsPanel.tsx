import { useState } from 'react';
import type { Diagnostic, DiagnosticSeverity } from '../../ecore/model';

export interface DiagnosticsPanelProps {
  diagnostics: readonly Diagnostic[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isOpen?: boolean | undefined;
  onToggleOpen?: (() => void) | undefined;
}

type SeverityFilter = DiagnosticSeverity | 'all';
const rank: Record<DiagnosticSeverity, number> = { error: 0, warning: 1, info: 2 };
const filters: { id: SeverityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'error', label: 'Errors' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info', label: 'Info' },
];

const severityIcons: Record<DiagnosticSeverity, string> = {
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

export function DiagnosticsPanel({
  diagnostics,
  selectedId,
  onSelect,
  isOpen,
  onToggleOpen,
}: DiagnosticsPanelProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isOpen === false) {
    return (
      <aside
        className="diagnostics-panel diagnostics-panel--collapsed"
        data-testid="diagnostics-panel-collapsed"
        aria-label="Diagnostics Panel (Collapsed)"
      >
        <button
          type="button"
          className="diagnostics-panel__expand-btn"
          onClick={onToggleOpen}
          data-testid="toggle-diagnostics"
          aria-label="Expand Diagnostics Panel"
          title="Expand Diagnostics Panel"
        >
          <span className="diagnostics-panel__expand-icon" aria-hidden="true">⚠️</span>
          <span className="diagnostics-panel__expand-label">Diagnostics</span>
          {diagnostics.length > 0 && (
            <span className="diagnostics-panel__badge">{diagnostics.length}</span>
          )}
        </button>
      </aside>
    );
  }

  const ordered = [...diagnostics].sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id),
  );
  const visible = ordered.filter((item) => filter === 'all' || item.severity === filter);
  const counts = {
    error: diagnostics.filter((item) => item.severity === 'error').length,
    warning: diagnostics.filter((item) => item.severity === 'warning').length,
    info: diagnostics.filter((item) => item.severity === 'info').length,
  };

  return (
    <aside
      className="diagnostics-panel"
      aria-label="Diagnostics Panel"
      data-testid="diagnostics-panel"
    >
      <div className="diagnostics-panel__header">
        <div className="diagnostics-panel__title-group">
          <h2>Diagnostics</h2>
          <button
            type="button"
            className="diagnostics-panel__clear-btn"
            onClick={() => {
              setExpandedId(null);
              onSelect(null);
            }}
            disabled={selectedId === null}
            data-testid="clear-highlight"
          >
            Clear highlight
          </button>
        </div>
        {onToggleOpen && (
          <button
            type="button"
            className="diagnostics-panel__close-btn"
            onClick={onToggleOpen}
            aria-label="Close Diagnostics Panel"
            data-testid="close-diagnostics"
            title="Close Diagnostics Panel"
          >
            ✕
          </button>
        )}
      </div>

      <div className="diagnostics-panel__toolbar">
        <p className="diagnostics-panel__summary" aria-live="polite">
          {counts.error} {counts.error === 1 ? 'Error' : 'Errors'} · {counts.warning}{' '}
          {counts.warning === 1 ? 'Warning' : 'Warnings'} · {counts.info} Info
        </p>
        <div
          className="diagnostics-panel__filters"
          role="group"
          aria-label="Filter diagnostics by severity"
        >
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`diagnostics-panel__filter-btn ${filter === id ? 'diagnostics-panel__filter-btn--active' : ''}`}
              aria-pressed={filter === id}
              data-testid={`filter-${id === 'all' ? 'all' : id === 'error' ? 'errors' : id === 'warning' ? 'warnings' : 'info'}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {diagnostics.length === 0 ? (
        <p className="diagnostics-panel__empty" data-testid="diagnostics-empty">
          No diagnostics in this model.
        </p>
      ) : visible.length === 0 ? (
        <p className="diagnostics-panel__empty" data-testid="diagnostics-empty-filter">
          No diagnostics match this filter.
        </p>
      ) : (
        <ul className="diagnostics-panel__list">
          {visible.map((diagnostic) => {
            const isSelected = selectedId === diagnostic.id;
            const isExpanded = expandedId === diagnostic.id || isSelected;
            const sourceId = diagnostic.sourceElementId ?? diagnostic.semanticId;
            return (
              <li
                key={diagnostic.id}
                className={`diagnostics-panel__item diagnostics-panel__item--${diagnostic.severity} ${isSelected ? 'diagnostics-panel__item--selected' : ''}`}
                data-testid="diagnostic-item"
              >
                <button
                  type="button"
                  className="diagnostics-panel__select"
                  data-diagnostic-id={diagnostic.id}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setExpandedId(diagnostic.id);
                    onSelect(diagnostic.id);
                  }}
                >
                  <span
                    className={`diagnostics-panel__severity diagnostics-panel__severity--${diagnostic.severity}`}
                    title={diagnostic.severity}
                  >
                    <span aria-hidden="true">{severityIcons[diagnostic.severity]}</span>
                    <span>{diagnostic.severity}</span>
                  </span>
                  <span className="diagnostics-panel__message">{diagnostic.message}</span>
                </button>
                {isExpanded && (
                  <dl className="diagnostics-panel__details" data-testid="diagnostic-details">
                    <div className="diagnostics-panel__detail-row">
                      <dt>Code</dt>
                      <dd>
                        <code>{diagnostic.code}</code>
                      </dd>
                    </div>
                    {diagnostic.path && (
                      <div className="diagnostics-panel__detail-row">
                        <dt>Source path</dt>
                        <dd>
                          <code>{diagnostic.path}</code>
                        </dd>
                      </div>
                    )}
                    {diagnostic.rawReference && (
                      <div className="diagnostics-panel__detail-row">
                        <dt>Raw reference</dt>
                        <dd>
                          <code>{diagnostic.rawReference}</code>
                        </dd>
                      </div>
                    )}
                    {sourceId && (
                      <div className="diagnostics-panel__detail-row">
                        <dt>Source ID</dt>
                        <dd>
                          <code>{sourceId}</code>
                        </dd>
                      </div>
                    )}
                    {diagnostic.relatedElementIds?.map((id) => (
                      <div className="diagnostics-panel__detail-row" key={id}>
                        <dt>Related ID</dt>
                        <dd>
                          <code>{id}</code>
                        </dd>
                      </div>
                    ))}
                    {Object.entries(diagnostic.details ?? {}).map(([key, value]) => (
                      <div className="diagnostics-panel__detail-row" key={key}>
                        <dt>{key}</dt>
                        <dd>
                          <code>{String(value)}</code>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
