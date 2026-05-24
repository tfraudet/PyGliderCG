import { expect, test } from '@playwright/test'
import { loginAsAdmin, setupTestLogging } from './test-utils'

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test('admin can access glider management route', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('link', { name: 'Planeurs' }).click()
  await expect(page.getByRole('heading', { name: 'Gestion des planeurs' })).toBeVisible()
})
