import { expect, test } from '@playwright/test'
import { selectGlider, selectGliderByKey, setupTestLogging } from './test-utils'

test.beforeEach(async ({ page }) => {
  await setupTestLogging(page)
})

test.beforeAll( 'Setup', async () => {
  // console.log('Before tests');
});

test.describe('Center of gravity for glider F-CGUP', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'F-CGUP');
  });

  test('should compute CG with a 80kg pilot', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CGUP')
    await expect(page.getByText('Monoplace')).toBeVisible()

    await page.locator('input[type="number"]').first().fill('80')
    await page.getByRole('button', { name: 'Calculer le centrage' }).click()

    await expect(page.getByText('Résultats du calcul')).toBeVisible()
    await expect(page.getByText('355.9 mm')).toBeVisible()
    await expect(page.getByText('364.8 kg')).toBeVisible()
    await expect(page.getByText('212.0 kg')).toBeVisible()
  }); 

  test('should compute CG with a 95kg pilot', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CGUP')

    await page.locator('input[type="number"]').first().fill('95')
    await page.getByRole('button', { name: 'Calculer le centrage' }).click()

    await expect(page.getByText('Résultats du calcul')).toBeVisible()
    await expect(page.getByText('321.6 mm')).toBeVisible()
    await expect(page.getByText('379.8 kg')).toBeVisible()
    await expect(page.getByText('227.0 kg')).toBeVisible()
  });

  test('should compute CG with a 62kg pilot', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CGUP')

    await page.locator('input[type="number"]').first().fill('62')
    await page.getByRole('button', { name: 'Calculer le centrage' }).click()

    await expect(page.getByText('Résultats du calcul')).toBeVisible()
    await expect(page.getByText('401.0 mm')).toBeVisible()
    await expect(page.getByText('346.8 kg')).toBeVisible()
    await expect(page.getByText('194.0 kg')).toBeVisible()
    await expect(page.getByText('Failed')).toBeVisible()
  });
});

test.describe('Center of gravity for glider D-2080', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'D-2080');
  });

  test('should compute CG with a 80kg pilot', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('D-2080')
    await expect(page.getByText('Monoplace')).toBeVisible()

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('80')
    await page.getByRole('button', { name: 'Calculer le centrage' }).click()

    await expect(page.getByText('Résultats du calcul')).toBeVisible()
    await expect(page.getByText('350.9 mm')).toBeVisible()
    await expect(page.getByText('364.2 kg')).toBeVisible()
    await expect(page.getByText('214.2 kg')).toBeVisible()
  }); 

  test('should compute CG with a 80kg pilot and a 3kg tail ballast', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('D-2080')

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('80')
    await enabledInputs.nth(2).fill('3')
    await page.getByRole('button', { name: 'Calculer le centrage' }).click()

    await expect(page.getByText('Résultats du calcul')).toBeVisible()
    await expect(page.getByText('382.9 mm')).toBeVisible()
    await expect(page.getByText('367.2 kg')).toBeVisible()
    await expect(page.getByText('217.2 kg')).toBeVisible()
    await expect(page.getByText('Failed')).toBeVisible()
  }); 

  test('should compute CG with a 65kg pilot and 5kg front ballast', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('D-2080')

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('65')
    await enabledInputs.nth(1).fill('5')
    await page.getByRole('button', { name: 'Calculer le centrage' }).click()

    await expect(page.getByText('Résultats du calcul')).toBeVisible()
    await expect(page.getByText('359.1 mm')).toBeVisible()
    await expect(page.getByText('354.2 kg')).toBeVisible()
    await expect(page.getByText('204.2 kg')).toBeVisible()
  }); 

});

test.describe('Center of gravity for glider F-CJBH', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'F-CJBH');
  });
 
  test('should compute CG with a 60kg front pilot and an 80kg rear pilot', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CJBH')
    await expect(page.getByText('Biplace')).toBeVisible()

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('60')
    await enabledInputs.nth(1).fill('80')
    await enabledInputs.nth(1).press('Tab')
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/gliders/by-id/F-CJBH/calculate') && response.ok(),
      ),
      page.getByRole('button', { name: 'Calculer le centrage' }).click(),
    ])

    await expect(page.getByText('Résultats du calcul')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('2329.6 mm')).toBeVisible()
    await expect(page.getByText('501.4 kg')).toBeVisible()
    await expect(page.getByText('321.0 kg')).toBeVisible()
  });

  test('should compute CG with a 50kg front pilot and an 80kg rear pilot', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CJBH')
    await expect(page.getByText('Biplace')).toBeVisible()

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('50')
    await enabledInputs.nth(1).fill('80')
    await enabledInputs.nth(1).press('Tab')
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/gliders/by-id/F-CJBH/calculate') && response.ok(),
      ),
      page.getByRole('button', { name: 'Calculer le centrage' }).click(),
    ])

    await expect(page.getByText('Résultats du calcul')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('2355.8 mm')).toBeVisible()
    await expect(page.getByText('491.4 kg')).toBeVisible()
    await expect(page.getByText('311.0 kg')).toBeVisible()
    await expect(page.getByText('Failed')).toBeVisible()
  });

});

test.describe('Center of gravity for glider F-CJDT', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'F-CJDT');
  });

  test('should compute CG with a 60kg front pilot, a 70kg rear pilot, a 5kg front ballast and 40kg wing ballast', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CJDT')
    await expect(page.getByText('Biplace')).toBeVisible()

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('60')
    await enabledInputs.nth(1).fill('70')
    await enabledInputs.nth(2).fill('5')
    await enabledInputs.nth(3).fill('40')
    await enabledInputs.nth(3).press('Tab')
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/gliders/by-id/F-CJDT/calculate') && response.ok(),
      ),
      page.getByRole('button', { name: 'Calculer le centrage' }).click(),
    ])

    await expect(page.getByText('Résultats du calcul')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('209.8 mm')).toBeVisible()
    await expect(page.getByText('585.9 kg')).toBeVisible()
    await expect(page.getByText('326.4 kg')).toBeVisible()
  });

  test('should compute CG with a 50kg front pilot, a 70kg rear pilot, a 5kg front ballast and 40kg wing ballast', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Calculateur de centrage' })).toBeVisible()
    await expect(page.getByRole('combobox').first()).toContainText('F-CJDT')
    await expect(page.getByText('Biplace')).toBeVisible()

    const enabledInputs = page.locator('input[type="number"]:not([disabled])')
    await enabledInputs.nth(0).fill('50')
    await enabledInputs.nth(1).fill('70')
    await enabledInputs.nth(2).fill('5')
    await enabledInputs.nth(3).fill('40')
    await enabledInputs.nth(3).press('Tab')
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/gliders/by-id/F-CJDT/calculate') && response.ok(),
      ),
      page.getByRole('button', { name: 'Calculer le centrage' }).click(),
    ])

    await expect(page.getByText('Résultats du calcul')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('236.0 mm')).toBeVisible()
    await expect(page.getByText('575.9 kg')).toBeVisible()
    await expect(page.getByText('316.4 kg')).toBeVisible()
  });

});