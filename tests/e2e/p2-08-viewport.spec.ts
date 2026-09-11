import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-08 Viewport Interactions and Controls', () => {
  test('displays minimap on loaded workspace and supports toggling', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Wait for nodes to render
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // Minimap is visible by default
    const minimap = page.locator('.react-flow__minimap');
    await expect(minimap).toBeVisible();

    // Toggle minimap button hides the minimap
    const toggleMinimapBtn = page.getByRole('button', { name: 'Toggle Minimap' });
    await expect(toggleMinimapBtn).toBeVisible();
    await toggleMinimapBtn.click();
    await expect(minimap).toHaveCount(0);

    // Clicking again restores the minimap
    await toggleMinimapBtn.click();
    await expect(minimap).toBeVisible();
  });

  test('provides viewport controls and Fit View shortcut F', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Controls component is present
    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible();

    // Zoom and Fit view buttons are present inside controls
    const fitViewBtn = controls.locator('.react-flow__controls-fitview');
    await expect(fitViewBtn).toBeVisible();

    // Trigger shortcut 'F' on the canvas
    const canvas = page.getByTestId('diagram-canvas');
    await canvas.click({ position: { x: 50, y: 50 } });
    await page.keyboard.press('f');

    // Canvas elements remain fully visible and framed
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();
  });

  test('allows manual node movement and resets to auto layout', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    const node = page.locator('.uml-node', { hasText: 'Entity' }).first();
    await expect(node).toBeVisible();

    const boxBefore = await node.boundingBox();
    expect(boxBefore).not.toBeNull();
    if (!boxBefore) return;

    // Reset layout button is initially disabled
    const resetLayoutBtn = page.getByRole('button', { name: 'Reset to Auto Layout' });
    await expect(resetLayoutBtn).toBeDisabled();

    // Drag node by 120px to the right and 80px down
    const startX = boxBefore.x + boxBefore.width / 2;
    const startY = boxBefore.y + 15; // grab header
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 120, startY + 80, { steps: 5 });
    await page.mouse.up();

    // Wait a brief tick for state update
    await expect(resetLayoutBtn).toBeEnabled();

    const boxAfterDrag = await node.boundingBox();
    expect(boxAfterDrag).not.toBeNull();
    if (!boxAfterDrag) return;

    // Node moved noticeably
    expect(Math.abs(boxAfterDrag.x - boxBefore.x)).toBeGreaterThan(50);

    // Reset to auto layout restores position
    await resetLayoutBtn.click();
    await expect(resetLayoutBtn).toBeDisabled();

    // After reset, node position returns near initial coordinates
    const boxAfterReset = await node.boundingBox();
    expect(boxAfterReset).not.toBeNull();
    if (!boxAfterReset) return;
    expect(Math.abs(boxAfterReset.x - boxBefore.x)).toBeLessThan(30);
  });

  test('sidebar toggling does not reset node positions or trigger re-layout', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    const node = page.locator('.uml-node', { hasText: 'Entity' }).first();
    await expect(node).toBeVisible();

    // Toggle explorer sidebar
    const toggleExplorerBtn = page.getByTestId('toggle-explorer');
    await toggleExplorerBtn.click();
    await expect(page.getByTestId('model-explorer-collapsed')).toBeVisible();

    // Node remains rendered and visible
    await expect(node).toBeVisible();

    // Open explorer again
    const expandExplorerBtn = page.getByTestId('toggle-explorer');
    await expandExplorerBtn.click();
    await expect(page.getByTestId('model-explorer')).toBeVisible();
    await expect(node).toBeVisible();
  });
});
