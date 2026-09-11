import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-03 Indexed search, ranking, jump', () => {
  test('opens search with button or shortcut, filters results, and jumps to node/feature with keyboard', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Open via toolbar search button
    const openSearchBtn = page.getByTestId('open-search');
    await expect(openSearchBtn).toBeVisible();
    await openSearchBtn.click();

    const searchDialog = page.getByTestId('search-dialog');
    await expect(searchDialog).toBeVisible();

    const searchInput = page.getByTestId('search-input');
    await expect(searchInput).toBeFocused();

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(searchDialog).toHaveCount(0);

    // Open via Ctrl+K / Cmd+K shortcut
    await page.keyboard.press('ControlOrMeta+k');
    await expect(searchDialog).toBeVisible();

    // Type "Entity" to search for Entity class
    await searchInput.fill('Entity');

    const results = page.getByTestId('search-result-item');
    await expect(results.first()).toBeVisible();
    await expect(results.first()).toContainText('Entity');
    await expect(results.first()).toContainText('EClass');

    // Keyboard-only navigation: ArrowDown then Enter
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Search dialog closes on selection
    await expect(searchDialog).toHaveCount(0);

    // Selected node on canvas is highlighted
    const selectedNode = page.locator('.uml-node--selected');
    await expect(selectedNode).toBeVisible();
    await expect(selectedNode).toContainText('Entity');

    // Open search again and search for feature "parent"
    await page.keyboard.press('ControlOrMeta+k');
    await expect(searchDialog).toBeVisible();

    await page.getByTestId('search-input').fill('parent');
    const parentResult = page.getByTestId('search-result-item').first();
    await expect(parentResult).toBeVisible();
    await expect(parentResult).toContainText('parent');
    await expect(parentResult).toContainText('EReference');

    // Select feature via keyboard Enter
    await page.keyboard.press('Enter');
    await expect(searchDialog).toHaveCount(0);
  });
});
