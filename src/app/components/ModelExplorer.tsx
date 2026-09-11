import { useState } from 'react';
import type { EcoreClassifier, EcoreModel, EcorePackage } from '../../ecore/model';

interface ModelExplorerProps {
  model: EcoreModel;
  selectedSemanticId: string | null;
  onSelectSemanticId: (semanticId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function ModelExplorer({
  model,
  selectedSemanticId,
  onSelectSemanticId,
  isOpen,
  onToggleOpen,
}: ModelExplorerProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeKey: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  if (!isOpen) {
    return (
      <aside
        className="model-explorer model-explorer--collapsed"
        data-testid="model-explorer-collapsed"
        aria-label="Model Explorer (Collapsed)"
      >
        <button
          type="button"
          className="model-explorer__expand-btn"
          onClick={onToggleOpen}
          data-testid="toggle-explorer"
          title="Open Model Explorer"
          aria-label="Open Model Explorer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="model-explorer__vertical-label">Explorer</span>
        </button>
      </aside>
    );
  }

  // Find root packages (packages without parentPackageId)
  const rootPackages = model.packages.filter((pkg) => !pkg.parentPackageId);

  return (
    <aside
      className="model-explorer model-explorer--open"
      data-testid="model-explorer"
      aria-label="Model Explorer"
    >
      <div className="model-explorer__header">
        <div className="model-explorer__title-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="model-explorer__heading">Model Explorer</span>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={onToggleOpen}
          data-testid="toggle-explorer"
          title="Collapse Explorer"
          aria-label="Collapse Model Explorer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div className="model-explorer__tree" role="tree">
        {rootPackages.map((pkg) => (
          <PackageTreeNode
            key={pkg.id}
            pkg={pkg}
            model={model}
            selectedSemanticId={selectedSemanticId}
            onSelectSemanticId={onSelectSemanticId}
            collapsedNodes={collapsedNodes}
            onToggleNode={toggleNode}
          />
        ))}
      </div>
    </aside>
  );
}

interface PackageTreeNodeProps {
  pkg: EcorePackage;
  model: EcoreModel;
  selectedSemanticId: string | null;
  onSelectSemanticId: (semanticId: string) => void;
  collapsedNodes: Record<string, boolean>;
  onToggleNode: (key: string) => void;
}

function PackageTreeNode({
  pkg,
  model,
  selectedSemanticId,
  onSelectSemanticId,
  collapsedNodes,
  onToggleNode,
}: PackageTreeNodeProps) {
  const isCollapsed = Boolean(collapsedNodes[`pkg:${pkg.id}`]);

  const classifiers = pkg.classifierIds
    .map((id) => model.classifierById.get(id))
    .filter((c): c is EcoreClassifier => c !== undefined);

  const classes = classifiers.filter((c) => c.kind === 'class');
  const enums = classifiers.filter((c) => c.kind === 'enum');
  const dataTypes = classifiers.filter((c) => c.kind === 'datatype');

  const subpackages = pkg.subpackageIds
    .map((id) => model.packageById.get(id))
    .filter((p): p is EcorePackage => p !== undefined);

  const classesCollapsed = Boolean(collapsedNodes[`group:${pkg.id}:classes`]);
  const enumsCollapsed = Boolean(collapsedNodes[`group:${pkg.id}:enums`]);
  const dataTypesCollapsed = Boolean(collapsedNodes[`group:${pkg.id}:datatypes`]);

  return (
    <div className="tree-node tree-node--package" role="treeitem" aria-expanded={!isCollapsed}>
      <div className="tree-node__label tree-node__label--package">
        <button
          type="button"
          className="tree-node__toggle"
          onClick={() => onToggleNode(`pkg:${pkg.id}`)}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} package ${pkg.name}`}
        >
          <svg
            className={`tree-node__chevron ${isCollapsed ? 'tree-node__chevron--collapsed' : ''}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <span className="tree-node__icon tree-node__icon--pkg" aria-hidden="true">📦</span>
        <span className="tree-node__name" title={pkg.nsURI || pkg.name}>{pkg.name}</span>
        <span className="tree-node__count" title={`${classifiers.length} elements`}>{classifiers.length}</span>
      </div>

      {!isCollapsed && (
        <div className="tree-node__children" role="group">
          {/* Classes group */}
          {classes.length > 0 && (
            <div className="tree-group" role="group">
              <div className="tree-group__header">
                <button
                  type="button"
                  className="tree-node__toggle"
                  onClick={() => onToggleNode(`group:${pkg.id}:classes`)}
                  aria-label={`${classesCollapsed ? 'Expand' : 'Collapse'} Classes in ${pkg.name}`}
                >
                  <svg
                    className={`tree-node__chevron ${classesCollapsed ? 'tree-node__chevron--collapsed' : ''}`}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <span className="tree-group__title">Classes ({classes.length})</span>
              </div>

              {!classesCollapsed && (
                <div className="tree-group__items">
                  {classes.map((cls) => (
                    <ClassifierTreeItem
                      key={cls.id}
                      classifier={cls}
                      isSelected={selectedSemanticId === cls.id}
                      onSelect={() => onSelectSemanticId(cls.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Enums group */}
          {enums.length > 0 && (
            <div className="tree-group" role="group">
              <div className="tree-group__header">
                <button
                  type="button"
                  className="tree-node__toggle"
                  onClick={() => onToggleNode(`group:${pkg.id}:enums`)}
                  aria-label={`${enumsCollapsed ? 'Expand' : 'Collapse'} Enums in ${pkg.name}`}
                >
                  <svg
                    className={`tree-node__chevron ${enumsCollapsed ? 'tree-node__chevron--collapsed' : ''}`}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <span className="tree-group__title">Enums ({enums.length})</span>
              </div>

              {!enumsCollapsed && (
                <div className="tree-group__items">
                  {enums.map((enm) => (
                    <ClassifierTreeItem
                      key={enm.id}
                      classifier={enm}
                      isSelected={selectedSemanticId === enm.id}
                      onSelect={() => onSelectSemanticId(enm.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Datatypes group */}
          {dataTypes.length > 0 && (
            <div className="tree-group" role="group">
              <div className="tree-group__header">
                <button
                  type="button"
                  className="tree-node__toggle"
                  onClick={() => onToggleNode(`group:${pkg.id}:datatypes`)}
                  aria-label={`${dataTypesCollapsed ? 'Expand' : 'Collapse'} Datatypes in ${pkg.name}`}
                >
                  <svg
                    className={`tree-node__chevron ${dataTypesCollapsed ? 'tree-node__chevron--collapsed' : ''}`}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <span className="tree-group__title">Datatypes ({dataTypes.length})</span>
              </div>

              {!dataTypesCollapsed && (
                <div className="tree-group__items">
                  {dataTypes.map((dt) => (
                    <ClassifierTreeItem
                      key={dt.id}
                      classifier={dt}
                      isSelected={selectedSemanticId === dt.id}
                      onSelect={() => onSelectSemanticId(dt.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subpackages */}
          {subpackages.map((subpkg) => (
            <PackageTreeNode
              key={subpkg.id}
              pkg={subpkg}
              model={model}
              selectedSemanticId={selectedSemanticId}
              onSelectSemanticId={onSelectSemanticId}
              collapsedNodes={collapsedNodes}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ClassifierTreeItemProps {
  classifier: EcoreClassifier;
  isSelected: boolean;
  onSelect: () => void;
}

function ClassifierTreeItem({ classifier, isSelected, onSelect }: ClassifierTreeItemProps) {
  let kindBadge = 'kind-badge--class';
  let kindText = 'Class';
  let kindLetter = 'C';

  if (classifier.kind === 'enum') {
    kindBadge = 'kind-badge--enum';
    kindText = 'Enum';
    kindLetter = 'E';
  } else if (classifier.kind === 'datatype') {
    kindBadge = 'kind-badge--datatype';
    kindText = 'DataType';
    kindLetter = 'T';
  }

  return (
    <button
      type="button"
      className={`tree-item ${isSelected ? 'tree-item--selected' : ''}`}
      onClick={onSelect}
      data-semantic-id={classifier.id}
      aria-selected={isSelected}
      role="treeitem"
      title={`${kindText} ${classifier.name} (${classifier.id})`}
    >
      <span className={`kind-badge ${kindBadge}`} aria-label={kindText} title={kindText}>
        {kindLetter}
      </span>
      <span className="tree-item__name">{classifier.name}</span>
      <span className="tree-item__kind-label" aria-hidden="true">{kindText}</span>
    </button>
  );
}
