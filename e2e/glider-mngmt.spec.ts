import { test, expect, Page } from '@playwright/test';
import {
	TEST_ADMIN_USERNAME,
	TEST_ADMIN_PASSWORD,
	TYPING_SPEED_MS,
	KEY_PRESS_DELAY_MS,
	loginAsAdmin,
	selectD8207,
	setupTestLogging
} from './test-utils';

test.beforeEach(async ({ page }) => {
	await setupTestLogging(page);
});

test.describe('Glider Management', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin and go to users management page
		await loginAsAdmin(page);
		await page.getByRole('link', { name: 'Utilisateurs' }).click();
	});

	test('should add a new glider with specific configuration', async ({ page }) => {
		// Step 2: Navigate to "Planeurs" menu
		await page.getByRole('link', { name: 'Planeurs' }).click();

		// Verify we're on the gliders management page
		await expect(page.getByRole('heading', { name: 'Gestion des planeurs' })).toBeVisible();

		// Step 3: Click on "Ajouter un Planeur"
		await page.getByRole('button', { name: 'add Ajouter un planeur' }).click();

		// Step 4: Check that the alert message "Ajout d'un nouveau planeur" is visible
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByText('Ajout d\'un nouveau planeur')).toBeVisible();

		// Step 5: fill the form with specific values
		await page.getByRole('textbox', { name: 'Immatriculation' }).fill('D-8207');
		await expect(page.getByRole('textbox', { name: 'Immatriculation' })).toHaveValue('D-8207');

		await page.getByRole('textbox', { name: 'Numéro de série' }).fill('49');
		await expect(page.getByRole('textbox', { name: 'Numéro de série' })).toHaveValue('49');

		await page.getByRole('textbox', { name: 'Modèle' }).fill('Duo-Discus');
		await expect(page.getByRole('textbox', { name: 'Modèle' })).toHaveValue('Duo-Discus');

		await page.getByRole('textbox', { name: 'Marque' }).fill('Schempp-Hirth');
		await expect(page.getByRole('textbox', { name: 'Marque' })).toHaveValue('Schempp-Hirth');

		// Step 6: Uncheck "Monoplace" checkbox
		const monoplaceCheckbox = page.getByTestId('stCheckbox').locator('input[type="checkbox"]')
		await expect(monoplaceCheckbox).toBeChecked();
		// await monoplaceCheckbox.uncheck();
		await  page.getByTestId('stCheckbox').click();
		await expect(monoplaceCheckbox).not.toBeChecked();

		// Step 7: Weighing reference
		await page.getByRole('textbox', { name: 'Plan de référence' }).fill('Bord d\'attaque de l\'aile à l\'emplanture');
		await expect(page.getByRole('textbox', { name: 'Plan de référence' })).toHaveValue('Bord d\'attaque de l\'aile à l\'emplanture');

		await page.getByRole('textbox', { name: 'Cale de référence', exact: true }).fill('45/1000');
		await expect(page.getByRole('textbox', { name: 'Cale de référence', exact: true })).toHaveValue('45/1000');

		await page.getByRole('textbox', { name: 'Position de la cale de référence' }).fill('arête supérieur de l\'arrière du fuselage');
		await expect(page.getByRole('textbox', { name: 'Position de la cale de référence' })).toHaveValue('arête supérieur de l\'arrière du fuselage');

		await page.getByRole('img', { name: 'open' }).nth(1).click();
		await page.getByTestId('stSelectboxVirtualDropdown').getByText('Bord d\'attaque de l\'aile - 2').click();

		await page.locator('label').filter({ hasText: 'En avant de la référence' }).locator('div').first().click();

		// Step 8: mass limit and lever arms
		await page.getByRole('spinbutton', { name: 'MMWP (kg)' }).fill('525.0');
		await expect(page.getByRole('spinbutton', { name: 'MMWP (kg)' })).toHaveValue('525.0');

		await page.getByRole('spinbutton', { name: 'MMWV (kg)' }).fill('525.0');
		await expect(page.getByRole('spinbutton', { name: 'MMWV (kg)' })).toHaveValue('525.0');

		await page.getByRole('spinbutton', { name: 'MMENP (kg)' }).fill('235.0');
		await expect(page.getByRole('spinbutton', { name: 'MMENP (kg)' })).toHaveValue('235.0');

		await page.getByRole('spinbutton', { name: 'MHarnais (kg)' }).fill('110.0');
		await expect(page.getByRole('spinbutton', { name: 'MHarnais (kg)' })).toHaveValue('110.0');

		await page.getByRole('spinbutton', { name: 'Masse mini pilote (kg)' }).fill('70.0');
		await expect(page.getByRole('spinbutton', { name: 'Masse mini pilote (kg)' })).toHaveValue('70.0');

		await page.getByRole('spinbutton', { name: 'Bras de levier pilote avant(mm)' }).fill('513.0');
		await expect(page.getByRole('spinbutton', { name: 'Bras de levier pilote avant(mm)' })).toHaveValue('513.0');

		await page.getByRole('spinbutton', { name: 'Centrage avant (mm)' }).fill('250');
		await expect(page.getByRole('spinbutton', { name: 'Centrage avant (mm)' })).toHaveValue('250');

		await page.getByRole('spinbutton', { name: 'Centrage arrière (mm)' }).fill('400');
		await expect(page.getByRole('spinbutton', { name: 'Centrage arrière (mm)' })).toHaveValue('400');
		
		// Verify save button is available
		await expect(page.getByRole('button', { name: 'save Enregistrer' })).toBeVisible();

		// Step 9: Click on "Enregistrer"
		await page.getByRole('button', { name: 'save Enregistrer' }).click();
		await page.waitForTimeout(1000);

		// and verify the alert message is displayed
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContentInfo').getByRole('paragraph')).toContainText('Ajout d\'un nouveau planeur');
	});

	test('should modify an existing glider ', async ({ page }) => {
		// Navigate to "Planeurs" menu
		await page.getByRole('link', { name: 'Planeurs' }).click();

		// Select glider D-8207
		await selectD8207(page, 'D-8207',11);

		// Click edit button
		await page.getByRole('button', { name: 'L\'editer' }).click();
		await page.waitForTimeout(1000);

		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContentInfo').getByRole('paragraph')).toContainText('Modification du planeur D-8207');

		// Select the Mass/Balance tab
		await page.getByRole('tab', { name: 'Masse/centrage' }).click();

		// Add a rows to the mass/balance table
		await page.locator('.dvn-scroller').click(); 

		await page.getByRole('button', { name: 'Add row' }).click();
		await page.getByTestId('data-grid-canvas').press('Enter');
		await page.keyboard.type('45', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('700.0', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		await page.getByRole('button', { name: 'Add row' }).click();
		await page.getByTestId('data-grid-canvas').press('ArrowDown');
		await page.getByTestId('data-grid-canvas').press('ArrowLeft');
		await page.getByTestId('data-grid-canvas').press('Enter');
		await page.keyboard.type('250', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('700.0', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		await page.getByRole('button', { name: 'Add row' }).click();
		await page.getByTestId('data-grid-canvas').press('ArrowDown');
		await page.getByTestId('data-grid-canvas').press('ArrowLeft');
		await page.getByTestId('data-grid-canvas').press('Enter');
		await page.keyboard.type('250', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('400.0', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		await page.getByRole('button', { name: 'Add row' }).click();
		await page.getByTestId('data-grid-canvas').press('ArrowDown');
		await page.getByTestId('data-grid-canvas').press('ArrowLeft');
		await page.getByTestId('data-grid-canvas').press('Enter');
		await page.keyboard.type('45', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('400.0', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		await page.getByRole('button', { name: 'Add row' }).click();
		await page.getByTestId('data-grid-canvas').press('ArrowDown');
		await page.getByTestId('data-grid-canvas').press('ArrowLeft');
		await page.getByTestId('data-grid-canvas').press('Enter');
		await page.keyboard.type('45', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });
		await page.keyboard.type('700.0', { delay: TYPING_SPEED_MS });
		await page.keyboard.press('Tab', { delay: KEY_PRESS_DELAY_MS });

		// save modifications
		await expect(page.getByRole('button', { name: 'save Enregistrer' })).toBeVisible();
		await page.getByRole('button', { name: 'save Enregistrer' }).click();

		await expect(page.getByRole('alert').filter({ hasText: 'infoAjout de point(s)' })).toBeVisible();
		await expect(page.getByTestId('stTabs').getByTestId('stAlertContentInfo').getByRole('paragraph')).toContainText('Ajout de point(s)');
		await expect(page.getByRole('alert').filter({ hasText: 'check_circlePoints masse &' })).toBeVisible();
		await expect(page.getByTestId('stAlertContentSuccess').getByRole('paragraph')).toContainText('Points masse & centrage du planeur D-8207 mis à jour avec succès');
	});

	test('should delete an existing glider ', async ({ page }) => {
		// Navigate to "Planeurs" menu
		await page.getByRole('link', { name: 'Planeurs' }).click();

		// Select glider D-8207
		await selectD8207(page, 'D-8207',11);

		// Click edit button
		await page.getByRole('button', { name: 'L\'editer' }).click();
		await page.waitForTimeout(1000);

		// Verify that glider is selected alert message is displayed
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContentInfo').getByRole('paragraph')).toContainText('Modification du planeur D-8207');

		// Click delete button
		await page.getByRole('button', { name: 'L\'effacer' }).click();
		await page.waitForTimeout(1000);
		await expect(page.getByTestId('stAlertContainer')).toBeVisible();
		await expect(page.getByTestId('stAlertContentSuccess').getByRole('paragraph')).toContainText('Planeur D-8207 effacé avec succès !');

	});
});
