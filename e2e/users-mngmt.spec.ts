import { expect, test, type Page } from '@playwright/test'
import {
  INCORRECT_PASSWORD,
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_USERNAME,
  TEST_EDITOR_PASSWORD,
  TEST_EDITOR_USERNAME,
  loginAsAdmin,
  navigateFromSidebar,
  setupTestLogging,
} from './test-utils'

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

test.describe('Login Functionality', () => {
	test.beforeEach(async ({ page }) => {
    	await setupTestLogging(page)
	});

	test('should fail to login with an incorrect password', async ({ page }) => {
		const loginHeading = page.getByRole('heading', { name: 'Connexion' })
		if (!(await loginHeading.isVisible())) {
			await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
		}

		await expect(loginHeading).toBeVisible()

		await page.getByLabel('Identifiant').fill(TEST_ADMIN_USERNAME)
		await page.getByLabel('Mot de passe').fill(INCORRECT_PASSWORD)
		await page.getByRole('button', { name: 'Se connecter' }).click()

		await expect(page.getByText('Invalid username or password')).toBeVisible()
		await expect(page.getByText(`Bienvenue, ${TEST_ADMIN_USERNAME}`)).not.toBeVisible()
	});

	test('should successfully logout', async ({ page }) => {
		await loginAsAdmin(page)

		const logoutButton = page.getByRole('button', { name: 'Déconnexion' })
		if (!(await logoutButton.isVisible())) {
			await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
		}

		await expect(logoutButton).toBeVisible()
		await logoutButton.click()
		await page.waitForFunction(() => !window.localStorage.getItem('pyglidercg_token'))
		await expect(page.getByText(`Bienvenue, ${TEST_ADMIN_USERNAME}`)).not.toBeVisible()

		const loginHeading = page.getByRole('heading', { name: 'Connexion' })
		const usernameField = page.getByLabel('Identifiant')
		if (!(await usernameField.isVisible())) {
			await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
		}

		await expect(usernameField).toBeVisible()
		await expect(loginHeading).toBeVisible()
		await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
		await expect(page.getByText(`Bienvenue, ${TEST_ADMIN_USERNAME}`)).not.toBeVisible()
	});
	
	test('should successfully log in with a valid admin account', async ({ page }) => {
		const loginHeading = page.getByRole('heading', { name: 'Connexion' })
		if (!(await loginHeading.isVisible())) {
			await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
		}

		await expect(loginHeading).toBeVisible()

		const loginButton = page.getByRole('button', { name: 'Se connecter' })
		await expect(loginButton).toBeVisible()

		await page.getByLabel('Identifiant').fill(TEST_ADMIN_USERNAME)
		await page.getByLabel('Mot de passe').fill(TEST_ADMIN_PASSWORD)
		await loginButton.click()

		await expect(page.getByText(`Bienvenue, ${TEST_ADMIN_USERNAME}`)).toBeVisible()
		await expect(page.getByText('administrator')).toBeVisible()
		await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Planeurs' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Pesées' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Utilisateurs' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Audit Log' })).toBeVisible()
	});

	test('should successfully log in with a valid editor account', async ({ page }) => {
		const loginHeading = page.getByRole('heading', { name: 'Connexion' })
		if (!(await loginHeading.isVisible())) {
			await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
		}

		await expect(loginHeading).toBeVisible()

		const loginButton = page.getByRole('button', { name: 'Se connecter' })
		await expect(loginButton).toBeVisible()

		await page.getByLabel('Identifiant').fill(TEST_EDITOR_USERNAME)
		await page.getByLabel('Mot de passe').fill(TEST_EDITOR_PASSWORD)
		await loginButton.click()

		await expect(page.getByText(`Bienvenue, ${TEST_EDITOR_USERNAME}`)).toBeVisible()
		await expect(page.getByText('editor')).toBeVisible()
		await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Planeurs' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Pesées' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Utilisateurs' })).not.toBeVisible()
		await expect(page.getByRole('link', { name: 'Audit Log' })).not.toBeVisible()
	});
});

