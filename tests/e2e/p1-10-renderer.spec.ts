import { expect, test } from '@playwright/test';

const visualFixtures = [
  'inheritance-multiple.ecore',
  'containment.ecore',
  'opposite-valid.ecore',
  'external-reference.ecore',
  'self-reference.ecore',
] as const;

test.describe('P1-10 semantic React Flow renderer', () => {
  for (const fixture of visualFixtures) {
    test(`${fixture} preserves its semantic notation`, async ({ page }) => {
      await page.goto(`/tests/e2e/renderer-harness.html?fixture=${fixture}`);
      await expect(page.getByTestId('renderer-ready')).toBeVisible();
      await expect(page.getByTestId('renderer-error')).toHaveCount(0);
      await expect(page.getByTestId('diagram-canvas')).toHaveScreenshot(`${fixture}.png`, {
        animations: 'disabled',
      });
    });
  }

  test('reports exact node, row, and edge semantic selections', async ({ page }) => {
    await page.goto('/tests/e2e/renderer-harness.html?fixture=all-features.ecore');
    await expect(page.getByTestId('renderer-ready')).toBeVisible();

    await page.locator('.uml-node__title').first().click();
    await expect(page.getByTestId('semantic-selection')).toHaveText(/^node:/);

    await page.getByRole('button', { name: /select a id/i }).click();
    await expect(page.getByTestId('semantic-selection')).toHaveText(/^row:/);

    const edge = page.locator('[data-testid^="rf__edge-"]').first();
    await edge.dispatchEvent('click');
    await expect(page.getByTestId('semantic-selection')).toHaveText(/^relation:/);
  });
});
