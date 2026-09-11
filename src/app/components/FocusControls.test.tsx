import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FocusControls } from './FocusControls';

describe('FocusControls component', () => {
  it('renders active focus chip with depth selector and clear button', () => {
    const markup = renderToStaticMarkup(
      <FocusControls
        focusState={{ rootSemanticId: 'c1', depth: 2 }}
        selectedSemanticId="c1"
        nodeTitle="Order"
        onSetFocus={() => {}}
        onClearFocus={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="focus-chip"');
    expect(markup).toContain('Focused:');
    expect(markup).toContain('Order');
    expect(markup).toContain('data-testid="focus-depth-1"');
    expect(markup).toContain('data-testid="focus-depth-2"');
    expect(markup).toContain('data-testid="focus-depth-3"');
    expect(markup).toContain('data-testid="focus-depth-all"');
    expect(markup).toContain('data-testid="clear-focus"');
    expect(markup).toContain('focus-chip__depth-btn--active');
  });

  it('renders focus trigger prompt when a node is selected but not yet focused', () => {
    const markup = renderToStaticMarkup(
      <FocusControls
        focusState={null}
        selectedSemanticId="c1"
        nodeTitle="Order"
        onSetFocus={() => {}}
        onClearFocus={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="focus-prompt"');
    expect(markup).toContain('data-testid="trigger-focus-1"');
    expect(markup).toContain('data-testid="trigger-focus-2"');
    expect(markup).toContain('data-testid="trigger-focus-3"');
    expect(markup).toContain('data-testid="trigger-focus-all"');
  });

  it('renders null when neither focus nor selection is active', () => {
    const markup = renderToStaticMarkup(
      <FocusControls
        focusState={null}
        selectedSemanticId={null}
        onSetFocus={() => {}}
        onClearFocus={() => {}}
      />,
    );

    expect(markup).toBe('');
  });
});
