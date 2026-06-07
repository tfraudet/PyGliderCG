import { expect, test, type Page } from '@playwright/test'
import { loginAsAdmin, navigateFromSidebar, setupTestLogging } from './test-utils'

function fieldByLabel(page: Page, label: string) {
	return page
		.locator('label')
		.filter({ hasText: label })
		.first()
		.locator('xpath=ancestor::div[1]/following-sibling::input | ancestor::div[1]/following-sibling::div//input')
		.first()
}

function controlByLabel(page: Page, label: string) {
	return page
		.locator('label')
		.filter({ hasText: label })
		.first()
		.locator('xpath=ancestor::div[1]/following-sibling::button | ancestor::div[1]/following-sibling::div//button')
		.first()
}

function editorSaveButton(page: Page) {
	return page.locator('main').getByRole('button', { name: 'Enregistrer' })
}

function uniqueRegistration(prefix: string) {
	return `${prefix}-${Date.now().toString().slice(-4)}`
}

function gliderRow(page: Page, registration: string) {
	return page.locator('tbody tr').filter({ hasText: registration }).first()
}

async function openGliderActions(page: Page, registration: string) {
	await page.getByRole('button', { name: `Actions pour ${registration}` }).click()
}

function weightBalanceRow(page: Page, weight: number, balance: number) {
	return page
		.locator('tbody tr')
		.filter({ has: page.getByRole('cell', { name: String(weight), exact: true }) })
		.filter({ has: page.getByRole('cell', { name: String(balance), exact: true }) })
		.first()
}

function inventoryRow(page: Page, instrumentName: string) {
	return page
		.locator('tbody tr')
		.filter({ has: page.getByRole('cell', { name: instrumentName, exact: true }) })
		.first()
}

function weighingRow(page: Page, date: string) {
	return page
		.locator('tbody tr')
		.filter({ has: page.getByRole('cell', { name: date, exact: true }) })
		.first()
}

async function createConfiguredGlider(page: Page, registration: string) {
	await expect(page.getByRole('heading', { name: 'Gestion des planeurs' })).toBeVisible()
	await page.getByRole('button', { name: 'Ajouter un planeur' }).click()

	await page.waitForURL('**/gliders/new')
	await expect(page.getByRole('heading', { name: 'Nouveau planeur' })).toBeVisible()

	await fieldByLabel(page, 'Immatriculation').fill(registration)
	await fieldByLabel(page, 'Numero de serie').fill('49')
	await fieldByLabel(page, 'Modele').fill('Duo-Discus')
	await fieldByLabel(page, 'Marque').fill('Schempp-Hirth')

	const singleSeatCheckbox = page.getByRole('checkbox', { name: 'Planeur monoplace' })
	await expect(singleSeatCheckbox).toBeChecked()
	await singleSeatCheckbox.click()
	await expect(singleSeatCheckbox).not.toBeChecked()

	await controlByLabel(page, "Plan de référence et type d'appui").click()
	await page.getByRole('option', { name: 'Bord d\'attaque de l\'aile - 1 point en avant de la référence' }).click()
	await page.getByRole('radio', { name: 'En avant de la référence' }).check()

	await fieldByLabel(page, 'Plan de référence').fill('Bord d\'attaque de l\'aile à l\'emplanture')
	await fieldByLabel(page, 'Cale de référence').fill('45/1000')
	await fieldByLabel(page, 'Position de la cale de référence').fill('Arête supérieure de l\'arrière du fuselage')

	await fieldByLabel(page, 'MMWP (kg)').fill('700')
	await fieldByLabel(page, 'MMWV (kg)').fill('670')
	await fieldByLabel(page, 'MMENP (kg)').fill('440')
	await fieldByLabel(page, 'MMHarnais (kg)').fill('110')
	await fieldByLabel(page, 'Masse mini pilote (kg)').fill('70')
	await fieldByLabel(page, 'Centrage avant (mm)').fill('45')
	await fieldByLabel(page, 'Centrage arrière (mm)').fill('250')
	await fieldByLabel(page, 'Bras de levier pilote avant(mm)').fill('1400')
	await fieldByLabel(page, 'Bras de levier pilote arrière (mm)').fill('290')
	await fieldByLabel(page, 'Bras de levier waterballast (mm)').fill('65')
	await fieldByLabel(page, 'Bras de levier gueuse avant (mm)').fill('2055')
	await fieldByLabel(page, 'Bras de levier ballast ou gueuse arrière (mm)').fill('5320')

	await editorSaveButton(page).click()

	await page.waitForURL(new RegExp(`/gliders/edit\\?registration=${registration}$`))
	await expect(page.getByText(`Le planeur ${registration} a été créé avec succès.`)).toBeVisible()
}

