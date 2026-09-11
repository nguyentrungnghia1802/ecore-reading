import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  applyNeighborhoodFocus,
  computeNeighborhoodFocus,
  type FocusDepth,
} from '../diagram/focus/neighborhood-focus';
import { buildDiagram, type DiagramOptions } from '../diagram/mapper';
import type { DiagramDetailMode } from '../diagram/model';
import { sizeDiagram } from '../diagram/sizing';
import { getLayoutProfile, layoutSizedDiagram } from '../layout';
import { DiagramCanvas, selectionForSemanticIds, type SemanticSelection } from '../renderer';
import { buildSearchIndex, type SearchIndexItem } from '../search/search-index';
import { DetailModeSelector } from './components/DetailModeSelector';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { FocusControls } from './components/FocusControls';
import { Inspector } from './components/Inspector';
import { LoadingState } from './components/LoadingState';
import { ModelExplorer } from './components/ModelExplorer';
import { SearchDialog } from './components/SearchDialog';
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
  const [focusState, setFocusState] = useState<{ rootSemanticId: string; depth: FocusDepth } | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchIndexItems = useMemo(() => {
    return workspace.status === 'ready' ? buildSearchIndex(workspace.model) : [];
  }, [workspace]);

  const handleOpenFile = useCallback(async (file: File) => {
    setWorkspace({
      status: 'loading',
      sourceName: file.name,
      message: 'Reading and parsing Ecore file…',
      error: null,
      selection: null,
    });
    setSelection(null);
    setFocusState(null);

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
    setFocusState(null);

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
    setFocusState(null);
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

  const handleSelectSearchResult = useCallback((item: SearchIndexItem) => {
    if (
      item.kind === 'attribute' ||
      item.kind === 'reference' ||
      item.kind === 'operation' ||
      item.kind === 'literal'
    ) {
      setSelection(selectionForSemanticIds('row', [item.id]));
    } else if (item.kind === 'class' || item.kind === 'enum' || item.kind === 'datatype') {
      setSelection(selectionForSemanticIds('node', [item.id]));
    }
  }, []);

  // Global Ctrl/Cmd + K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const relayoutDiagram = useCallback(
    async (
      options: DiagramOptions,
      focus: { rootSemanticId: string; depth: FocusDepth } | null,
    ) => {
      if (workspace.status !== 'ready') return;
      const baseDiagram = buildDiagram(workspace.model, options);
      const focusedDiagram = focus
        ? applyNeighborhoodFocus(
            baseDiagram,
            computeNeighborhoodFocus(baseDiagram, focus.rootSemanticId, { depth: focus.depth }),
          )
        : baseDiagram;
      const newSized = sizeDiagram(focusedDiagram);
      const newLayout = await layoutSizedDiagram(
        newSized,
        getLayoutProfile(workspace.layoutProfile),
      );
      setWorkspace((prev) => {
        if (prev.status !== 'ready') return prev;
        return {
          ...prev,
          options,
          diagram: focusedDiagram,
          sized: newSized,
          layout: newLayout,
        };
      });
    },
    [workspace],
  );

  const handleSetFocus = useCallback(
    async (semanticId: string, depth: FocusDepth) => {
      if (workspace.status !== 'ready') return;
      const nextFocus = { rootSemanticId: semanticId, depth };
      setFocusState(nextFocus);
      await relayoutDiagram(workspace.options, nextFocus);
    },
    [workspace, relayoutDiagram],
  );

  const handleClearFocus = useCallback(async () => {
    if (workspace.status !== 'ready') return;
    setFocusState(null);
    await relayoutDiagram(workspace.options, null);
  }, [workspace, relayoutDiagram]);

  const handleModeChange = useCallback(
    async (newMode: DiagramDetailMode) => {
      if (workspace.status !== 'ready' || workspace.options.detailMode === newMode) return;
      const newOptions = { ...workspace.options, detailMode: newMode };
      await relayoutDiagram(newOptions, focusState);
    },
    [workspace, focusState, relayoutDiagram],
  );

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
            onOpenSearch={() => {
              setIsSearchOpen(true);
            }}
          >
            <DetailModeSelector
              activeMode={workspace.options.detailMode}
              onChangeMode={(mode) => {
                void handleModeChange(mode);
              }}
            />
            <FocusControls
              focusState={focusState}
              selectedSemanticId={
                selection?.kind === 'node'
                  ? selection.primarySemanticId
                  : selection?.kind === 'row'
                    ? (workspace.model.featureById.get(selection.primarySemanticId)?.ownerClassId ?? null)
                    : null
              }
              nodeTitle={
                focusState
                  ? (workspace.model.classifierById.get(focusState.rootSemanticId)?.name ?? focusState.rootSemanticId)
                  : undefined
              }
              onSetFocus={(id, depth) => {
                void handleSetFocus(id, depth);
              }}
              onClearFocus={() => {
                void handleClearFocus();
              }}
            />
          </WorkspaceHeader>

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

            <Inspector
              model={workspace.model}
              selection={selection}
              onSelectSemanticId={(id) => {
                const isClassifier = workspace.model.classifiers.some((c) => c.id === id);
                setSelection(selectionForSemanticIds(isClassifier ? 'node' : 'row', [id]));
              }}
              onSetFocus={(id, depth) => {
                void handleSetFocus(id, depth);
              }}
              isOpen={isInspectorOpen}
              onToggleOpen={() => {
                setIsInspectorOpen((open) => !open);
              }}
            />
          </main>

          <WorkspaceStatusBar model={workspace.model} />

          <SearchDialog
            index={searchIndexItems}
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelect={handleSelectSearchResult}
          />
        </div>
      )}
    </div>
  );
}
