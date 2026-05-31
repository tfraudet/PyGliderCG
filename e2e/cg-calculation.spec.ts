import { expect, test } from '@playwright/test'
import { selectFirstGlider, setupTestLogging } from './test-utils'

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test('calculator page should render and allow glider selection', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
  await expect(page.getByRole('combobox').first()).toBeVisible()

  await selectFirstGlider(page)

  await expect(page.getByRole('tab', { name: 'Centrage' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Limites & Bras' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Pesée' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Calculer le centrage' })).toBeVisible()
})