async function openGliderEditorFromList(page: Page, registration: string) {
	await expect(page.getByRole('heading', { name: 'Gestion des planeurs' })).toBeVisible()
	await page.evaluate((value) => {
		window.history.pushState({}, '', `/gliders/edit?registration=${encodeURIComponent(value)}`)
		window.dispatchEvent(new PopStateEvent('popstate'))
	}, registration)
	await page.waitForURL(new RegExp(`/gliders/edit\\?registration=${registration}$`))
}

async function goToGliderListPageContaining(page: Page, registration: string) {
	const pageSummary = page.getByText(/^Affichage de \d+ a \d+ sur \d+ planeurs$/)

	while (true) {
		try {
			await expect(gliderRow(page, registration)).toBeVisible({ timeout: 2000 })
			return
		} catch {
			// Keep paging until the row is found or there are no more pages.
		}

		const nextPage = page.getByRole('button', { name: 'Go to next page' })
		if (!(await nextPage.count())) {
			break
		}

		const className = await nextPage.getAttribute('class')
		if (className?.includes('pointer-events-none')) {
			break
		}

		const previousSummary = await pageSummary.textContent()
		await nextPage.click()
		if (previousSummary) {
			await expect(pageSummary).not.toHaveText(previousSummary)
		}
	}

	throw new Error(`Unable to find glider row for ${registration} in paginated list`)
}

async function addWeightBalancePoint(page: Page, weight: number, balance: number) {
	await page.getByRole('button', { name: 'Ajouter un point' }).click()

	const dialog = page
		.getByRole('dialog')
		.filter({ has: page.getByRole('heading', { name: 'Nouveau point' }) })
		.last()
	await expect(dialog.getByRole('heading', { name: 'Nouveau point' })).toBeVisible()
	await dialog.getByRole('spinbutton').nth(0).fill(String(weight))
	await dialog.getByRole('spinbutton').nth(1).fill(String(balance))
	const submitButton = dialog.getByRole('button', { name: 'Ajouter' })
	await expect(submitButton).toBeEnabled()
	await submitButton.click({ force: true })

	await expect(weightBalanceRow(page, weight, balance)).toBeVisible()
}

async function addInstrument(
	page: Page,
	instrument: {
		name: string
		brand: string
		type: string
		number: string
		date: string
		seat: 'AV' | 'AR'
		onBoard: boolean
	},
) {
	await page.getByRole('button', { name: 'Ajouter un instrument' }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('heading', { name: 'Nouvel instrument' })).toBeVisible()

	await dialog.getByRole('textbox').nth(0).fill(instrument.name)
	await dialog.getByRole('textbox').nth(1).fill(instrument.brand)
	await dialog.getByRole('textbox').nth(2).fill(instrument.type)
	await dialog.getByRole('textbox').nth(3).fill(instrument.number)
	await dialog.getByRole('textbox').nth(4).fill(instrument.date)

	await dialog
		.locator('label')
		.filter({ hasText: 'Où' })
		.first()
		.locator('xpath=ancestor::div[1]//button')
		.first()
		.click()
	await page.getByRole('option', { name: instrument.seat }).click()

	const installedCheckbox = dialog.getByRole('checkbox', { name: 'Instrument installé' })
	if (instrument.onBoard) {
		await installedCheckbox.check()
	} else {
		await expect(installedCheckbox).not.toBeChecked()
	}

	await dialog.getByRole('button', { name: 'Ajouter' }).click()
	await expect(dialog).not.toBeVisible()
}

