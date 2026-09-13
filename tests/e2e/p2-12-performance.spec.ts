import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-12 Large Model Performance and Exploration Experience', () => {
  test('loads 50-node stress model, searches, focuses, and changes detail mode smoothly', async ({
    page,
  }) => {
    await page.goto('/');

    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'stress-50.ecore'));

    // Verify canvas displays loaded graph with nodes
    const firstNode = page.locator('.uml-node', { hasText: 'Entity000' }).first();
    await expect(firstNode).toBeVisible({ timeout: 15000 });

    // Verify node count in canvas
    const nodes = page.locator('.uml-node');
    await expect(nodes).toHaveCount(50);

    // Fast search jump across 50 nodes: Ctrl+K -> Entity042 -> Enter
    await page.keyboard.press('ControlOrMeta+k');
    const searchDialog = page.getByTestId('search-dialog');
    await expect(searchDialog).toBeVisible();

    const searchInput = page.getByTestId('search-input');
    await searchInput.fill('Entity042');
    await page.keyboard.press('Enter');
    await expect(searchDialog).toHaveCount(0);

    // Inspector reflects selected Entity042
    const inspector = page.getByTestId('semantic-inspector');
    await expect(inspector.getByTestId('inspector-classifier-name')).toHaveText('Entity042');

    // Focus 1-hop neighborhood from Inspector
    await page.getByTestId('inspector-focus-1').click();
    await expect(page.getByTestId('focus-chip')).toBeVisible();

    // In 1-hop focus, only Entity042 and connected nodes remain visible in canvas
    await expect(page.locator('.uml-node')).not.toHaveCount(50);
    const visibleCount = await page.locator('.uml-node').count();
    expect(visibleCount).toBeLessThan(50);
    expect(visibleCount).toBeGreaterThanOrEqual(2);

    // Clear focus to restore all nodes
    await page.getByTestId('clear-focus').click();
    await expect(page.locator('.uml-node')).toHaveCount(50);

    // Switch to Overview detail mode using keyboard shortcut '1'
    await page.keyboard.press('1');
    await expect(page.getByTestId('mode-overview')).toHaveAttribute('aria-checked', 'true');

    // In Overview mode, compartment sections are not rendered in node cards
    await expect(page.locator('.uml-node__compartment')).toHaveCount(0);

    // Switch back to Standard mode using keyboard shortcut '2'
    await page.keyboard.press('2');
    await expect(page.getByTestId('mode-standard')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.uml-node__compartment').first()).toBeVisible();
  });

  test('explores real-world workflow-engine model with responsive interactions and theme changes', async ({
    page,
  }) => {
    await page.goto('/');

    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'real-world/workflow-engine.ecore'));

    // Wait for canvas to render workflow nodes
    await expect(page.locator('.uml-node').first()).toBeVisible({ timeout: 10000 });

    // Fit view with keyboard shortcut 'F'
    await page.keyboard.press('f');

    // Toggle theme to dark and ensure diagram canvas remains interactive
    await page.getByTestId('theme-btn-dark').click();
    await expect(page.getByTestId('workspace-app')).toHaveAttribute('data-theme', 'dark');

    // Select a node in canvas
    const firstNode = page.locator('.uml-node').first();
    await firstNode.click();
    await expect(page.getByTestId('inspector-classifier-name')).toBeVisible();

    // Switch back to light theme
    await page.getByTestId('theme-btn-light').click();
    await expect(page.getByTestId('workspace-app')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByTestId('inspector-classifier-name')).toBeVisible();
  });
});
