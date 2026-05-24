import { expect, test } from '@playwright/test'
import { loginAsAdmin, setupTestLogging } from './test-utils'

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test('admin can access users and audit pages', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('link', { name: 'Utilisateurs' }).click()
  await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible()
  await page.getByRole('link', { name: 'Audit Log' }).click()
  await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()
})
