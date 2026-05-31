import { expect, test, type Page } from '@playwright/test'
import { loginAsAdmin, navigateFromSidebar, setupTestLogging } from './test-utils'

async function openUserActions(page: Page, username: string) {
  await page.getByRole('button', { name: `Actions pour ${username}` }).click()
}

async function expectUserRow(page: Page, username: string) {
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: username }) })
  await expect(row).toBeVisible()
  return row
}

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test('admin can manage users through the React UI', async ({ page }) => {
  const timestamp = Date.now()
  const username = `e2e-user-${timestamp}`
  const initialEmail = `${username}@example.com`
  const updatedEmail = `${username}.updated@example.com`
  const password = 'playwright-user-pass'

  await loginAsAdmin(page)
  await navigateFromSidebar(page, 'Utilisateurs')

  await expect(page.getByRole('heading', { name: 'Liste des utilisateurs' })).toBeVisible()
  await page.getByRole('button', { name: 'Ajouter un utilisateur' }).click()

  const createDialog = page.getByRole('dialog')
  await expect(createDialog.getByRole('heading', { name: 'Nouvel utilisateur' })).toBeVisible()
  await createDialog.getByPlaceholder('ex: jdoe').fill(username)
  await createDialog.getByPlaceholder('ex: john@example.com').fill(initialEmail)
  await createDialog.getByPlaceholder('Mot de passe').fill(password)
  await createDialog.getByRole('combobox').click()
  await page.getByRole('option', { name: 'viewer' }).click()
  await createDialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(createDialog).not.toBeVisible()

  const createdRow = await expectUserRow(page, username)
  await expect(createdRow).toContainText(initialEmail)
  await expect(createdRow).toContainText('viewer')

  await openUserActions(page, username)
  await page.getByRole('menuitem', { name: 'View' }).click()

  const viewDialog = page.getByRole('dialog')
  const viewInputs = viewDialog.locator('input')
  await expect(viewDialog.getByRole('heading', { name: `Voir ${username}` })).toBeVisible()
  await expect(viewInputs.nth(1)).toHaveValue(initialEmail)
  await expect(viewDialog.getByText('viewer')).toBeVisible()
  await viewDialog.getByRole('button', { name: 'Close' }).click()
  await expect(viewDialog).not.toBeVisible()

  await openUserActions(page, username)
  await page.getByRole('menuitem', { name: 'Edit' }).click()

  const editDialog = page.getByRole('dialog')
  const editInputs = editDialog.locator('input')
  await expect(editDialog.getByRole('heading', { name: `Modifier ${username}` })).toBeVisible()
  await editInputs.nth(1).fill(updatedEmail)
  await editDialog.getByRole('combobox').click()
  await page.getByRole('option', { name: 'editor' }).click()
  await editDialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(editDialog).not.toBeVisible()

  const updatedRow = await expectUserRow(page, username)
  await expect(updatedRow).toContainText(updatedEmail)
  await expect(updatedRow).toContainText('editor')

  await page.getByRole('checkbox', { name: `Sélectionner ${username}` }).click()
  await page.getByRole('button', { name: /Supprimer la sélection/ }).click()
  await expect(
    page.getByRole('row').filter({ has: page.getByRole('cell', { name: username, exact: true }) }),
  ).toHaveCount(0)

  await navigateFromSidebar(page, 'Audit Log')
  await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()
  await expect(page.getByText(`User ${username} created`)).toBeVisible()
  await expect(page.getByText(`User ${username} updated`)).toBeVisible()
  await expect(page.getByText(`User ${username} deleted`)).toBeVisible()
})
