import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DetailModeSelector } from './DetailModeSelector';

describe('DetailModeSelector', () => {
  it('renders all four detail modes with accessible labels and tooltips', () => {
    const markup = renderToStaticMarkup(
      <DetailModeSelector activeMode="standard" onChangeMode={() => {}} />,
    );

    expect(markup).toContain('data-testid="mode-selector"');
    expect(markup).toContain('data-testid="mode-overview"');
    expect(markup).toContain('data-testid="mode-standard"');
    expect(markup).toContain('data-testid="mode-detailed"');
    expect(markup).toContain('data-testid="mode-ecore"');

    // Standard is active
    expect(markup).toContain('mode-btn--active');
    expect(markup).toContain('aria-checked="true"');

    // Tooltips explain differences
    expect(markup).toContain('Overview: class names and shapes only');
    expect(markup).toContain('Standard: attributes and operations');
    expect(markup).toContain('Detailed: types, bounds, modifiers, and annotations');
    expect(markup).toContain('Ecore: raw Ecore structural features and opposites');
  });
});
