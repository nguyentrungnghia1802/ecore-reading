import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-10 Export Metamodel Workflow', () => {
  test('opens export dialog showing current semantic view summary and options', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Wait for nodes to render
    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // Click Export button in header
    const exportBtn = page.getByTestId('open-export-dialog');
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Export dialog is visible
    const dialog = page.getByTestId('export-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Export Metamodel Diagram');

    // Shows current view summary
    await expect(page.getByTestId('export-summary-mode')).toHaveText('Standard');
    await expect(page.getByTestId('export-filename-preview')).toHaveText(
      'all-features-ecore-diagram.svg',
    );

    // Close button dismisses dialog
    const closeBtn = page.getByTestId('close-export-dialog');
    await closeBtn.click();
    await expect(dialog).toHaveCount(0);
  });

  test('produces SVG download with sanitized filename and escapes markup', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // Open export dialog
    await page.getByTestId('open-export-dialog').click();

    // Choose dark background
    await page.getByTestId('export-bg-dark').click();

    // Initiate SVG download
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('confirm-export-btn').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('all-features-ecore-diagram.svg');
  });

  test('produces high-resolution PNG download with sanitized filename', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.locator('.uml-node', { hasText: 'Entity' }).first()).toBeVisible();

    // Open export dialog
    await page.getByTestId('open-export-dialog').click();

    // Select PNG format
    const pngRadio = page.getByTestId('export-format-png');
    await pngRadio.click();

    // Preview changes to .png
    await expect(page.getByTestId('export-filename-preview')).toHaveText(
      'all-features-ecore-diagram.png',
    );

    // Select 3x scale
    await page.getByTestId('export-scale-3').click();

    // Initiate PNG download
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('confirm-export-btn').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('all-features-ecore-diagram.png');
  });
});
