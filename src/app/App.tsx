import { useState, useCallback, useEffect } from 'react';
import { DiagramCanvas, selectionForSemanticIds, type SemanticSelection } from '../renderer';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { LoadingState } from './components/LoadingState';
import { ModelExplorer } from './components/ModelExplorer';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspaceStatusBar } from './components/WorkspaceStatusBar';
import {
  createEmptyWorkspace,
  loadEcoreDocument,
} from './state/workspace-controller';
import type { WorkspaceState } from './state/workspace-types';

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(createEmptyWorkspace);
  const [selection, setSelection] = useState<SemanticSelection | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  const handleOpenFile = useCallback(async (file: File) => {
    setWorkspace({
      status: 'loading',
      sourceName: file.name,
      message: 'Reading and parsing Ecore file…',
      error: null,
      selection: null,
    });
    setSelection(null);

    try {
      const text = await file.text();
      const result = await loadEcoreDocument(text, file.name);
      setWorkspace(result);
    } catch (err: unknown) {
      setWorkspace({
        status: 'error',
        sourceName: file.name,
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
        selection: null,
      });
    }
  }, []);

  const handleLoadSample = useCallback(async (fixtureName: string) => {
    setWorkspace({
      status: 'loading',
      sourceName: fixtureName,
      message: `Loading sample ${fixtureName}…`,
      error: null,
      selection: null,
    });
    setSelection(null);

    try {
      const response = await fetch(`/tests/fixtures/ecore/${fixtureName}`);
      if (!response.ok) {
        throw new Error(`Failed to load fixture "${fixtureName}": HTTP ${response.status}`);
      }
      const text = await response.text();
      const result = await loadEcoreDocument(text, fixtureName);
      setWorkspace(result);
    } catch (err: unknown) {
      setWorkspace({
        status: 'error',
        sourceName: fixtureName,
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
        selection: null,
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    setWorkspace(createEmptyWorkspace());
    setSelection(null);
  }, []);

  // Global drag-and-drop support when loaded
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && (file.name.endsWith('.ecore') || file.name.endsWith('.xml') || file.name.endsWith('.xmi'))) {
        void handleOpenFile(file);
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleOpenFile]);

  return (
    <div className="workspace-app" data-testid="workspace-app">
      {workspace.status === 'empty' && (
        <EmptyState
          onOpenFile={(file) => {
            void handleOpenFile(file);
          }}
          onLoadSample={(fixture) => {
            void handleLoadSample(fixture);
          }}
        />
      )}

      {workspace.status === 'loading' && (
        <LoadingState message={workspace.message} sourceName={workspace.sourceName} />
      )}

      {workspace.status === 'error' && (
        <ErrorState
          sourceName={workspace.sourceName}
          error={workspace.error}
          onOpenFile={(file) => {
            void handleOpenFile(file);
          }}
          onReset={handleReset}
        />
      )}

      {workspace.status === 'ready' && (
        <div className="workspace-layout">
          <WorkspaceHeader
            sourceName={workspace.sourceName}
            onOpenFile={(file) => {
              void handleOpenFile(file);
            }}
          />

          <main className="workspace-main">
            <ModelExplorer
              model={workspace.model}
              selectedSemanticId={selection?.semanticIds[0] ?? null}
              onSelectSemanticId={(id) => {
                setSelection(selectionForSemanticIds('node', [id]));
              }}
              isOpen={isExplorerOpen}
              onToggleOpen={() => {
                setIsExplorerOpen((open) => !open);
              }}
            />

            <div className="workspace-canvas-container">
              <DiagramCanvas
                layout={workspace.layout}
                selection={selection}
                onSelectionChange={setSelection}
              />
            </div>
          </main>

          <WorkspaceStatusBar model={workspace.model} />
        </div>
      )}
    </div>
  );
}
