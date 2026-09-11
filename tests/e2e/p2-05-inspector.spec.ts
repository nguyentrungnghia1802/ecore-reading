import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureDir = resolve(process.cwd(), 'tests/fixtures/ecore');

test.describe('P2-05 Semantic Inspector', () => {
  test('inspects selected class, displays members, and handles collapse/expand', async ({
    page,
  }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    const inspector = page.getByTestId('semantic-inspector');
    await expect(inspector).toBeVisible();

    // Initially with nothing selected, empty selection prompt is shown
    await expect(inspector.getByTestId('inspector-empty')).toBeVisible();

    // Click Entity node in canvas
    const entityNode = page.locator('.uml-node', { hasText: 'Entity' }).first();
    await entityNode.click();

    // Inspector now shows Entity details
    await expect(inspector.getByTestId('inspector-classifier-name')).toHaveText('Entity');
    await expect(inspector.getByTestId('inspector-classifier-kind')).toHaveText('EClass');

    // Attributes member list contains id
    await expect(inspector.locator('.inspector-member-name', { hasText: 'id' })).toBeVisible();

    // References member list contains parent
    await expect(inspector.locator('.inspector-member-name', { hasText: 'parent' })).toBeVisible();

    // Operations member list contains label
    await expect(inspector.locator('.inspector-member-name', { hasText: 'label' })).toBeVisible();

    // Test collapse and expand of inspector
    const toggleBtn = page.getByTestId('toggle-inspector');
    await toggleBtn.click();
    await expect(page.getByTestId('inspector-collapsed')).toBeVisible();
    await expect(page.getByTestId('diagram-canvas')).toBeVisible();

    // Reopen inspector
    await page.getByTestId('toggle-inspector').click();
    await expect(page.getByTestId('semantic-inspector')).toBeVisible();
    await expect(inspector.getByTestId('inspector-classifier-name')).toHaveText('Entity');
  });

  test('displays bidirectional eOpposite and navigates cross-reference target', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'opposite-valid.ecore'));

    const inspector = page.getByTestId('semantic-inspector');
    await expect(inspector).toBeVisible();

    // Select Parent node
    const parentNode = page.locator('.uml-node', { hasText: 'Parent' }).first();
    await parentNode.click();

    await expect(inspector.getByTestId('inspector-classifier-name')).toHaveText('Parent');

    // Click children reference member button to inspect feature
    const childrenBtn = inspector.locator('.inspector-member-btn', { hasText: 'children' });
    await expect(childrenBtn).toBeVisible();
    await childrenBtn.click();

    // FeatureInspector now shows children feature details
    await expect(inspector.getByTestId('inspector-feature-header')).toBeVisible();
    await expect(inspector.getByRole('heading', { name: 'children' })).toBeVisible();
    await expect(inspector.locator('.inspector-prop', { hasText: 'eOpposite' })).toContainText('#//Child/parent');

    // Click Child target link button to navigate to Child class
    const childLink = inspector.getByRole('button', { name: 'Child', exact: true });
    await expect(childLink).toBeVisible();
    await childLink.click();

    // Inspector now shows Child class
    await expect(inspector.getByTestId('inspector-classifier-name')).toHaveText('Child');
  });

  test('inspects single selected feature row', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(resolve(fixtureDir, 'all-features.ecore'));

    // Click directly on id row inside Entity
    const idRow = page.locator('.uml-node__row', { hasText: 'id' }).first();
    await idRow.click();

    const inspector = page.getByTestId('semantic-inspector');
    await expect(inspector.getByTestId('inspector-feature-header')).toBeVisible();
    await expect(inspector.getByRole('heading', { name: 'id' })).toBeVisible();
    await expect(inspector.locator('.inspector-prop', { hasText: 'Multiplicity' })).toContainText('[1]');
    await expect(inspector.locator('.inspector-prop', { hasText: 'Is ID' })).toContainText('true');
  });
});
