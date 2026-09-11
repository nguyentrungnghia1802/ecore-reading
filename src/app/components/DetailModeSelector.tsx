import { useEffect } from 'react';
import type { DiagramDetailMode } from '../../diagram/model';

interface DetailModeSelectorProps {
  activeMode: DiagramDetailMode;
  onChangeMode: (mode: DiagramDetailMode) => void;
}

interface ModeConfig {
  id: DiagramDetailMode;
  label: string;
  shortcut: string;
  tooltip: string;
}

const MODES: readonly ModeConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortcut: '1',
    tooltip: 'Overview: class names and shapes only',
  },
  {
    id: 'standard',
    label: 'Standard',
    shortcut: '2',
    tooltip: 'Standard: attributes and operations',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    shortcut: '3',
    tooltip: 'Detailed: types, bounds, modifiers, and annotations',
  },
  {
    id: 'ecore',
    label: 'Ecore',
    shortcut: '4',
    tooltip: 'Ecore: raw Ecore structural features and opposites',
  },
];

export function DetailModeSelector({ activeMode, onChangeMode }: DetailModeSelectorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when typing inside inputs
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case '1':
          e.preventDefault();
          onChangeMode('overview');
          break;
        case '2':
          e.preventDefault();
          onChangeMode('standard');
          break;
        case '3':
          e.preventDefault();
          onChangeMode('detailed');
          break;
        case '4':
          e.preventDefault();
          onChangeMode('ecore');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChangeMode]);

  return (
    <div
      className="detail-mode-selector"
      role="radiogroup"
      aria-label="Diagram detail level"
      data-testid="mode-selector"
    >
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            className={`mode-btn ${isActive ? 'mode-btn--active' : ''}`}
            onClick={() => onChangeMode(mode.id)}
            role="radio"
            aria-checked={isActive}
            title={`${mode.tooltip} (press ${mode.shortcut})`}
            data-testid={`mode-${mode.id}`}
          >
            <span className="mode-btn__label">{mode.label}</span>
            <span className="mode-btn__shortcut" aria-hidden="true">
              {mode.shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}
