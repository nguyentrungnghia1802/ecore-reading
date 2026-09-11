import type { ChangeEvent } from 'react';
import type { WorkspaceError } from '../state/workspace-types';

interface ErrorStateProps {
  sourceName: string | null;
  error: WorkspaceError;
  onOpenFile: (file: File) => void;
  onReset?: () => void;
}

export function ErrorState({ sourceName, error, onOpenFile, onReset }: ErrorStateProps) {
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="error-state" data-testid="workspace-error" role="alert">
      <div className="error-state__card">
        <div className="error-state__icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="error-state__title">Unable to load metamodel</h2>
        {sourceName && (
          <p className="error-state__source">
            File: <code>{sourceName}</code>
          </p>
        )}

        <div className="error-state__details" data-testid="error-message">
          <p className="error-state__message">{error.message}</p>

          {error.diagnostics && error.diagnostics.length > 0 && (
            <ul className="error-state__diagnostics-list">
              {error.diagnostics.slice(0, 5).map((diag, index) => (
                <li key={index} className={`diagnostic-item diagnostic-item--${diag.severity}`}>
                  <span className="diagnostic-item__code">[{diag.code}]</span>
                  <span className="diagnostic-item__text">{diag.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="error-state__actions">
          <label className="btn btn--primary" data-testid="error-open-another-file">
            Open another file
            <input
              type="file"
              accept=".ecore,.xmi,.xml"
              onChange={handleFileInput}
              className="visually-hidden"
              data-testid="error-file-input"
            />
          </label>

          {onReset && (
            <button type="button" className="btn btn--secondary" onClick={onReset} data-testid="error-back-empty">
              Back to Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
