import type { EcoreModel } from '../../ecore/model';

interface WorkspaceStatusBarProps {
  model: EcoreModel;
  layoutStatus?: string;
}

export function WorkspaceStatusBar({ model, layoutStatus = 'Ready' }: WorkspaceStatusBarProps) {
  let classCount = 0;
  let enumCount = 0;
  let datatypeCount = 0;

  for (const classifier of model.classifiers) {
    if (classifier.kind === 'class') classCount++;
    else if (classifier.kind === 'enum') enumCount++;
    else if (classifier.kind === 'datatype') datatypeCount++;
  }

  let referenceCount = 0;
  let attributeCount = 0;

  for (const feature of model.features) {
    if (feature.kind === 'reference') referenceCount++;
    else if (feature.kind === 'attribute') attributeCount++;
  }

  const warnings = model.diagnostics.filter((d) => d.severity === 'warning').length;
  const errors = model.diagnostics.filter((d) => d.severity === 'error').length;

  return (
    <footer className="workspace-status-bar" data-testid="status-bar">
      <div className="status-bar__items">
        <span className="status-bar__item">
          <strong>{classCount}</strong> {classCount === 1 ? 'class' : 'classes'}
        </span>
        <span className="status-bar__sep">•</span>
        <span className="status-bar__item">
          <strong>{referenceCount}</strong> {referenceCount === 1 ? 'reference' : 'references'}
        </span>
        <span className="status-bar__sep">•</span>
        <span className="status-bar__item">
          <strong>{attributeCount}</strong> {attributeCount === 1 ? 'attribute' : 'attributes'}
        </span>
        {enumCount > 0 && (
          <>
            <span className="status-bar__sep">•</span>
            <span className="status-bar__item">
              <strong>{enumCount}</strong> {enumCount === 1 ? 'enum' : 'enums'}
            </span>
          </>
        )}
        {datatypeCount > 0 && (
          <>
            <span className="status-bar__sep">•</span>
            <span className="status-bar__item">
              <strong>{datatypeCount}</strong> datatypes
            </span>
          </>
        )}
      </div>

      <div className="status-bar__diagnostics">
        <span className={`status-bar__badge ${warnings > 0 ? 'status-bar__badge--warning' : ''}`}>
          {warnings} {warnings === 1 ? 'warning' : 'warnings'}
        </span>
        <span className={`status-bar__badge ${errors > 0 ? 'status-bar__badge--error' : ''}`}>
          {errors} {errors === 1 ? 'error' : 'errors'}
        </span>
        <span className="status-bar__sep">•</span>
        <span className="status-bar__status">{layoutStatus}</span>
      </div>
    </footer>
  );
}
