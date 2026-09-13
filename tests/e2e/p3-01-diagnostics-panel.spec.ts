import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P3-01 Diagnostics Panel & Diagram Navigation', () => {
  test('zero-diagnostics valid model displays empty state in Diagnostics Panel', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'minimal.ecore'));

    await expect(page.getByTestId('diagram-canvas')).toBeVisible();
    await expect(page.locator('.uml-node')).toHaveCount(1);

    // Diagnostics button exists in header
    const diagBtn = page.getByTestId('toggle-diagnostics');
    await expect(diagBtn).toBeVisible();

    // Toggle diagnostics panel open
    await diagBtn.click();
    const panel = page.getByTestId('diagnostics-panel');
    await expect(panel).toBeVisible();

    // Empty state should be visible
    await expect(page.getByTestId('diagnostics-empty')).toHaveText('No diagnostics in this model.');
    await expect(panel).toContainText('0 Errors · 0 Warnings · 0 Info');

    // Close button works
    const closeBtn = page.getByTestId('close-diagnostics');
    await closeBtn.click();
    await expect(page.getByTestId('diagnostics-panel')).toHaveCount(0);
  });

  test('unresolved reference: surfaces diagnostic, selects node, focuses viewport, applies diagnostic highlight', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'unresolved-reference.ecore'));

    // Diagnostics panel automatically opens when diagnostics exist
    const panel = page.getByTestId('diagnostics-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('diagnostics-badge')).toHaveText('1');

    // Node is rendered in diagram
    const auctionNode = page.locator('.uml-node', { hasText: 'Auction' }).first();
    await expect(auctionNode).toBeVisible();

    // Diagnostic item exists with message
    const diagItem = page.getByTestId('diagnostic-item').first();
    await expect(diagItem).toBeVisible();
    await expect(diagItem).toContainText('BidderX');

    // Click diagnostic to navigate
    const selectBtn = diagItem.locator('.diagnostics-panel__select');
    await selectBtn.click();

    // Node receives diagnostic highlight and selection state
    await expect(auctionNode).toHaveClass(/uml-node--diagnostic/);
    await expect(auctionNode).toHaveAttribute('data-selection-state', 'diagnostic');

    // Details are expanded
    const details = page.getByTestId('diagnostic-details');
    await expect(details).toBeVisible();
    await expect(details).toContainText('ECORE_UNRESOLVED_LOCAL_REFERENCE');
    await expect(details).toContainText('#//BidderX');

    // Clear highlight restores normal appearance
    const clearBtn = page.getByTestId('clear-highlight');
    await expect(clearBtn).toBeEnabled();
    await clearBtn.click();
    await expect(auctionNode).not.toHaveClass(/uml-node--diagnostic/);
  });

  test('eOpposite mismatch: highlights both related elements on diagram', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'opposite-invalid.ecore'));

    const panel = page.getByTestId('diagnostics-panel');
    await expect(panel).toBeVisible();

    const nodeA = page.locator('.uml-node', { hasText: 'A' }).first();
    const nodeB = page.locator('.uml-node', { hasText: 'B' }).first();
    await expect(nodeA).toBeVisible();
    await expect(nodeB).toBeVisible();

    // Click the eOpposite diagnostic
    const diagItem = page.getByTestId('diagnostic-item').first();
    await expect(diagItem).toContainText('eOpposite');
    await diagItem.locator('.diagnostics-panel__select').click();

    // Both ends of the mismatched opposite receive diagnostic highlight
    await expect(nodeA).toHaveClass(/uml-node--diagnostic/);
    await expect(nodeB).toHaveClass(/uml-node--diagnostic/);

    // Inspector also shows selected element details without crash
    await expect(page.getByTestId('semantic-inspector')).toBeVisible();
  });

  test('invalid multiplicity: surfaces bounds error and details', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'invalid-multiplicity.ecore'));

    const panel = page.getByTestId('diagnostics-panel');
    await expect(panel).toBeVisible();

    const diagItem = page.getByTestId('diagnostic-item').first();
    await expect(diagItem).toContainText('Invalid Ecore bounds');
    await diagItem.locator('.diagnostics-panel__select').click();

    // Node receives highlight
    const containerNode = page.locator('.uml-node', { hasText: 'Container' }).first();
    await expect(containerNode).toHaveClass(/uml-node--diagnostic/);

    // Details include lowerBound and upperBound
    const details = page.getByTestId('diagnostic-details');
    await expect(details).toContainText('ECORE_INVALID_BOUNDS');
    await expect(details).toContainText('lowerBound');
    await expect(details).toContainText('upperBound');
  });

  test('duplicate classifier: highlights conflicting classifier declaration', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'duplicate-classifier.ecore'));

    const panel = page.getByTestId('diagnostics-panel');
    await expect(panel).toBeVisible();

    const diagItem = page.getByTestId('diagnostic-item').first();
    await expect(diagItem).toContainText('Agent');
    await diagItem.locator('.diagnostics-panel__select').click();

    const agentNode = page.locator('.uml-node', { hasText: 'Agent' }).first();
    await expect(agentNode).toHaveClass(/uml-node--diagnostic/);

    const details = page.getByTestId('diagnostic-details');
    await expect(details).toContainText('ECORE_DUPLICATE_CLASSIFIER');
  });

  test('severity filtering and switching diagnostics', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Open diagnostics panel
    const diagBtn = page.getByTestId('toggle-diagnostics');
    await diagBtn.click();
    const panel = page.getByTestId('diagnostics-panel');
    await expect(panel).toBeVisible();

    // Test filter buttons
    const filterErrors = page.getByTestId('filter-errors');
    const filterWarnings = page.getByTestId('filter-warnings');
    const filterAll = page.getByTestId('filter-all');

    await filterErrors.click();
    await expect(filterErrors).toHaveAttribute('aria-pressed', 'true');

    await filterWarnings.click();
    await expect(filterWarnings).toHaveAttribute('aria-pressed', 'true');

    await filterAll.click();
    await expect(filterAll).toHaveAttribute('aria-pressed', 'true');
  });

  test('pan and zoom remain fully functional after diagnostic navigation', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'unresolved-reference.ecore'));

    const diagItem = page.getByTestId('diagnostic-item').first();
    await diagItem.locator('.diagnostics-panel__select').click();

    const auctionNode = page.locator('.uml-node', { hasText: 'Auction' }).first();
    await expect(auctionNode).toHaveClass(/uml-node--diagnostic/);

    // Box position before pan
    const boxBefore = await auctionNode.boundingBox();
    expect(boxBefore).not.toBeNull();
    if (!boxBefore) return;

    // Pan canvas with mouse drag on pane
    const canvas = page.getByTestId('diagram-canvas');
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (!canvasBox) return;

    await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150, { steps: 5 });
    await page.mouse.up();

    // Viewport panned, node moved
    const boxAfter = await auctionNode.boundingBox();
    expect(boxAfter).not.toBeNull();
    if (!boxAfter) return;
    expect(boxAfter.x).not.toBe(boxBefore.x);

    // Zoom out control or mouse wheel
    const zoomOutBtn = page.locator('.react-flow__controls-zoomout');
    if (await zoomOutBtn.isVisible() && await zoomOutBtn.isEnabled()) {
      await zoomOutBtn.click();
    } else {
      await page.mouse.wheel(0, 100);
    }
  });
});
