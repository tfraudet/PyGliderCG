import { test, expect } from '@playwright/test';
import {
	TEST_ADMIN_USERNAME,
	TEST_ADMIN_PASSWORD,
	TEST_EDITOR_USERNAME,
	TEST_EDITOR_PASSWORD,
	INCORRECT_PASSWORD,
	TYPING_SPEED_MS,
	KEY_PRESS_DELAY_MS,
	goToLoginPage,
	loginAsAdmin,
	setupTestLogging
} from './test-utils';

test.beforeEach(async ({ page }) => {
	await setupTestLogging(page);
});

test.describe('Login Functionality', () => {
	test.beforeEach(async ({ page }) => {
		// go to login page
		await goToLoginPage(page);
	});

	test('should fail to login with an incorrect password', async ({ page }) => {
		// check that we are well in the login page
		await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

		// verify the presence and text of the login button
		const loginButton = page.getByTestId('stBaseButton-secondary');
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toContainText('Se connecter');

		// enter username and a bad password
		await page.getByRole('textbox', { name: 'Identifiant' }).click();
		await page.getByRole('textbox', { name: 'Identifiant' }).fill(TEST_ADMIN_USERNAME);
		await page.getByRole('textbox', { name: 'Mot de passe' }).click();
		await page.getByRole('textbox', { name: 'Mot de passe' }).fill(INCORRECT_PASSWORD);
		await page.getByTestId('stBaseButton-secondary').click();

		// check that we are the error message
		await expect(page.getByText('Identifiant ou mot de passe')).toBeVisible();
	});

	test('should successfully logout', async ({ page }) => {
		// check that we are well in the login page
		await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

		// verify the presence and text of the login button
		const loginButton = page.getByTestId('stBaseButton-secondary');
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toContainText('Se connecter');

		// enter username / password
		await page.getByRole('textbox', { name: 'Identifiant' }).click();
		await page.getByRole('textbox', { name: 'Identifiant' }).fill(TEST_ADMIN_USERNAME);
		await page.getByRole('textbox', { name: 'Mot de passe' }).click();
		await page.getByRole('textbox', { name: 'Mot de passe' }).fill(TEST_ADMIN_PASSWORD);
		await page.getByTestId('stBaseButton-secondary').click();

		// check that logout button is visible 
		await expect(page.getByTestId('stBaseButton-secondary')).toBeVisible();
		await expect(page.getByTestId('stBaseButton-secondary')).toContainText('Déconnexion');

		//Logout
		await page.getByTestId('stBaseButton-secondary').click();

		// check that we are back to the login page
		await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

	});
	
	test('should successfully log in with a valid admin account', async ({ page }) => {
		// check that we are well in the login page
		await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

		// verify the presence and text of the login button
		const loginButton = page.getByTestId('stBaseButton-secondary');
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toContainText('Se connecter');

		// enter username and a good password
		await page.getByRole('textbox', { name: 'Identifiant' }).click();
		await page.getByRole('textbox', { name: 'Identifiant' }).fill(TEST_ADMIN_USERNAME);
		await page.getByRole('textbox', { name: 'Mot de passe' }).click();
		await page.getByRole('textbox', { name: 'Mot de passe' }).fill(TEST_ADMIN_PASSWORD);
		await page.getByTestId('stBaseButton-secondary').click();

		// verify successful login
		await expect(page.getByRole('heading', { name: `Bienvenue, ${TEST_ADMIN_USERNAME}` })).toBeVisible();

		// check that the role is well administrator
		await expect(page.getByText('administrator')).toBeVisible();

		// check that we the admin menu is well displayed
		await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Planeurs' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Pesées' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Utilisateurs' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'description Audit Log' })).toBeVisible();
	});

	test('should successfully log in with a valid editor account', async ({ page }) => {
		// check that we are well in the login page
		await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

		// verify the presence and text of the login button
		const loginButton = page.getByTestId('stBaseButton-secondary');
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toContainText('Se connecter');

		// enter username and a good password
		await page.getByRole('textbox', { name: 'Identifiant' }).click();
		await page.getByRole('textbox', { name: 'Identifiant' }).fill(TEST_EDITOR_USERNAME);
		await page.getByRole('textbox', { name: 'Mot de passe' }).click();
		await page.getByRole('textbox', { name: 'Mot de passe' }).fill(TEST_EDITOR_PASSWORD);
		await page.getByTestId('stBaseButton-secondary').click();

		// verify successful login
		await expect(page.getByRole('heading', { name: `Bienvenue, ${TEST_EDITOR_USERNAME}` })).toBeVisible();

		// check that the role is well editor
		await expect(page.getByText('editor')).toBeVisible();

		// check that we have the editor menu is well displayed
		await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Planeurs' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Pesées' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Utilisateurs' })).not.toBeVisible();
		await expect(page.getByRole('link', { name: 'description Audit Log' })).not.toBeVisible();
	});
});

