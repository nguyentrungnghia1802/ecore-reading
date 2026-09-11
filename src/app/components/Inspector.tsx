import { useState } from 'react';
import type {
  EcoreAttribute,
  EcoreClass,
  EcoreModel,
  EcoreOperation,
  EcoreReference,
  ResolvedClassifierRef,
} from '../../ecore/model';
import { formatMultiplicity } from '../../ecore/model';
import type { SemanticSelection } from '../../renderer';

interface InspectorProps {
  model: EcoreModel;
  selection: SemanticSelection | null;
  onSelectSemanticId: (semanticId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function Inspector({
  model,
  selection,
  onSelectSemanticId,
  isOpen,
  onToggleOpen,
}: InspectorProps) {
  if (!isOpen) {
    return (
      <aside
        className="inspector inspector--collapsed"
        data-testid="inspector-collapsed"
        aria-label="Inspector (Collapsed)"
      >
        <button
          type="button"
          className="inspector__expand-btn"
          onClick={onToggleOpen}
          data-testid="toggle-inspector"
          title="Open Inspector"
          aria-label="Open Inspector"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="inspector__vertical-label">Inspector</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="inspector inspector--open"
      data-testid="semantic-inspector"
      aria-label="Semantic Inspector"
    >
      <div className="inspector__header">
        <div className="inspector__title-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="inspector__heading">Inspector</span>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={onToggleOpen}
          data-testid="toggle-inspector"
          title="Close Inspector"
          aria-label="Close Inspector"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="inspector__body">
        {selection === null && (
          <div className="inspector__empty" data-testid="inspector-empty">
            <p className="inspector__empty-title">No element selected</p>
            <p className="inspector__empty-desc">
              Select any class, relation, or feature on the diagram to inspect its exact Ecore semantics.
            </p>
          </div>
        )}

        {selection !== null && selection.kind === 'node' && (
          <NodeInspector
            semanticId={selection.primarySemanticId}
            model={model}
            onSelectSemanticId={onSelectSemanticId}
          />
        )}

        {selection !== null && selection.kind === 'relation' && (
          <RelationInspector
            semanticIds={selection.semanticIds}
            model={model}
            onSelectSemanticId={onSelectSemanticId}
          />
        )}

        {selection !== null && selection.kind === 'row' && (
          <FeatureInspector
            semanticId={selection.primarySemanticId}
            model={model}
            onSelectSemanticId={onSelectSemanticId}
          />
        )}
      </div>
    </aside>
  );
}

function NodeInspector({
  semanticId,
  model,
  onSelectSemanticId,
}: {
  semanticId: string;
  model: EcoreModel;
  onSelectSemanticId: (id: string) => void;
}) {
  const classifier = model.classifierById.get(semanticId);

  if (!classifier) {
    return (
      <div className="inspector-card">
        <div className="inspector-card__badge inspector-card__badge--external">
          External Unresolved
        </div>
        <h3 className="inspector-card__title">{semanticId}</h3>
        <p className="inspector-prop-desc">
          This classifier is an unresolved external reference. It was preserved explicitly and never guessed.
        </p>
        <div className="inspector-prop">
          <span className="inspector-prop__label">Semantic ID</span>
          <span className="inspector-prop__value"><code>{semanticId}</code></span>
        </div>
      </div>
    );
  }

  const pkg = model.packageById.get(classifier.packageId);

  return (
    <div className="inspector-content">
      <div className="inspector-card">
        <div className="inspector-card__badge" data-testid="inspector-classifier-kind">
          {classifier.kind === 'class'
            ? classifier.abstract
              ? '«abstract» Class'
              : classifier.interface
                ? '«interface» Class'
                : 'EClass'
            : classifier.kind === 'enum'
              ? 'EEnum'
              : 'EDataType'}
        </div>
        <h3 className="inspector-card__title" data-testid="inspector-classifier-name">{classifier.name}</h3>

        <div className="inspector-prop">
          <span className="inspector-prop__label">Package</span>
          <span className="inspector-prop__value">{pkg?.name ?? 'root'}</span>
        </div>

        <div className="inspector-prop">
          <span className="inspector-prop__label">Semantic ID</span>
          <span className="inspector-prop__value"><code>{classifier.id}</code></span>
        </div>

        {classifier.kind === 'class' && (
          <>
            <div className="inspector-prop">
              <span className="inspector-prop__label">Abstract</span>
              <span className="inspector-prop__value">{String(classifier.abstract)}</span>
            </div>
            <div className="inspector-prop">
              <span className="inspector-prop__label">Interface</span>
              <span className="inspector-prop__value">{String(classifier.interface)}</span>
            </div>

            {classifier.superTypeRefs.length > 0 && (
              <div className="inspector-section">
                <div className="inspector-section__title">Supertypes ({classifier.superTypeRefs.length})</div>
                <ul className="inspector-link-list">
                  {classifier.superTypeRefs.map((stRef, idx) => {
                    const label =
                      stRef.kind === 'local'
                        ? (model.classifierById.get(stRef.classifierId)?.name ?? stRef.raw)
                        : stRef.raw;
                    return (
                      <li key={idx}>
                        {stRef.kind === 'local' ? (
                          <button
                            type="button"
                            className="inspector-link-btn"
                            onClick={() => onSelectSemanticId(stRef.classifierId)}
                          >
                            {label}
                          </button>
                        ) : (
                          <span className="inspector-link-text">{label}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Class Member Sections */}
      {classifier.kind === 'class' && (
        <ClassMembersSection
          classifier={classifier}
          model={model}
          onSelectSemanticId={onSelectSemanticId}
        />
      )}

      {/* Enum Literals Section */}
      {classifier.kind === 'enum' && (
        <div className="inspector-section">
          <div className="inspector-section__title">Enum Literals ({classifier.literals.length})</div>
          <table className="inspector-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
                <th>Literal</th>
              </tr>
            </thead>
            <tbody>
              {classifier.literals.map((lit) => (
                <tr key={lit.id}>
                  <td><strong>{lit.name}</strong></td>
                  <td>{lit.value}</td>
                  <td><code>{lit.literal}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Annotations Section */}
      {classifier.annotations.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-section__title">Annotations ({classifier.annotations.length})</div>
          {classifier.annotations.map((ann, i) => (
            <div key={i} className="inspector-annotation">
              <div className="inspector-annotation__source">{ann.source ?? 'Anonymous'}</div>
              {Object.entries(ann.details).map(([k, v]) => (
                <div key={k} className="inspector-annotation__detail">
                  <span className="inspector-annotation__key">{k}:</span>
                  <span className="inspector-annotation__val">{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassMembersSection({
  classifier,
  model,
  onSelectSemanticId,
}: {
  classifier: EcoreClass;
  model: EcoreModel;
  onSelectSemanticId: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const attributes = classifier.attributeIds
    .map((id) => model.featureById.get(id))
    .filter((f): f is EcoreAttribute => f?.kind === 'attribute');

  const references = classifier.referenceIds
    .map((id) => model.featureById.get(id))
    .filter((f): f is EcoreReference => f?.kind === 'reference');

  const operations = classifier.operationIds
    .map((id) => model.operationById.get(id))
    .filter((op): op is EcoreOperation => op !== undefined);

  return (
    <div className="inspector-section">
      <div
        className="inspector-section__header-toggle"
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        tabIndex={0}
      >
        <span className="inspector-section__title">
          Members ({attributes.length} attr, {references.length} ref, {operations.length} op)
        </span>
        <span className="inspector-section__chevron">{collapsed ? '+' : '−'}</span>
      </div>

      {!collapsed && (
        <div className="inspector-section__body">
          {attributes.length > 0 && (
            <div className="inspector-subsection">
              <div className="inspector-subsection__title">Attributes</div>
              <ul className="inspector-member-list">
                {attributes.map((attr) => (
                  <li key={attr.id} className="inspector-member-item">
                    <button
                      type="button"
                      className="inspector-member-btn"
                      onClick={() => onSelectSemanticId(attr.id)}
                    >
                      <span className="kind-badge kind-badge--attribute">A</span>
                      <span className="inspector-member-name">{attr.name}</span>
                      <span className="inspector-member-type">
                        [{formatMultiplicity(attr.multiplicity)}]
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {references.length > 0 && (
            <div className="inspector-subsection">
              <div className="inspector-subsection__title">References</div>
              <ul className="inspector-member-list">
                {references.map((ref) => (
                  <li key={ref.id} className="inspector-member-item">
                    <button
                      type="button"
                      className="inspector-member-btn"
                      onClick={() => onSelectSemanticId(ref.id)}
                    >
                      <span className="kind-badge kind-badge--reference">R</span>
                      <span className="inspector-member-name">{ref.name}</span>
                      <span className="inspector-member-type">
                        {ref.containment ? '◆ ' : ''}[{formatMultiplicity(ref.multiplicity)}]
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {operations.length > 0 && (
            <div className="inspector-subsection">
              <div className="inspector-subsection__title">Operations</div>
              <ul className="inspector-member-list">
                {operations.map((op) => (
                  <li key={op.id} className="inspector-member-item">
                    <button
                      type="button"
                      className="inspector-member-btn"
                      onClick={() => onSelectSemanticId(op.id)}
                    >
                      <span className="kind-badge kind-badge--operation">M</span>
                      <span className="inspector-member-name">{op.name}()</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RelationInspector({
  semanticIds,
  model,
}: {
  semanticIds: readonly string[];
  model: EcoreModel;
  onSelectSemanticId: (id: string) => void;
}) {
  const isMergedOpposite = semanticIds.length === 2;

  return (
    <div className="inspector-content">
      <div className="inspector-card">
        <div className="inspector-card__badge">
          {isMergedOpposite ? 'Bidirectional Association' : 'EReference Relation'}
        </div>
        <h3 className="inspector-card__title">
          {isMergedOpposite ? 'Bidirectional Association (eOpposite pair)' : 'Reference Edge'}
        </h3>
      </div>

      {semanticIds.map((refId, idx) => {
        const feature = model.featureById.get(refId);
        if (!feature || feature.kind !== 'reference') {
          return (
            <div key={refId} className="inspector-section">
              <div className="inspector-prop">
                <span className="inspector-prop__label">ID</span>
                <span className="inspector-prop__value"><code>{refId}</code></span>
              </div>
            </div>
          );
        }

        const owner = model.classifierById.get(feature.ownerClassId);

        return (
          <div key={refId} className="inspector-section">
            <div className="inspector-section__title">
              {isMergedOpposite ? `End ${idx + 1}: ${feature.name}` : `Reference: ${feature.name}`}
            </div>

            <div className="inspector-prop">
              <span className="inspector-prop__label">Owner Class</span>
              <span className="inspector-prop__value"><strong>{owner?.name ?? feature.ownerClassId}</strong></span>
            </div>

            <div className="inspector-prop">
              <span className="inspector-prop__label">Role Name</span>
              <span className="inspector-prop__value"><strong>{feature.name}</strong></span>
            </div>

            <div className="inspector-prop">
              <span className="inspector-prop__label">Target Type</span>
              <span className="inspector-prop__value">{renderTypeRef(feature.type)}</span>
            </div>

            <div className="inspector-prop">
              <span className="inspector-prop__label">Multiplicity</span>
              <span className="inspector-prop__value">[{formatMultiplicity(feature.multiplicity)}]</span>
            </div>

            <div className="inspector-prop">
              <span className="inspector-prop__label">Containment</span>
              <span className="inspector-prop__value">{String(feature.containment)}</span>
            </div>

            {feature.rawOpposite && (
              <div className="inspector-prop">
                <span className="inspector-prop__label">eOpposite</span>
                <span className="inspector-prop__value"><code>{feature.rawOpposite}</code></span>
              </div>
            )}

            <div className="inspector-prop">
              <span className="inspector-prop__label">Resolve Proxies</span>
              <span className="inspector-prop__value">{String(feature.resolveProxies)}</span>
            </div>

            <div className="inspector-prop">
              <span className="inspector-prop__label">Semantic ID</span>
              <span className="inspector-prop__value"><code>{feature.id}</code></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureInspector({
  semanticId,
  model,
  onSelectSemanticId,
}: {
  semanticId: string;
  model: EcoreModel;
  onSelectSemanticId: (id: string) => void;
}) {
  const feature = model.featureById.get(semanticId);
  const operation = model.operationById.get(semanticId);

  if (feature) {
    const owner = model.classifierById.get(feature.ownerClassId);
    return (
      <div className="inspector-content">
        <div className="inspector-card">
          <div className="inspector-card__badge" data-testid="inspector-feature-header">
            {feature.kind === 'attribute' ? 'EAttribute' : 'EReference'}
          </div>
          <h3 className="inspector-card__title">{feature.name}</h3>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Owner Class</span>
            <span className="inspector-prop__value"><strong>{owner?.name ?? feature.ownerClassId}</strong></span>
          </div>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Type</span>
            <span className="inspector-prop__value">{renderTypeRef(feature.type, onSelectSemanticId, model)}</span>
          </div>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Multiplicity</span>
            <span className="inspector-prop__value">[{formatMultiplicity(feature.multiplicity)}]</span>
          </div>

          {feature.kind === 'attribute' && (
            <div className="inspector-prop">
              <span className="inspector-prop__label">Is ID</span>
              <span className="inspector-prop__value">{String(feature.idAttribute)}</span>
            </div>
          )}

          {feature.kind === 'reference' && (
            <>
              <div className="inspector-prop">
                <span className="inspector-prop__label">Containment</span>
                <span className="inspector-prop__value">{String(feature.containment)}</span>
              </div>
              {feature.rawOpposite && (
                <div className="inspector-prop">
                  <span className="inspector-prop__label">eOpposite</span>
                  <span className="inspector-prop__value">
                    {feature.oppositeReferenceId ? (
                      <button
                        type="button"
                        className="inspector-link-btn"
                        onClick={() => onSelectSemanticId(feature.oppositeReferenceId!)}
                      >
                        {feature.rawOpposite}
                      </button>
                    ) : (
                      <code>{feature.rawOpposite}</code>
                    )}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="inspector-prop">
            <span className="inspector-prop__label">Semantic ID</span>
            <span className="inspector-prop__value"><code>{feature.id}</code></span>
          </div>
        </div>
      </div>
    );
  }

  if (operation) {
    const owner = model.classifierById.get(operation.ownerClassId);
    return (
      <div className="inspector-content">
        <div className="inspector-card">
          <div className="inspector-card__badge">EOperation</div>
          <h3 className="inspector-card__title">{operation.name}()</h3>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Owner Class</span>
            <span className="inspector-prop__value"><strong>{owner?.name ?? operation.ownerClassId}</strong></span>
          </div>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Return Type</span>
            <span className="inspector-prop__value">{renderTypeRef(operation.type)}</span>
          </div>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Return Multiplicity</span>
            <span className="inspector-prop__value">[{formatMultiplicity(operation.multiplicity)}]</span>
          </div>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Parameters</span>
            <span className="inspector-prop__value">{operation.parameters.length}</span>
          </div>

          <div className="inspector-prop">
            <span className="inspector-prop__label">Semantic ID</span>
            <span className="inspector-prop__value"><code>{operation.id}</code></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-card">
      <h3 className="inspector-card__title">{semanticId}</h3>
      <div className="inspector-prop">
        <span className="inspector-prop__label">Semantic ID</span>
        <span className="inspector-prop__value"><code>{semanticId}</code></span>
      </div>
    </div>
  );
}

function renderTypeRef(
  typeRef: ResolvedClassifierRef | null,
  onSelectSemanticId?: (id: string) => void,
  model?: EcoreModel,
) {
  if (!typeRef) return 'void';
  if (typeRef.kind === 'builtin') return typeRef.displayName;
  if (typeRef.kind === 'local') {
    const targetClassifier = model?.classifierById.get(typeRef.classifierId);
    const label = targetClassifier?.name ?? typeRef.raw;
    if (onSelectSemanticId) {
      return (
        <button
          type="button"
          className="inspector-link-btn"
          onClick={() => onSelectSemanticId(typeRef.classifierId)}
        >
          {label}
        </button>
      );
    }
    return label;
  }
  if (typeRef.kind === 'external') {
    return (
      <span className="external-unresolved" title="Unresolved External Target">
        unresolved (<code>{typeRef.raw}</code>)
      </span>
    );
  }
  return 'unknown';
}
