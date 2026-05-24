import { expect, test } from '@playwright/test'
import { setupTestLogging } from './test-utils'

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test('calculator page should render and allow glider selection', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Calculateur centrage pilote' })).toBeVisible()
  await expect(page.getByText('Choisir un planeur')).toBeVisible()
})