test.describe('Users management', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin and go to users management page
		await loginAsAdmin(page);
		await page.getByRole('link', { name: 'Utilisateurs' }).click();
	});

	test('should successfully create a new user', async ({ page }) => {

		// fill the new user form
		await page.getByTestId('stForm').click();
		await page.getByRole('button', { name: 'Add row' }).press('Enter');
		await page.getByTestId('stDataFrame').getByRole('button', { name: 'Fullscreen' }).press('Tab');

		await page.getByTestId('data-grid-canvas').press('ArrowDown');
		await page.getByTestId('data-grid-canvas').press('ArrowDown');
		await page.getByTestId('data-grid-canvas').press('ArrowLeft');
		await page.getByTestId('data-grid-canvas').press('ArrowLeft');

		await page.getByTestId('data-grid-canvas').press('Enter');
		await page.keyboard.type('test-username', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		await page.keyboard.press('Enter', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('test-email@a.com', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		await page.keyboard.press('Enter', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('test-password', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		// Wait for 500 milliseconds (0.5 seconds)
		await page.waitForTimeout(500);

		// Log what has been enter in the UI
		const username = await page.getByTestId('glide-cell-1-4').textContent()
		const email = await page.getByTestId('glide-cell-2-4').textContent()
		const pwd = await page.getByTestId('glide-cell-3-4').textContent()
		const role = await page.getByTestId('glide-cell-4-4').textContent()
		console.log(`Add a new row in the dataFrame: usernam	e = ${username}, email = ${email}, password = ${pwd}, role = ${role}`);

		// click the save button
		await page.getByTestId('stBaseButton-secondaryFormSubmit').click();

		// check successful creation
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContainer')).toContainText('Utilisateur(s) ajouté(s) avec succès');
		// await expect(page.getByText('Utilisateur(s) ajouté(s) avec')).toBeVisible();

		await expect(page.getByRole('button', { name: 'Ok' })).toBeVisible();
		await page.getByRole('button', { name: 'Ok' }).click();

	});

	test('should successfully delete the last user from the dataframe', async ({ page }) => {
		// Step 3: Navigate to "Utilisateurs" menu
		await page.getByRole('link', { name: 'Utilisateurs' }).click();

		// Wait for the users page to load
		await expect(page.getByRole('heading', { name: /Liste des utilisateurs/ })).toBeVisible();

		// Wait for the dataframe to load
		// await page.waitForSelector('[data-testid="stDataFrame"]', { timeout: 10000 });

		// find the row in the dataframe with a specific username
		await page.getByTestId('stForm').click();
		await page.getByRole('button', { name: 'Search' }).click();
		await page.getByTestId('search-input').fill('test-username');
		await page.getByTestId('search-input').press('Enter');
		await page.getByTestId('search-close-button').click();

		// Highlight the row to delete
		// TODO: Currently using mouse movement; consider implementing a more robust selection method.
		const x= 380;
		const y = 370 ;
		await page.mouse.move(x, y);
		await page.waitForTimeout(500);
		await page.mouse.click(x, y); 
		await page.waitForTimeout(500);

		// // Step 5: Click on the "Delete row(s)" icon
		await page.getByRole('button', { name: 'Delete row(s)' }).click();
		await page.waitForTimeout(500);

		// Step 6: Click on "Enregistrer" button to save changes
		await page.getByTestId('stBaseButton-secondaryFormSubmit').click();

		// Step 7: Check that the alert message "Utilisateur(s) effacé(s) avec succès" is visible
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContainer')).toContainText('Utilisateur(s) effacé(s) avec succès');

		// Step 8: Click on the "Ok" button
		await expect(page.getByRole('button', { name: 'Ok' })).toBeVisible();
		await page.getByRole('button', { name: 'Ok' }).click();
	});

});

test.describe('Import/export', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin and go to users management page
		await loginAsAdmin(page);
		await page.getByRole('link', { name: 'Utilisateurs' }).click();
	});
	
	test('should successfully export the database', async ({ page }) => {
		// Check tha admin section and buttons are displyed
		await expect(page.locator('#settings-administration')).toContainText('settings Administration');
		await expect(page.getByRole('button', { name: 'cloud_download icon Exporter' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'cloud_upload icon Importer la' })).toBeVisible();

		// Click on the export button
		await page.getByRole('button', { name: 'cloud_download icon Exporter' }).click();
		await expect(page.getByLabel('dialog')).toContainText('Base de données zippée avec succès');

		// execute the export
		await page.getByTestId('stDownloadButton').getByTestId('stBaseButton-secondary').click();
		const download = await page.waitForEvent('download');;

		// Check that the export is successfull
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContentSuccess').getByRole('paragraph')).toContainText('La base de données a été téléchargée avec succès');
		await page.getByRole('button', { name: 'Close' }).click();
	});

	test('should successfully import the database', async ({ page }) => {
		// Check tha admin section and buttons are displyed
		await expect(page.locator('#settings-administration')).toContainText('settings Administration');
		await expect(page.getByRole('button', { name: 'cloud_download icon Exporter' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'cloud_upload icon Importer la' })).toBeVisible();
		
		// Click on the import button
		await page.getByRole('button', { name: 'cloud_upload icon Importer la' }).click();

		// Select the file to import
		await page.getByTestId('stFileUploaderDropzoneInput').setInputFiles('./data/test_import_db.zip');
	
		// Check that the import is successfull
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContentSuccess').getByRole('paragraph')).toContainText('Base de données importée avec succès');

	});

});