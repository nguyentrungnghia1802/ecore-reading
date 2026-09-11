import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DEFAULT_DIAGRAM_FILTER,
  activeFilterCount,
  applyDiagramFilters,
  type DiagramFilterOptions,
} from '../diagram/filter/diagram-filter';
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
import { ExportDialog } from './components/ExportDialog';
import { FilterControls } from './components/FilterControls';
import { FocusControls } from './components/FocusControls';
import { Inspector } from './components/Inspector';
import { LoadingState } from './components/LoadingState';
import { ModelExplorer } from './components/ModelExplorer';
import { SearchDialog } from './components/SearchDialog';
import { ThemeSelector } from './components/ThemeSelector';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspaceStatusBar } from './components/WorkspaceStatusBar';
import {
  loadPreferences,
  resolveEffectiveTheme,
  savePreferences,
  type PreferencesV1,
  type ThemeMode,
} from './state/preferences';
import {
  createEmptyWorkspace,
  loadEcoreDocument,
} from './state/workspace-controller';
import type { WorkspaceState } from './state/workspace-types';

export function App() {
  const [preferences, setPreferences] = useState<PreferencesV1>(() => loadPreferences());
  const effectiveTheme = resolveEffectiveTheme(preferences.theme);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const [workspace, setWorkspace] = useState<WorkspaceState>(createEmptyWorkspace);
  const [selection, setSelection] = useState<SemanticSelection | null>(null);
  const [focusState, setFocusState] = useState<{ rootSemanticId: string; depth: FocusDepth } | null>(null);
  const [filters, setFilters] = useState<DiagramFilterOptions>(() => ({
    ...DEFAULT_DIAGRAM_FILTER,
    relations: {
      ...DEFAULT_DIAGRAM_FILTER.relations,
      ...loadPreferences().relationVisibility,
    },
  }));
  const [filterNotice, setFilterNotice] = useState<string | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

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
    setFilterNotice(null);

    try {
      const text = await file.text();
      const result = await loadEcoreDocument(text, file.name, {
        diagramOptions: { detailMode: preferences.detailMode },
      });
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
  }, [preferences.detailMode]);

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
    setFilterNotice(null);

    try {
      const response = await fetch(`/tests/fixtures/ecore/${fixtureName}`);
      if (!response.ok) {
        throw new Error(`Failed to load fixture "${fixtureName}": HTTP ${response.status}`);
      }
      const text = await response.text();
      const result = await loadEcoreDocument(text, fixtureName, {
        diagramOptions: { detailMode: preferences.detailMode },
      });
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
  }, [preferences.detailMode]);

  const handleReset = useCallback(() => {
    setWorkspace(createEmptyWorkspace());
    setSelection(null);
    setFocusState(null);
    setFilterNotice(null);
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

  // Global keyboard shortcuts (Ctrl+K for search, Ctrl+O for open, Escape to clear selection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        const fileInput = document.querySelector<HTMLInputElement>(
          'input[type="file"][data-testid="file-input"], input[type="file"][data-testid="header-file-input"]',
        );
        fileInput?.click();
        return;
      }

      if (e.key === 'Escape') {
        if (!isSearchOpen && !isExportOpen) {
          setSelection(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isExportOpen]);

  const relayoutDiagram = useCallback(
    async (
      options: DiagramOptions,
      focus: { rootSemanticId: string; depth: FocusDepth } | null,
      currentFilters: DiagramFilterOptions,
    ) => {
      if (workspace.status !== 'ready') return;
      const baseDiagram = buildDiagram(workspace.model, options);
      const filteredDiagram = applyDiagramFilters(baseDiagram, currentFilters);
      const focusedDiagram = focus
        ? applyNeighborhoodFocus(
            filteredDiagram,
            computeNeighborhoodFocus(filteredDiagram, focus.rootSemanticId, { depth: focus.depth }),
          )
        : filteredDiagram;
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
      await relayoutDiagram(workspace.options, nextFocus, filters);
    },
    [workspace, filters, relayoutDiagram],
  );

  const handleClearFocus = useCallback(async () => {
    if (workspace.status !== 'ready') return;
    setFocusState(null);
    await relayoutDiagram(workspace.options, null, filters);
  }, [workspace, filters, relayoutDiagram]);

  const handleThemeChange = useCallback((theme: ThemeMode) => {
    setPreferences((prev) => ({ ...prev, theme }));
  }, []);

  const handleModeChange = useCallback(
    async (newMode: DiagramDetailMode) => {
      if (workspace.status !== 'ready' || workspace.options.detailMode === newMode) return;
      setPreferences((prev) => ({ ...prev, detailMode: newMode }));
      const newOptions = { ...workspace.options, detailMode: newMode };
      await relayoutDiagram(newOptions, focusState, filters);
    },
    [workspace, focusState, filters, relayoutDiagram],
  );

  const handleFiltersChange = useCallback(
    async (newFilters: DiagramFilterOptions) => {
      if (workspace.status !== 'ready') return;
      setFilters(newFilters);
      setPreferences((prev) => ({
        ...prev,
        relationVisibility: { ...newFilters.relations },
      }));

      // Check if current selection would be filtered out
      if (selection) {
        const baseDiagram = buildDiagram(workspace.model, workspace.options);
        const filteredDiagram = applyDiagramFilters(baseDiagram, newFilters);
        const isNodeVisible = filteredDiagram.nodes.some(
          (n) =>
            selection.semanticIds.includes(n.id) ||
            selection.semanticIds.includes(n.semanticId),
        );
        const isRelationVisible = filteredDiagram.relations.some((r) =>
          selection.semanticIds.some((id) => r.semanticIds.includes(id)),
        );
        if (!isNodeVisible && !isRelationVisible) {
          setSelection(null);
          setFilterNotice('The selected element is now hidden by active diagram filters.');
        }
      }

      // Check if current focus root would be filtered out
      let nextFocus = focusState;
      if (focusState) {
        const baseDiagram = buildDiagram(workspace.model, workspace.options);
        const filteredDiagram = applyDiagramFilters(baseDiagram, newFilters);
        const isFocusRootVisible = filteredDiagram.nodes.some(
          (n) =>
            n.id === focusState.rootSemanticId ||
            n.semanticId === focusState.rootSemanticId,
        );
        if (!isFocusRootVisible) {
          nextFocus = null;
          setFocusState(null);
          setFilterNotice(
            'Neighborhood focus was cleared because the focused element is hidden by active diagram filters.',
          );
        }
      }

      await relayoutDiagram(workspace.options, nextFocus, newFilters);
    },
    [workspace, selection, focusState, relayoutDiagram],
  );

  const handleResetFilters = useCallback(async () => {
    if (workspace.status !== 'ready') return;
    setFilters(DEFAULT_DIAGRAM_FILTER);
    setFilterNotice(null);
    await relayoutDiagram(workspace.options, focusState, DEFAULT_DIAGRAM_FILTER);
  }, [workspace, focusState, relayoutDiagram]);

  return (
    <div className="workspace-app" data-testid="workspace-app" data-theme={effectiveTheme}>
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
            onOpenExport={() => {
              setIsExportOpen(true);
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
            <FilterControls
              filters={filters}
              onChangeFilters={(f) => {
                void handleFiltersChange(f);
              }}
              onResetFilters={() => {
                void handleResetFilters();
              }}
            />
            <ThemeSelector
              theme={preferences.theme}
              onChangeTheme={handleThemeChange}
            />
          </WorkspaceHeader>

          {filterNotice && (
            <div className="filter-notice-banner" data-testid="filter-notice" role="status">
              <div className="filter-notice-banner__text">
                <span aria-hidden="true">⚠️</span>
                <span>{filterNotice}</span>
              </div>
              <button
                type="button"
                className="filter-notice-banner__btn"
                data-testid="filter-notice-reset"
                onClick={() => {
                  void handleResetFilters();
                }}
              >
                Reset Filters
              </button>
            </div>
          )}

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
                minimapVisible={preferences.minimapVisible}
                onToggleMinimap={(visible) => {
                  setPreferences((prev) => ({ ...prev, minimapVisible: visible }));
                }}
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

          <ExportDialog
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            sourceName={workspace.sourceName}
            diagram={workspace.diagram}
            layout={workspace.layout}
            detailMode={workspace.options.detailMode}
            focusDescription={
              focusState
                ? `Focused: ${workspace.model.classifierById.get(focusState.rootSemanticId)?.name ?? focusState.rootSemanticId} (depth ${focusState.depth})`
                : null
            }
            activeFilterCount={activeFilterCount(filters)}
          />
        </div>
      )}
    </div>
  );
}
