import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-07 Node and Relation Filters', () => {
  test('toggles node kinds, displays badge count, and resets to default', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Initially both Entity and State enum are visible
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();
    await expect(page.locator('.uml-node', { hasText: 'State' }).first()).toBeVisible();

    // Open filters popover
    const filterBtn = page.getByTestId('toggle-filters-menu');
    await filterBtn.click();

    const popover = page.getByTestId('filter-popover');
    await expect(popover).toBeVisible();

    // Toggle off Enums
    const enumCheckbox = page.getByTestId('filter-node-enums');
    await expect(enumCheckbox).toBeChecked();
    await enumCheckbox.click();
    await expect(enumCheckbox).not.toBeChecked();

    // Badge now shows 1 active filter
    await expect(page.getByTestId('filter-badge')).toHaveText('1');

    // State enum node is removed from diagram
    await expect(page.locator('.uml-node', { hasText: 'State' })).toHaveCount(0);
    // Entity class remains visible
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // Click Reset in popover
    const resetBtn = page.getByTestId('reset-filters');
    await resetBtn.click();

    // All filters restored to default, State enum is visible again
    await expect(page.getByTestId('filter-badge')).toHaveCount(0);
    await expect(page.locator('.uml-node', { hasText: 'State' }).first()).toBeVisible();
  });

  test('explains when selected element is filtered out and clears selection deterministically', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Select State enum
    const stateNode = page.locator('.uml-node', { hasText: 'State' }).first();
    await stateNode.click();
    await expect(stateNode).toHaveClass(/uml-node--selected/);

    // Open filters menu and disable enums
    await page.getByTestId('toggle-filters-menu').click();
    await page.getByTestId('filter-node-enums').click();
    await page.keyboard.press('Escape');

    // Node is hidden and explanation banner appears
    await expect(page.locator('.uml-node', { hasText: 'State' })).toHaveCount(0);
    const banner = page.getByTestId('filter-notice');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('hidden by active diagram filters');

    // Clicking Reset Filters on the banner restores the node and dismisses the banner
    const bannerResetBtn = page.getByTestId('filter-notice-reset');
    await bannerResetBtn.click();
    await expect(banner).toHaveCount(0);
    await expect(page.locator('.uml-node', { hasText: 'State' }).first()).toBeVisible();
  });

  test('toggles relation filter without dangling edges', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'inheritance-multiple.ecore'));

    // Wait for nodes to render
    await expect(page.locator('.uml-node', { hasText: 'Record' }).first()).toBeVisible();

    // Initially generalization edges are present
    const edges = page.locator('.semantic-edge__path--generalization');
    await expect(edges).toHaveCount(2);

    // Open filters menu and disable inheritance
    await page.getByTestId('toggle-filters-menu').click();
    await page.getByTestId('filter-relation-inheritance').click();

    // Edges are removed from diagram
    await expect(edges).toHaveCount(0);

    // Nodes still exist without dangling edges
    await expect(page.locator('.uml-node', { hasText: 'Record' }).first()).toBeVisible();
    await expect(page.locator('.uml-node', { hasText: 'Named' }).first()).toBeVisible();
    await expect(page.locator('.uml-node', { hasText: 'Audited' }).first()).toBeVisible();
  });
});