test.describe('Users management', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin and go to users management page
		await loginAsAdmin(page);
		await page.getByRole('link', { name: 'Utilisateurs' }).click();
	});

	test('should successfully create a new user', async ({ page }) => {
		const timestamp = Date.now()
		const username = `e2e-user-${timestamp}`
		const email = `${username}@example.com`
		const password = 'playwright-user-pass'

		await expect(page.getByRole('heading', { name: 'Liste des utilisateurs' })).toBeVisible()

		await page.getByRole('button', { name: 'Ajouter un utilisateur' }).click()

		const dialog = page.getByRole('dialog')
		await expect(dialog.getByRole('heading', { name: 'Nouvel utilisateur' })).toBeVisible()

		await dialog.getByPlaceholder('ex: jdoe').fill(username)
		await dialog.getByPlaceholder('ex: john@example.com').fill(email)
		await dialog.getByPlaceholder('Mot de passe').fill(password)
		await dialog.getByRole('combobox').click()
		await page.getByRole('option', { name: 'editor' }).click()
		await dialog.getByRole('button', { name: 'Enregistrer' }).click()

		await expect(dialog).not.toBeVisible()

		const row = await expectUserRow(page, username)
		await expect(row.getByRole('cell', { name: email })).toBeVisible()
		await expect(row.getByText('editor')).toBeVisible()
	});

	test('should successfully delete the last user from the dataframe', async ({ page }) => {
		const timestamp = Date.now()
		const username = `e2e-delete-user-${timestamp}`
		const email = `${username}@example.com`
		const password = 'playwright-user-pass'

		await expect(page.getByRole('heading', { name: 'Liste des utilisateurs' })).toBeVisible()

		await page.getByRole('button', { name: 'Ajouter un utilisateur' }).click()

		const dialog = page.getByRole('dialog')
		await expect(dialog.getByRole('heading', { name: 'Nouvel utilisateur' })).toBeVisible()

		await dialog.getByPlaceholder('ex: jdoe').fill(username)
		await dialog.getByPlaceholder('ex: john@example.com').fill(email)
		await dialog.getByPlaceholder('Mot de passe').fill(password)
		await dialog.getByRole('combobox').click()
		await page.getByRole('option', { name: 'viewer' }).click()
		await dialog.getByRole('button', { name: 'Enregistrer' }).click()

		await expect(dialog).not.toBeVisible()
		await expectUserRow(page, username)

		await openUserActions(page, username)
		await page.getByRole('menuitem', { name: 'Delete' }).click()

		await expect(page.getByRole('row').filter({ has: page.getByRole('cell', { name: username }) })).toHaveCount(0)
	});

});

test.describe('Import/export', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin and go to users management page
		await loginAsAdmin(page);
		await page.getByRole('link', { name: 'Utilisateurs' }).click();
	});
	
	test('should successfully export the database', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()
		const exportButton = page.getByRole('button', { name: 'Exporter la base' })
		const importButton = page.getByRole('button', { name: 'Importer la base' })
		await expect(exportButton).toBeVisible()
		await expect(importButton).toBeVisible()

		const downloadPromise = page.waitForEvent('download')
		await exportButton.click()
		const download = await downloadPromise

		await expect(page.getByText('Base de donnée exportée avec succès.')).toBeVisible()
		await expect(download.suggestedFilename()).toBe('exported_db.zip')
	});

	test('should successfully import the database', async ({ page }, testInfo) => {
		await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()
		const exportButton = page.getByRole('button', { name: 'Exporter la base' })
		const importButton = page.getByRole('button', { name: 'Importer la base' })
		await expect(exportButton).toBeVisible()
		await expect(importButton).toBeVisible()

		const downloadPromise = page.waitForEvent('download')
		await exportButton.click()
		const download = await downloadPromise
		const archivePath = testInfo.outputPath('import-db.zip')
		await download.saveAs(archivePath)

		await expect(page.getByText('Base de donnée exportée avec succès.')).toBeVisible()

		await page.locator('#import-db').setInputFiles(archivePath)

		await expect(page.getByText('Base de donnée importée avec succès.')).toBeVisible()
	});

});