import type { FocusDepth } from '../../diagram/focus/neighborhood-focus';

export interface FocusControlsProps {
  focusState: { rootSemanticId: string; depth: FocusDepth } | null;
  selectedSemanticId: string | null;
  nodeTitle?: string | undefined;
  onSetFocus: (semanticId: string, depth: FocusDepth) => void;
  onClearFocus: () => void;
}

const DEPTHS: readonly FocusDepth[] = [1, 2, 3, 'all'];

export function FocusControls({
  focusState,
  selectedSemanticId,
  nodeTitle,
  onSetFocus,
  onClearFocus,
}: FocusControlsProps) {
  if (focusState) {
    const displayName = nodeTitle ?? focusState.rootSemanticId;
    return (
      <div
        className="focus-chip"
        data-testid="focus-chip"
        role="region"
        aria-label={`Neighborhood focus active on ${displayName}`}
      >
        <span className="focus-chip__icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </span>
        <span className="focus-chip__label">
          Focused: <strong>{displayName}</strong>
        </span>
        <span className="focus-chip__divider" aria-hidden="true">•</span>
        <div className="focus-chip__depth-group" role="group" aria-label="Focus depth">
          {DEPTHS.map((d) => {
            const isActive = focusState.depth === d;
            const label = d === 'all' ? 'All' : `depth ${d}`;
            return (
              <button
                key={String(d)}
                type="button"
                className={`focus-chip__depth-btn ${isActive ? 'focus-chip__depth-btn--active' : ''}`}
                data-testid={`focus-depth-${d}`}
                onClick={() => onSetFocus(focusState.rootSemanticId, d)}
                aria-pressed={isActive}
                title={`Set neighborhood focus to ${label}`}
              >
                {d === 'all' ? 'All' : d}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="focus-chip__clear-btn"
          data-testid="clear-focus"
          onClick={onClearFocus}
          title="Clear neighborhood focus and show full diagram"
          aria-label="Clear focus"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  if (selectedSemanticId) {
    return (
      <div className="focus-prompt" data-testid="focus-prompt">
        <span className="focus-prompt__label">Focus:</span>
        <div className="focus-prompt__depth-group" role="group" aria-label="Focus neighborhood">
          {DEPTHS.map((d) => (
            <button
              key={String(d)}
              type="button"
              className="focus-prompt__btn"
              data-testid={`trigger-focus-${d}`}
              onClick={() => onSetFocus(selectedSemanticId, d)}
              title={`Focus ${d === 'all' ? 'all reachable' : `${d}-hop`} neighbors`}
            >
              {d === 'all' ? 'All' : `${d}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
