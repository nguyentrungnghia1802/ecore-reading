import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-11 Keyboard Navigation and Accessibility Quality Gate', () => {
  test('passes axe accessibility checks on empty workspace', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-empty')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Color contrast evaluated on high-DPI
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('passes axe accessibility checks on loaded workspace in light and dark themes', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // 1. Light theme scan
    const lightResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    const lightViolations = lightResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(lightViolations).toEqual([]);

    // 2. Switch to Dark theme
    await page.getByTestId('theme-btn-dark').click();
    await expect(page.getByTestId('workspace-app')).toHaveAttribute('data-theme', 'dark');

    // Dark theme scan
    const darkResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    const darkViolations = darkResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(darkViolations).toEqual([]);
  });

  test('passes axe accessibility checks with inspector and export dialog open', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Select Entity node so Inspector has full content
    const entityNode = page.locator('.uml-node', { hasText: 'Entity' }).first();
    await entityNode.click();
    await expect(page.getByTestId('inspector-classifier-name')).toContainText('Entity');

    // Scan with active Inspector
    const inspectorResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    const inspectorViolations = inspectorResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(inspectorViolations).toEqual([]);

    // Open Export Dialog and scan
    await page.getByTestId('open-export-dialog').click();
    await expect(page.getByTestId('export-dialog')).toBeVisible();

    const exportResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    const exportViolations = exportResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(exportViolations).toEqual([]);
  });

  test('completes full keyboard-only workflow without mouse interaction', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // 1. Open search with keyboard shortcut Ctrl/Cmd+K
    await page.keyboard.press('ControlOrMeta+k');
    const searchDialog = page.getByTestId('search-dialog');
    await expect(searchDialog).toBeVisible();

    // 2. Type query and hit Enter to select
    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('State');
    await page.keyboard.press('Enter');

    // 3. Search closes, State enum is selected
    await expect(searchDialog).toHaveCount(0);
    await expect(page.getByTestId('inspector-classifier-name')).toContainText('State');

    // 4. Switch detail mode using keyboard shortcut '1' (Overview)
    await page.keyboard.press('1');
    await expect(page.getByTestId('mode-overview')).toHaveAttribute('aria-checked', 'true');

    // 5. Switch detail mode back to Standard using shortcut '2'
    await page.keyboard.press('2');
    await expect(page.getByTestId('mode-standard')).toHaveAttribute('aria-checked', 'true');

    // 6. Clear selection using Escape
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inspector-empty')).toBeVisible();
  });
});
