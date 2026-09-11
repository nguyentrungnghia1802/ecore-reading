import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-02 Model Explorer', () => {
  test('renders hierarchical tree with distinct classifier kinds and handles duplicates', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'nested-packages.ecore'));

    // Explorer is visible
    const explorer = page.getByTestId('model-explorer');
    await expect(explorer).toBeVisible();

    // Check root and subpackages
    await expect(explorer.getByText('root')).toBeVisible();
    await expect(explorer.getByText('left')).toBeVisible();
    await expect(explorer.getByText('right')).toBeVisible();

    // Verify duplicate Item classifiers in left and right packages
    const itemButtons = explorer.locator('button.tree-item');
    await expect(itemButtons).toHaveCount(2);

    // First Item is in left package, second is in right package
    const firstSemanticId = await itemButtons.nth(0).getAttribute('data-semantic-id');
    const secondSemanticId = await itemButtons.nth(1).getAttribute('data-semantic-id');

    expect(firstSemanticId).not.toBeNull();
    expect(secondSemanticId).not.toBeNull();
    expect(firstSemanticId).not.toEqual(secondSemanticId);

    // Clicking tree item selects node
    await itemButtons.nth(0).click();
    await expect(itemButtons.nth(0)).toHaveClass(/tree-item--selected/);

    // Selected node in canvas has selected class
    await expect(page.locator('.uml-node--selected')).toBeVisible();

    // Test collapsing and expanding explorer
    const collapseBtn = page.getByTestId('toggle-explorer');
    await collapseBtn.click();
    await expect(page.getByTestId('model-explorer-collapsed')).toBeVisible();
    await expect(page.getByTestId('diagram-canvas')).toBeVisible();

    // Expand again
    await page.getByTestId('toggle-explorer').click();
    await expect(page.getByTestId('model-explorer')).toBeVisible();
  });

  test('distinguishes class, enum, and datatype by icon and text labels', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    const explorer = page.getByTestId('model-explorer');
    await expect(explorer).toBeVisible();

    // Text labels and badges for classes, enums, datatypes
    await expect(explorer.locator('.kind-badge--class').first()).toHaveText('C');
    await expect(explorer.locator('.kind-badge--enum').first()).toHaveText('E');
    await expect(explorer.locator('.kind-badge--datatype').first()).toHaveText('T');

    await expect(explorer.getByText('Class').first()).toBeVisible();
    await expect(explorer.getByText('Enum').first()).toBeVisible();
    await expect(explorer.getByText('DataType').first()).toBeVisible();
  });
});
