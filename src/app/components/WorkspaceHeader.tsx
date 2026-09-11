import type { ChangeEvent, ReactNode } from 'react';

interface WorkspaceHeaderProps {
  sourceName: string;
  onOpenFile: (file: File) => void;
  children?: ReactNode;
}

export function WorkspaceHeader({ sourceName, onOpenFile, children }: WorkspaceHeaderProps) {
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
      </div>

      <div className="workspace-header__center">
        {children}
      </div>
    </header>
  );
}
