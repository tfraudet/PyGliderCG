import { test, expect, Page } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Authentication constants
export const TEST_ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME || 'admin-user';
export const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin-user-password';
export const TEST_EDITOR_USERNAME = process.env.TEST_EDITOR_USERNAME || 'editor-user';
export const TEST_EDITOR_PASSWORD = process.env.TEST_EDITOR_PASSWORD || 'editor-user-password';
export const INCORRECT_PASSWORD = 'bad-password';

// Timing constants
export const TYPING_SPEED_MS = 20;
export const KEY_PRESS_DELAY_MS = 80;

// Base URL constant
export const BASE_URL = 'http://localhost:8501/';

/**
 * Common login function for admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
	// Go to login page
	await page.getByTestId('stExpandSidebarButton').click();

	// Check that we are in the login page
	await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

	// Verify the presence and text of the login button
	const loginButton = page.getByTestId('stBaseButton-secondary');
	await expect(loginButton).toBeVisible();
	await expect(loginButton).toContainText('Se connecter');

	// Enter admin username and password
	await page.getByRole('textbox', { name: 'Identifiant' }).click();
	await page.getByRole('textbox', { name: 'Identifiant' }).fill(TEST_ADMIN_USERNAME);
	await page.getByRole('textbox', { name: 'Mot de passe' }).click();
	await page.getByRole('textbox', { name: 'Mot de passe' }).fill(TEST_ADMIN_PASSWORD);
	await page.getByTestId('stBaseButton-secondary').click();
}

/**
 * Common login function for editor user
 */
export async function loginAsEditor(page: Page): Promise<void> {
	// Go to login page
	await page.getByTestId('stExpandSidebarButton').click();

	// Check that we are in the login page
	await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

	// Verify the presence and text of the login button
	const loginButton = page.getByTestId('stBaseButton-secondary');
	await expect(loginButton).toBeVisible();
	await expect(loginButton).toContainText('Se connecter');

	// Enter editor username and password
	await page.getByRole('textbox', { name: 'Identifiant' }).click();
	await page.getByRole('textbox', { name: 'Identifiant' }).fill(TEST_EDITOR_USERNAME);
	await page.getByRole('textbox', { name: 'Mot de passe' }).click();
	await page.getByRole('textbox', { name: 'Mot de passe' }).fill(TEST_EDITOR_PASSWORD);
	await page.getByTestId('stBaseButton-secondary').click();
}

/**
 * Common function to go to login page
 */
export async function goToLoginPage(page: Page): Promise<void> {
	await page.getByTestId('stExpandSidebarButton').click();
}

/**
 * Function to select a glider in the CG calculation page
 */
export async function selectGlider(page: Page, glider: string): Promise<void> {
	await page.getByRole('img', { name: 'open' }).click();
	await page.getByTestId('stSelectboxVirtualDropdown').getByText(glider).click();
}

/**
 * Function to select glider with keyboard navigation
 */
export async function selectGliderByKey(page: Page, glider: string, numberOfKeyPresses: number = 10): Promise<void> {
	await page.getByTestId('stSelectbox').first().click();
	for (let i = 0; i < numberOfKeyPresses; i++) {
		await page.keyboard.press('ArrowDown');
	}
	await page.keyboard.press('Enter');
}

/**
 * Common beforeEach setup for test logging and navigation
 */
export async function setupTestLogging(page: Page): Promise<void> {
	console.log(`Running test: ${test.info().titlePath[1]} > ${test.info().title} (${test.info().titlePath[0] || 'No description'})`);
	await page.goto(BASE_URL);
}
