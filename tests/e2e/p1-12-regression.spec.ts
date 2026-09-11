import { expect, test } from '@playwright/test';

const regressionFixtures = [
  'parallel-references.ecore',
  'real-world/research-workflow.ecore',
] as const;

test.describe('P1-12 dense and parallel relation regression', () => {
  for (const fixture of regressionFixtures) {
    test(`${fixture} keeps every routed semantic relation visible`, async ({ page }) => {
      await page.goto(`/tests/e2e/renderer-harness.html?fixture=${fixture}`);
      await expect(page.getByTestId('renderer-ready')).toBeVisible();
      await expect(page.getByTestId('renderer-error')).toHaveCount(0);
      const clippedNodeIds = await page.locator('.react-flow__node').evaluateAll((nodes) => {
        const canvas = nodes[0]?.closest('.diagram-canvas')?.getBoundingClientRect();
        if (canvas === undefined) return ['missing-canvas'];
        return nodes.flatMap((node) => {
          const bounds = node.getBoundingClientRect();
          const clipped = bounds.left < canvas.left - 1
            || bounds.top < canvas.top - 1
            || bounds.right > canvas.right + 1
            || bounds.bottom > canvas.bottom + 1;
          return clipped ? [node.getAttribute('data-id') ?? 'unknown-node'] : [];
        });
      });
      expect(clippedNodeIds).toEqual([]);
      await expect(page.getByTestId('diagram-canvas')).toHaveScreenshot(`${fixture}.png`, {
        animations: 'disabled',
      });
    });
  }

  test('runs a 50-node layout off the main thread through the worker application path', async ({ page }) => {
    await page.goto('/tests/e2e/worker-harness.html');
    const result = page.getByTestId('worker-ready');
    await expect(result).toBeVisible();
    await expect(page.getByTestId('worker-error')).toHaveCount(0);
    await expect(result).toHaveAttribute('data-node-count', '50');
    await expect(result).toHaveAttribute('data-relation-count', '149');
    const frameCount = Number(await result.getAttribute('data-frame-count'));
    expect(frameCount).toBeGreaterThan(0);
  });
});