async function addWeighing(
	page: Page,
	weighing: {
		date: string
		p1: number
		p2: number
		A: number
		D: number
		rightWing: number
		leftWing: number
		tail: number
		fuselage: number
		fixBallast: number
	},
) {
	await page.getByRole('button', { name: 'Ajouter une pesée' }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByRole('heading', { name: 'Nouvelle pesée' })).toBeVisible()

	await dialog.getByRole('textbox', { name: 'JJ/MM/AAAA' }).fill(weighing.date)
	await dialog.getByRole('spinbutton').nth(0).fill(String(weighing.p1))
	await dialog.getByRole('spinbutton').nth(1).fill(String(weighing.p2))
	await dialog.getByRole('spinbutton').nth(2).fill(String(weighing.A))
	await dialog.getByRole('spinbutton').nth(3).fill(String(weighing.D))
	await dialog.getByRole('spinbutton').nth(4).fill(String(weighing.rightWing))
	await dialog.getByRole('spinbutton').nth(5).fill(String(weighing.leftWing))
	await dialog.getByRole('spinbutton').nth(6).fill(String(weighing.tail))
	await dialog.getByRole('spinbutton').nth(7).fill(String(weighing.fuselage))
	await dialog.getByRole('spinbutton').nth(8).fill(String(weighing.fixBallast))

	await dialog.getByRole('button', { name: 'Ajouter' }).click()
	await expect(dialog).not.toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test.describe('Glider Management', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page)
		await navigateFromSidebar(page, 'Planeurs')
	})

	test('should add a new glider with specific configuration', async ({ page }) => {
		const registration = uniqueRegistration('D')

		await createConfiguredGlider(page, registration)

		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await page.waitForURL('**/gliders')

		const row = gliderRow(page, registration)
		await expect(row).toBeVisible()
		await expect(row.getByRole('cell', { name: 'Duo-Discus' })).toBeVisible()
		await expect(row.getByRole('cell', { name: 'Schempp-Hirth' })).toBeVisible()
		await expect(row.getByRole('cell', { name: '49' })).toBeVisible()
		await expect(row.getByRole('checkbox', { name: `Monoplace ${registration}` })).not.toBeChecked()
	})

	test('should modify an existing glider ', async ({ page }) => {
		const registration = uniqueRegistration('E')
		const points = [
			[700, 45],
			[700, 250],
			[400, 250],
			[400, 45],
			[700, 45],
		] as const

		await createConfiguredGlider(page, registration)
		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await page.waitForURL('**/gliders')

		await openGliderEditorFromList(page, registration)
		await expect(page.getByRole('heading', { name: 'Edition du planeur' })).toBeVisible()

		await page.getByRole('tab', { name: 'Masse / centrage' }).click()
		await expect(page.getByRole('button', { name: 'Ajouter un point' })).toBeVisible()

		for (const [weight, balance] of points) {
			await addWeightBalancePoint(page, weight, balance)
		}

		await expect(weightBalanceRow(page, 700, 45)).toBeVisible()
		await expect(weightBalanceRow(page, 700, 250)).toBeVisible()
		await expect(weightBalanceRow(page, 400, 250)).toBeVisible()
		await expect(weightBalanceRow(page, 400, 45)).toBeVisible()

		await editorSaveButton(page).click()
		await expect(page.getByText(`Le planeur ${registration} a été enregistré avec succès.`)).toBeVisible()

		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await page.waitForURL('**/gliders')
		await openGliderEditorFromList(page, registration)
		await page.getByRole('tab', { name: 'Masse / centrage' }).click()

		await expect(weightBalanceRow(page, 700, 45)).toBeVisible()
		await expect(weightBalanceRow(page, 700, 250)).toBeVisible()
		await expect(weightBalanceRow(page, 400, 250)).toBeVisible()
		await expect(weightBalanceRow(page, 400, 45)).toBeVisible()
	})

	test('should add equipements to an existing glider', async ({ page }) => {
		const registration = uniqueRegistration('G')
		const instruments = [
			{
				name: 'instrument-1',
				brand: 'marque-1',
				type: 'type-1',
				number: '12345',
				date: '01/01/1970',
				seat: 'AV',
				onBoard: true,
			},
			{
				name: 'instrument-2',
				brand: 'marque-2',
				type: 'type-2',
				number: '67890',
				date: '02/02/1971',
				seat: 'AR',
				onBoard: false,
			},
		] as const

		await createConfiguredGlider(page, registration)
		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await page.waitForURL('**/gliders')

		await openGliderEditorFromList(page, registration)
		await expect(page.getByRole('heading', { name: 'Edition du planeur' })).toBeVisible()
		await page.getByRole('tab', { name: 'Inventaire' }).click()
		await expect(page.getByRole('button', { name: 'Ajouter un instrument' })).toBeVisible()

		for (const instrument of instruments) {
			await addInstrument(page, instrument)
		}

		const firstRow = inventoryRow(page, 'instrument-1')
		await expect(firstRow).toBeVisible()
		await expect(firstRow.getByRole('cell', { name: 'marque-1', exact: true })).toBeVisible()
		await expect(firstRow.getByRole('cell', { name: 'type-1', exact: true })).toBeVisible()
		await expect(firstRow.getByRole('cell', { name: '12345', exact: true })).toBeVisible()
		await expect(firstRow.getByRole('cell', { name: '1970-01-01', exact: true })).toBeVisible()
		await expect(firstRow.getByText('AV', { exact: true })).toBeVisible()
		await expect(firstRow.getByLabel('Instrument instrument-1 installé')).toBeVisible()

		const secondRow = inventoryRow(page, 'instrument-2')
		await expect(secondRow).toBeVisible()
		await expect(secondRow.getByRole('cell', { name: 'marque-2', exact: true })).toBeVisible()
		await expect(secondRow.getByRole('cell', { name: 'type-2', exact: true })).toBeVisible()
		await expect(secondRow.getByRole('cell', { name: '67890', exact: true })).toBeVisible()
		await expect(secondRow.getByRole('cell', { name: '1971-02-02', exact: true })).toBeVisible()
		await expect(secondRow.getByText('AR', { exact: true })).toBeVisible()
		await expect(secondRow.getByLabel('Instrument instrument-2 non installé')).toBeVisible()

		await editorSaveButton(page).click()
		await expect(page.getByText(`Le planeur ${registration} a été enregistré avec succès.`)).toBeVisible()

		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await page.waitForURL('**/gliders')
		await openGliderEditorFromList(page, registration)
		await page.getByRole('tab', { name: 'Inventaire' }).click()

		await expect(inventoryRow(page, 'instrument-1')).toBeVisible()
		await expect(inventoryRow(page, 'instrument-2')).toBeVisible()
		await expect(inventoryRow(page, 'instrument-1').getByLabel('Instrument instrument-1 installé')).toBeVisible()
		await expect(inventoryRow(page, 'instrument-2').getByLabel('Instrument instrument-2 non installé')).toBeVisible()
	})

	test('should add a new weigh-in for an existing glider', async ({ page }) => {
		const registration = uniqueRegistration('W')
		const weighing = {
			date: '17/06/2025',
			p1: 379.8,
			p2: 38.0,
			A: 65,
			D: 5265,
			rightWing: 102.7,
			leftWing: 102.7,
			tail: 9.6,
			fuselage: 202.8,
			fixBallast: 0.0,
		} as const

		await createConfiguredGlider(page, registration)
		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await navigateFromSidebar(page, 'Pesées')
		await expect(page.getByRole('heading', { name: 'Pesées' })).toBeVisible()

		await page.getByRole('combobox').click()
		await page.getByRole('option', { name: registration, exact: true }).click()
		await expect(page.getByRole('heading', { name: 'Liste des pesées pour ce planeur' })).toBeVisible()

		await addWeighing(page, weighing)

		const row = weighingRow(page, '2025-06-17')
		await expect(row).toBeVisible()
		await expect(row.getByRole('cell', { name: '379.8', exact: true })).toBeVisible()
		await expect(row.getByRole('cell', { name: '38', exact: true })).toBeVisible()
		await expect(row.getByRole('cell', { name: '65', exact: true })).toBeVisible()
		await expect(row.getByRole('cell', { name: '5265', exact: true })).toBeVisible()
		await expect(row.getByRole('cell', { name: '102.7', exact: true }).first()).toBeVisible()
		await expect(row.getByRole('cell', { name: '9.6', exact: true })).toBeVisible()
		await expect(row.getByRole('cell', { name: '202.8', exact: true })).toBeVisible()
		await expect(row.getByRole('cell', { name: '0', exact: true })).toBeVisible()

		await expect(page.getByText(/Détails de la pesée #\d+ du 17\/06\/2025/)).toBeVisible()
		await expect(page.locator('input[value="379.8"]').first()).toBeVisible()
		await expect(page.locator('input[value="38.0"]').first()).toBeVisible()
		await expect(page.locator('input[value="65"]').first()).toBeVisible()
		await expect(page.locator('input[value="5265"]').first()).toBeVisible()
		await expect(page.locator('input[value="102.7"]').first()).toBeVisible()
		await expect(page.locator('input[value="9.6"]').first()).toBeVisible()
		await expect(page.locator('input[value="202.8"]').first()).toBeVisible()
		await expect(page.locator('input[value="0.0"]').first()).toBeVisible()
		await expect(page.getByText('Les détails de calcul (MVE, charge utile, charge max, etc.)')).toBeVisible()
	})

	test('should delete an existing glider ', async ({ page }) => {
		const registration = uniqueRegistration('A')

		await createConfiguredGlider(page, registration)
		await page.getByRole('button', { name: 'Retour à la liste planeur' }).click()
		await page.waitForURL('**/gliders')
		await expect(page.getByRole('heading', { name: 'Gestion des planeurs' })).toBeVisible()

		await expect(gliderRow(page, registration)).toBeVisible()

		await openGliderActions(page, registration)
		await page.getByRole('menuitem', { name: 'Supprimer' }).click()

		await expect(gliderRow(page, registration)).toHaveCount(0)
	})

});