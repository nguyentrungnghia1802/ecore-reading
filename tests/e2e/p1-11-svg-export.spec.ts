import { expect, test } from '@playwright/test';

const visualFixtures = [
  'inheritance-multiple.ecore',
  'containment.ecore',
  'opposite-valid.ecore',
] as const;

test.describe('P1-11 standalone vector SVG export', () => {
  for (const fixture of visualFixtures) {
    test(`${fixture} matches the canvas notation`, async ({ page }) => {
      await page.goto(`/tests/e2e/export-harness.html?fixture=${fixture}`);
      await expect(page.getByTestId('export-ready')).toBeVisible();
      await expect(page.getByTestId('export-error')).toHaveCount(0);
      const preview = page.getByTestId('svg-export-preview');
      await expect(preview.locator('img')).toHaveAttribute('data-node-count', /[1-9]\d*/);
      await expect(page.getByTestId('canvas-svg-comparison')).toHaveScreenshot(
        `${fixture}.png`,
        { animations: 'disabled' },
      );
    });
  }
});
