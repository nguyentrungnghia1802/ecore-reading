import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-01 Workspace flow', () => {
  test('empty state renders with privacy statement and dropzone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-empty')).toBeVisible();
    await expect(page.getByTestId('privacy-notice')).toContainText('Processed locally in your browser.');
    await expect(page.getByTestId('drop-zone')).toBeVisible();
  });

  test('handles invalid file, shows actionable error, and recovers to valid file', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('workspace-empty')).toBeVisible();

    // 1. Upload malformed XML file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'malformed.xml'));

    // 2. Expect error screen with actionable diagnostic
    await expect(page.getByTestId('workspace-error')).toBeVisible();
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-open-another-file')).toBeVisible();
    await expect(page.getByTestId('diagram-canvas')).toHaveCount(0);

    // 3. Recover by opening a valid file from the error screen
    const errorFileInput = page.getByTestId('error-file-input');
    await errorFileInput.setInputFiles(resolve(fixtureDir, 'opposite-valid.ecore'));

    // 4. Expect successful recovery to ready diagram workspace
    await expect(page.getByTestId('workspace-header')).toBeVisible();
    await expect(page.getByTestId('file-name')).toHaveText('opposite-valid.ecore');
    await expect(page.getByTestId('status-bar')).toBeVisible();
    await expect(page.getByTestId('diagram-canvas')).toBeVisible();
    await expect(page.locator('.uml-node')).toHaveCount(2);

    // 5. Open another file from header without refresh
    const headerFileInput = page.getByTestId('header-file-input');
    await headerFileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    await expect(page.getByTestId('file-name')).toHaveText('all-features.ecore');
    await expect(page.locator('.uml-node').first()).toBeVisible();
  });
});
