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
const SIDEBAR_TOGGLE_LABEL = 'Toggle Sidebar';

async function ensureSidebarExpanded(page: Page): Promise<void> {
	const usernameField = page.getByLabel('Identifiant');
	const homeLink = page.getByRole('link', { name: 'Accueil' });

	if (await usernameField.isVisible() || await homeLink.isVisible()) {
		return;
	}

	await page.getByRole('button', { name: SIDEBAR_TOGGLE_LABEL }).click();
}

async function expectAuthenticatedUser(page: Page, username: string): Promise<void> {
	await expect(page.getByText(`Bienvenue, ${username}`)).toBeVisible();
}

async function login(page: Page, username: string, password: string): Promise<void> {
	await ensureSidebarExpanded(page);
	await page.getByLabel('Identifiant').fill(username);
	await page.getByLabel('Mot de passe').fill(password);
	await page.getByRole('button', { name: 'Se connecter' }).click();
	await expectAuthenticatedUser(page, username);
}

/**
 * Common login function for admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
	await login(page, TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD);
}

/**
 * Common login function for editor user
 */
export async function loginAsEditor(page: Page): Promise<void> {
	await login(page, TEST_EDITOR_USERNAME, TEST_EDITOR_PASSWORD);
}

/**
 * Common function to go to login page
 */
export async function goToLoginPage(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.localStorage.clear();
		window.sessionStorage.clear();
	});
	await page.goto(BASE_WEB_URL);
}

export async function navigateFromSidebar(page: Page, linkName: string): Promise<void> {
	await ensureSidebarExpanded(page);
	await page.getByRole('link', { name: linkName }).click();
}

/**
 * Function to select a glider in the CG calculation page
 */
export async function selectGlider(page: Page, glider: string): Promise<void> {
	const combobox = page.getByRole('combobox').first();
	await combobox.click();
	await page.getByRole('option', { name: glider }).click();
	await expect(combobox).toContainText(glider);
}

/**
 * Function to select glider with keyboard navigation
 */
export async function selectGliderByKey(page: Page, glider: string, _numberOfKeyPresses: number = 10): Promise<void> {
	await selectGlider(page, glider);
}

export async function selectFirstGlider(page: Page): Promise<string> {
	const combobox = page.getByRole('combobox').first();
	await combobox.click();
	const firstOption = page.getByRole('option').first();
	await expect(firstOption).toBeVisible();
	const label = (await firstOption.textContent())?.trim() ?? '';
	await firstOption.click();

	const registration = label.split(' — ')[0]?.trim() ?? label;
	if (registration) {
		await expect(combobox).toContainText(registration);
	}

	return registration;
}

/**
 * Common beforeEach setup for test logging and navigation
 */
export async function setupTestLogging(page: Page): Promise<void> {
	console.log(`Running test: ${test.info().titlePath[1]} > ${test.info().title} (${test.info().titlePath[0] || 'No description'})`);
	await goToLoginPage(page);
}