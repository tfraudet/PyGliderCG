import { expect, test } from '@playwright/test'
import { loginAsAdmin, navigateFromSidebar, setupTestLogging } from './test-utils'

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test('admin can access glider management and the create form', async ({ page }) => {
  await loginAsAdmin(page)
  await navigateFromSidebar(page, 'Planeurs')
  await expect(page.getByRole('heading', { name: 'Gestion des planeurs' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajouter un planeur' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un planeur' }).click()

  await expect(page).toHaveURL(/\/gliders\/new$/)
  await expect(page.getByRole('heading', { name: 'Nouveau planeur' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Fiche technique' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Inventaire' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Masse / centrage' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
})
