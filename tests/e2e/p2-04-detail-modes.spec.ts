import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-04 Detail modes and visual LOD', () => {
  test('switches across Overview, Standard, Detailed, and Ecore modes preserving selection', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    const modeSelector = page.getByTestId('mode-selector');
    await expect(modeSelector).toBeVisible();

    // Default mode is Standard
    await expect(page.getByTestId('mode-standard')).toHaveClass(/mode-btn--active/);

    // Select the Entity node
    await page.locator('.uml-node').first().click();
    await expect(page.locator('.uml-node--selected')).toBeVisible();

    // In Standard mode: Entity node has attribute id and operation label (2 rows)
    const entityNode = page.locator('.uml-node').first();
    await expect(entityNode.locator('.uml-node__row')).toHaveCount(2);

    // 1. Switch to Overview via button
    await page.getByTestId('mode-overview').click();
    await expect(page.getByTestId('mode-overview')).toHaveClass(/mode-btn--active/);

    // In Overview: no member rows rendered inside nodes
    await expect(page.locator('.uml-node__row')).toHaveCount(0);

    // Selection is preserved!
    await expect(page.locator('.uml-node--selected')).toBeVisible();

    // 2. Switch to Detailed via shortcut '3'
    await page.keyboard.press('3');
    await expect(page.getByTestId('mode-detailed')).toHaveClass(/mode-btn--active/);

    // Selection is still preserved!
    await expect(page.locator('.uml-node--selected')).toBeVisible();

    // 3. Switch to Ecore mode via shortcut '4'
    await page.keyboard.press('4');
    await expect(page.getByTestId('mode-ecore')).toHaveClass(/mode-btn--active/);

    // In Ecore mode: references also appear as rows with 'R' prefix
    const ecoreRows = page.locator('.uml-node__row');
    await expect(ecoreRows.filter({ hasText: /^R / })).toBeVisible();

    // Selection is still preserved!
    await expect(page.locator('.uml-node--selected')).toBeVisible();

    // 4. Switch back to Standard via shortcut '2'
    await page.keyboard.press('2');
    await expect(page.getByTestId('mode-standard')).toHaveClass(/mode-btn--active/);
    await expect(page.locator('.uml-node--selected')).toBeVisible();
  });
});
