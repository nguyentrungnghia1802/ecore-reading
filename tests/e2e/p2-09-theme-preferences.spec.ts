import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-09 Theme System and Preferences Persistence', () => {
  test('switches between light, dark, and system themes and persists to storage', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Wait for nodes to render
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    const appRoot = page.getByTestId('workspace-app');
    const themeSelector = page.getByTestId('theme-selector');
    await expect(themeSelector).toBeVisible();

    // Click Dark theme button
    const darkBtn = page.getByTestId('theme-btn-dark');
    await darkBtn.click();
    await expect(appRoot).toHaveAttribute('data-theme', 'dark');

    // Check localStorage has saved the theme preference
    const stored = await page.evaluate(() => localStorage.getItem('ecore-visualizer.preferences.v1'));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as Record<string, unknown>;
    expect(parsed['theme']).toBe('dark');

    // Reload page to verify persistence
    await page.reload();
    await expect(page.getByTestId('workspace-app')).toHaveAttribute('data-theme', 'dark');

    // Click Light theme button
    await page.getByTestId('file-input').setInputFiles(resolve(fixtureDir, 'all-features.ecore'));
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    const lightBtn = page.getByTestId('theme-btn-light');
    await lightBtn.click();
    await expect(page.getByTestId('workspace-app')).toHaveAttribute('data-theme', 'light');

    const updated = await page.evaluate(() => localStorage.getItem('ecore-visualizer.preferences.v1'));
    const parsedUpdated = JSON.parse(updated!) as Record<string, unknown>;
    expect(parsedUpdated['theme']).toBe('light');
  });

  test('confirms no source model content, classifier names, or search history in localStorage', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // Perform a search interaction
    await page.keyboard.press('ControlOrMeta+k');
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Entity');
    await page.keyboard.press('Escape');

    // Inspect all keys in localStorage
    const storageDump = await page.evaluate(() => {
      const entries: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          entries[key] = localStorage.getItem(key) ?? '';
        }
      }
      return entries;
    });

    const allValues = Object.values(storageDump).join(' ');
    // Must NOT contain model content, classifier name, or secret
    expect(allValues).not.toContain('eClassifiers');
    expect(allValues).not.toContain('Entity');
    expect(allValues).not.toContain('Identifier');
    expect(allValues).not.toContain('ACTIVE');
  });

  test('gracefully handles corrupted local storage without crash', async ({ page }) => {
    await page.goto('/');
    // Inject corrupt data
    await page.evaluate(() => {
      localStorage.setItem('ecore-visualizer.preferences.v1', '{ corrupt invalid json !!');
    });

    // Reload page
    await page.reload();

    // App boots properly to empty state without throwing
    await expect(page.getByTestId('workspace-empty')).toBeVisible();

    // Open file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();
  });
});
