import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-06 Selection Emphasis and Semantic Neighborhood Focus', () => {
  test('selecting a node emphasizes neighbors and dims unrelated nodes without hiding them', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Wait for nodes to be rendered
    const entityNode = page.locator('.uml-node', { hasText: 'Entity' }).first();
    const stateNode = page.locator('.uml-node', { hasText: 'State' }).first();
    await expect(entityNode).toBeVisible();
    await expect(stateNode).toBeVisible();

    // Select Entity node
    await entityNode.click();

    // Entity is selected
    await expect(entityNode).toHaveClass(/uml-node--selected/);

    // State (unrelated enum) is dimmed but still visible in the diagram
    await expect(stateNode).toBeVisible();
    await expect(stateNode).toHaveClass(/uml-node--dimmed/);
  });

  test('focuses neighborhood at depth 1, adjusts depth to 2, and clears focus cleanly', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'real-world/workflow-engine.ecore'));

    // Wait for nodes to be rendered
    const roleNode = page.locator('.uml-node', { hasText: 'Role' }).first();
    await expect(roleNode).toBeVisible();

    // Total node count initially is large
    const initialNodes = page.locator('.uml-node');
    const initialCount = await initialNodes.count();
    expect(initialCount).toBeGreaterThan(6);
    await roleNode.click();

    // Focus prompt appears in header
    const focus1Btn = page.getByTestId('trigger-focus-1');
    await expect(focus1Btn).toBeVisible();

    // Click 1-hop focus
    await focus1Btn.click();

    // Active focus chip is visible in header
    const focusChip = page.getByTestId('focus-chip');
    await expect(focusChip).toBeVisible();
    await expect(focusChip).toContainText('Focused:');
    await expect(focusChip).toContainText('Role');

    // At depth 1 from Role, only Role, its supertype Named, and connected Actor are visible
    const depth1Count = await page.locator('.uml-node').count();
    expect(depth1Count).toBeLessThan(initialCount);
    await expect(page.locator('.uml-node', { hasText: 'Role' }).first()).toBeVisible();
    await expect(page.locator('.uml-node', { hasText: 'Actor' }).first()).toBeVisible();
    await expect(page.locator('.uml-node', { hasText: 'FinalState' })).toHaveCount(0);

    // Switch depth to 2 via focus chip button
    const depth2Btn = page.getByTestId('focus-depth-2');
    await depth2Btn.click();

    // At depth 2, Assignment (connected to Actor) becomes visible
    await expect(page.locator('.uml-node', { hasText: 'Assignment' }).first()).toBeVisible();
    const depth2Count = await page.locator('.uml-node').count();
    expect(depth2Count).toBeGreaterThan(depth1Count);

    // Clear focus via chip clear button
    const clearBtn = page.getByTestId('clear-focus');
    await clearBtn.click();

    // Focus chip disappears
    await expect(focusChip).toHaveCount(0);

    // Full diagram is restored
    const restoredCount = await page.locator('.uml-node').count();
    expect(restoredCount).toBe(initialCount);

    // Selected node remains selected after clearing focus
    await expect(page.locator('.uml-node', { hasText: 'Role' }).first()).toHaveClass(/uml-node--selected/);
  });

  test('focuses neighborhood from Inspector action button', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'real-world/workflow-engine.ecore'));

    // Select Role
    const roleNode = page.locator('.uml-node', { hasText: 'Role' }).first();
    await roleNode.click();

    // In Inspector, click 1-hop focus button
    const inspector = page.getByTestId('semantic-inspector');
    const inspectorFocusBtn = inspector.getByTestId('inspector-focus-1');
    await expect(inspectorFocusBtn).toBeVisible();
    await inspectorFocusBtn.click();

    // Active focus chip appears
    const focusChip = page.getByTestId('focus-chip');
    await expect(focusChip).toBeVisible();
    await expect(focusChip).toContainText('Role');

    // Only 1-hop nodes are visible
    await expect(page.locator('.uml-node', { hasText: 'Role' }).first()).toBeVisible();
    await expect(page.locator('.uml-node', { hasText: 'FinalState' })).toHaveCount(0);
  });
});
