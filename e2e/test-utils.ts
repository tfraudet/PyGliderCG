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
export const KEY_PRESS_DELAY_MS = 100;

// Base URL constant
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/';
export const BASE_WEB_URL = BASE_URL;

/**
 * Common login function for admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
	await page.getByPlaceholder('Identifiant').fill(TEST_ADMIN_USERNAME);
	await page.getByPlaceholder('Mot de passe').fill(TEST_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page.getByText(`Connecté: ${TEST_ADMIN_USERNAME}`)).toBeVisible();
}

/**
 * Common login function for editor user
 */
export async function loginAsEditor(page: Page): Promise<void> {
	await page.getByPlaceholder('Identifiant').fill(TEST_EDITOR_USERNAME);
	await page.getByPlaceholder('Mot de passe').fill(TEST_EDITOR_PASSWORD);
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expect(page.getByText(`Connecté: ${TEST_EDITOR_USERNAME}`)).toBeVisible();
}

/**
 * Common function to go to login page
 */
export async function goToLoginPage(page: Page): Promise<void> {
	await page.goto(BASE_WEB_URL);
}

/**
 * Function to select a glider in the CG calculation page
 */
export async function selectGlider(page: Page, glider: string): Promise<void> {
	await page.getByRole('combobox').first().selectOption({ label: glider });
}

/**
 * Function to select glider with keyboard navigation
 */
export async function selectGliderByKey(page: Page, glider: string, numberOfKeyPresses: number = 10): Promise<void> {
	await page.getByRole('combobox').first().selectOption({ label: glider });
}


/**
 * Common beforeEach setup for test logging and navigation
 */
export async function setupTestLogging(page: Page): Promise<void> {
	console.log(`Running test: ${test.info().titlePath[1]} > ${test.info().title} (${test.info().titlePath[0] || 'No description'})`);
	await page.goto(BASE_WEB_URL);
}