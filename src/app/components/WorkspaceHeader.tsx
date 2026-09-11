import type { ChangeEvent, ReactNode } from 'react';

interface WorkspaceHeaderProps {
  sourceName: string;
  onOpenFile: (file: File) => void;
  onOpenSearch?: () => void;
  onOpenExport?: () => void;
  children?: ReactNode;
}

export function WorkspaceHeader({
  sourceName,
  onOpenFile,
  onOpenSearch,
  onOpenExport,
  children,
}: WorkspaceHeaderProps) {
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile(file);
    }
    e.target.value = '';
  };

  return (
    <header className="workspace-header" data-testid="workspace-header">
      <div className="workspace-header__left">
        <div className="workspace-header__brand">
          <span className="workspace-header__logo" aria-hidden="true">◆</span>
          <span className="workspace-header__app-title">Ecore Visualizer</span>
        </div>

        <div className="workspace-header__divider" aria-hidden="true" />

        <div className="workspace-header__file" title={`Metamodel: ${sourceName}`}>
          <span className="workspace-header__file-icon" aria-hidden="true">📄</span>
          <span className="workspace-header__file-name" data-testid="file-name">
            {sourceName}
          </span>
        </div>

        <label className="btn-icon-text" data-testid="header-open-file" title="Open another file">
          <span>Open another</span>
          <input
            type="file"
            accept=".ecore,.xmi,.xml"
            onChange={handleFileInput}
            className="visually-hidden"
            data-testid="header-file-input"
          />
        </label>

        {onOpenSearch && (
          <button
            type="button"
            className="btn-icon-text"
            onClick={onOpenSearch}
            data-testid="open-search"
            title="Search metamodel (Ctrl+K)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search</span>
            <kbd className="search-dialog__kbd">⌘K</kbd>
          </button>
        )}

        {onOpenExport && (
          <button
            type="button"
            className="btn-icon-text"
            onClick={onOpenExport}
            data-testid="open-export-dialog"
            title="Export diagram (SVG or PNG)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </button>
        )}
      </div>

      <div className="workspace-header__center">
        {children}
      </div>
    </header>
  );
}
