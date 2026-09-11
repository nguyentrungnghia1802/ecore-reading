import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeSelector } from './ThemeSelector';

describe('ThemeSelector component', () => {
  it('renders theme buttons with active state', () => {
    const markup = renderToStaticMarkup(
      <ThemeSelector theme="dark" onChangeTheme={() => {}} />,
    );

    expect(markup).toContain('data-testid="theme-selector"');
    expect(markup).toContain('data-testid="theme-btn-light"');
    expect(markup).toContain('data-testid="theme-btn-dark"');
    expect(markup).toContain('data-testid="theme-btn-system"');
    expect(markup).toContain('theme-selector__btn--active');
  });
});
