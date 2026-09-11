import { useState, type ChangeEvent, type DragEvent } from 'react';

interface EmptyStateProps {
  onOpenFile: (file: File) => void;
  onLoadSample?: (fixtureName: string) => void;
}

export function EmptyState({ onOpenFile, onLoadSample }: EmptyStateProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onOpenFile(file);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="empty-state" data-testid="workspace-empty">
      <div className="empty-state__hero">
        <div className="empty-state__badge">EMF / Ecore Exploration</div>
        <h1 className="empty-state__title">Ecore Visualizer</h1>
        <p className="empty-state__description">
          Make <code>.ecore</code> metamodels exceptionally easy to read, inspect, navigate, and export visually.
        </p>
      </div>

      <div
        className={`empty-state__dropzone ${isDragOver ? 'empty-state__dropzone--active' : ''}`}
        data-testid="drop-zone"
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="empty-state__icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
        </div>

        <div className="empty-state__instructions">
          <p className="empty-state__prompt">Drag &amp; drop your <strong>.ecore</strong> or <strong>.xmi</strong> file here</p>
          <p className="empty-state__subprompt">or browse files from your computer</p>
        </div>

        <label className="btn btn--primary empty-state__button" data-testid="open-file-button">
          Open .ecore file
          <input
            type="file"
            accept=".ecore,.xmi,.xml"
            onChange={handleFileInput}
            className="visually-hidden"
            data-testid="file-input"
          />
        </label>
      </div>

      <div className="empty-state__footer">
        <div className="empty-state__privacy" data-testid="privacy-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Processed locally in your browser.</span>
        </div>

        {onLoadSample && (
          <div className="empty-state__samples">
            <span className="empty-state__samples-label">Quick samples:</span>
            <div className="empty-state__sample-chips">
              <button
                type="button"
                className="chip-btn"
                onClick={() => onLoadSample('all-features.ecore')}
                data-testid="sample-all-features"
              >
                All Features
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={() => onLoadSample('opposite-valid.ecore')}
                data-testid="sample-opposite"
              >
                Valid Opposite
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={() => onLoadSample('inheritance-multiple.ecore')}
                data-testid="sample-inheritance"
              >
                Multiple Inheritance
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={() => onLoadSample('containment.ecore')}
                data-testid="sample-containment"
              >
                Containment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
