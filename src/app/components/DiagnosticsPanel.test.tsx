import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Diagnostic } from '../../ecore/model';
import { DiagnosticsPanel } from './DiagnosticsPanel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const diagnostics: Diagnostic[] = [
  { id: 'warn', code: 'EXTERNAL', severity: 'warning', message: 'External type unresolved', rawReference: 'x.ecore#//T' },
  { id: 'error', code: 'INVALID_BOUNDS', severity: 'error', message: 'Invalid bounds', details: { lowerBound: '2', upperBound: '1' } },
  { id: 'info', code: 'NOTE', severity: 'info', message: 'Model note' },
];

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
});

function render(
  items: Diagnostic[],
  selectedId: string | null = null,
  onSelect = vi.fn(),
  isOpen = true,
  onToggleOpen = vi.fn(),
) {
  act(() =>
    root.render(
      <DiagnosticsPanel
        diagnostics={items}
        selectedId={selectedId}
        onSelect={onSelect}
        isOpen={isOpen}
        onToggleOpen={onToggleOpen}
      />,
    ),
  );
  return { onSelect, onToggleOpen };
}

describe('DiagnosticsPanel', () => {
  it('orders severity, shows counts and safely renders raw details', () => {
    render(diagnostics);
    expect(container.textContent).toContain('1 Error');
    expect(container.textContent).toContain('1 Warning');
    expect(container.textContent).toContain('1 Info');
    expect(
      [...container.querySelectorAll('[data-testid="diagnostic-item"]')].map(
        (item) => item.textContent,
      ),
    ).toEqual([
      expect.stringContaining('Invalid bounds'),
      expect.stringContaining('External type unresolved'),
      expect.stringContaining('Model note'),
    ]);
    expect(container.textContent).not.toContain('x.ecore#//T');
    act(() =>
      container.querySelector<HTMLButtonElement>('[data-diagnostic-id="warn"]')?.click(),
    );
    expect(container.textContent).toContain('x.ecore#//T');
  });

  it('filters by severity and selects via native keyboard button activation', () => {
    const { onSelect } = render(diagnostics);
    act(() =>
      container.querySelector<HTMLButtonElement>('[data-testid="filter-errors"]')?.click(),
    );
    expect(container.querySelectorAll('[data-testid="diagnostic-item"]')).toHaveLength(1);
    const item = container.querySelector<HTMLButtonElement>('[data-diagnostic-id="error"]');
    expect(item?.tagName).toBe('BUTTON');
    act(() => item?.click());
    expect(onSelect).toHaveBeenCalledWith('error');
  });

  it('shows a zero-diagnostics empty state', () => {
    render([]);
    expect(container.querySelector('[data-testid="diagnostics-empty"]')?.textContent).toContain(
      'No diagnostics',
    );
  });

  it('renders collapsed state when isOpen is false and triggers onToggleOpen when expanded', () => {
    const onToggle = vi.fn();
    render(diagnostics, null, vi.fn(), false, onToggle);
    const collapsed = container.querySelector('[data-testid="diagnostics-panel-collapsed"]');
    expect(collapsed).not.toBeNull();
    const expandBtn = container.querySelector<HTMLButtonElement>('[data-testid="toggle-diagnostics"]');
    expect(expandBtn).not.toBeNull();
    act(() => expandBtn?.click());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('triggers onToggleOpen when clicking close button and clears selection on clear highlight', () => {
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    render(diagnostics, 'error', onSelect, true, onToggle);

    const closeBtn = container.querySelector<HTMLButtonElement>('[data-testid="close-diagnostics"]');
    expect(closeBtn).not.toBeNull();
    act(() => closeBtn?.click());
    expect(onToggle).toHaveBeenCalledTimes(1);

    const clearBtn = container.querySelector<HTMLButtonElement>('[data-testid="clear-highlight"]');
    expect(clearBtn?.disabled).toBe(false);
    act(() => clearBtn?.click());
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
