import { test, expect, Page } from '@playwright/test';
import { selectGlider, selectGliderByKey, setupTestLogging } from './test-utils';


test.beforeAll( 'Setup', async () => {
  // console.log('Before tests');
});

test.beforeEach(async ({ page }) => {
	await setupTestLogging(page);
});

test.describe('Center of gravity for glider F-CGUP', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'F-CGUP');
  });

  test('should compute CG with a 80kg pilot', async ({ page }) => {
    // Check that glider F-CGUP is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Monoplace F-CGUP');

    // Specify a 80kg pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1500);

    // check the center of gravity 
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('356.0');

    // Check the weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('364.8');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('212.0');
  }); 

  test('should compute CG with a 95kg pilot', async ({ page }) => {
    // Check that glider F-CGUP is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Monoplace F-CGUP');

    // Specify a 95kg pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('95');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('322.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('379.8');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('227.0');
  });

  test('should compute CG with a 62kg pilot', async ({ page }) => {
    // Check that glider F-CGUP is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Monoplace F-CGUP');

    // Specify a 62kg pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('62');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');
    
    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('401.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('346.8');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('194.0');

    // check the center of gravity
    await expect(page.getByRole('tabpanel', { name: 'Calculateur centrage pilote' }).getByTestId('stAlertContainer')).toBeVisible();
    await expect(page.getByTestId('stAlertContentError').getByRole('paragraph')).toContainText('Centrage hors secteur.');
  });
});

test.describe('Center of gravity for glider D-2080', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'D-2080');
  });

  test('should compute CG with a 80kg pilot', async ({ page }) => {
    // Check that the correcty glider is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Monoplace D-2080');

    // Specify a 80kg pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check the center of gravity 
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('351.0');

    // Check the weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('364.2');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('214.2');
  }); 

  test('should compute CG with a 80kg pilot and a 3kg tail ballast', async ({ page }) => {
    // Check that the correcty glider is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Monoplace D-2080');

    // Specify a 80kg pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a tail ballast of 80kg
    await page.getByRole('spinbutton', { name: 'Masse Gueuse ou water ballast' }).click();
    await page.getByRole('spinbutton', { name: 'Masse Gueuse ou water ballast' }).fill('3');
    await page.getByRole('spinbutton', { name: 'Masse Gueuse ou water ballast' }).press('Enter');

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check the center of gravity 
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('383.0');

    // Check the weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('367.2');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('217.2');

    // check CG out of limit
    await expect(page.getByRole('tabpanel', { name: 'Calculateur centrage pilote' }).getByTestId('stAlertContainer')).toBeVisible();
    await expect(page.getByTestId('stAlertContentError').getByRole('paragraph')).toContainText('Centrage hors secteur.');

  }); 

  test('should compute CG with a 65kg pilot and 5kg front ballast', async ({ page }) => {
    // Check that the correcty glider is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Monoplace D-2080');

    // Specify a 65kg pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('65');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a 5kg front ballast
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).fill('5');
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).press('Enter');

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check the center of gravity 
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('359.0');

    // Check the weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('354.2');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('204.2');
  }); 

});

test.describe('Center of gravity for glider F-CJBH', () => {
  test.beforeEach(async ({ page }) => {
    await selectGliderByKey(page, 'F-CJBH', 11);
  });
 
  test('should compute CG with a 60kg front pilot and an 80kg rear pilot', async ({ page }) => {
    // Check that glider F-CJBH is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Biplace F-CJBH');
    await expect(page.getByTestId('stMainBlockContainer')).toContainText('planeur SNC34C Alliance de marque SN Centrair');
    
    // Specify a 60kg front pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('60');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a 80kg rear pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).press('Enter');
    
    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('2330.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('501.4');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('321.0');
  });

  test('should compute CG with a 50kg front pilot and an 80kg rear pilot', async ({ page }) => {
    // Check that glider F-CJBH is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Biplace F-CJBH');
    await expect(page.getByTestId('stMainBlockContainer')).toContainText('planeur SNC34C Alliance de marque SN Centrair');
    
    // Specify a 50kg front pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('50');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a 80kg rear pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).press('Enter');
    
    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('2356.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('491.4');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('311.0');

    // check CG out of limit
    await expect(page.getByRole('tabpanel', { name: 'Calculateur centrage pilote' }).getByTestId('stAlertContainer')).toBeVisible();
    await expect(page.getByTestId('stAlertContentError').getByRole('paragraph')).toContainText('Centrage hors secteur.');
  });
 
  test('should compute CG with a 50kg front pilot, an 80kg rear pilot and a 5kg front ballast', async ({ page }) => {
    // Check that glider F-CJBH is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Biplace F-CJBH');
    await expect(page.getByTestId('stMainBlockContainer')).toContainText('planeur SNC34C Alliance de marque SN Centrair');
    
    // Specify a 50kg front pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('50');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a 80kg rear pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).press('Enter');

    // Specify a 5kg front ballast
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).fill('5');
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).press('Enter');
    
    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('2333.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('496.4');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('316.0');

    // check CG out of limit
    await expect(page.getByRole('tabpanel', { name: 'Calculateur centrage pilote' }).getByTestId('stAlertContainer')).not.toBeVisible();
  });

});

test.describe('Center of gravity for glider F-CJDT', () => {
  test.beforeEach(async ({ page }) => {
    await selectGlider(page, 'F-CJDT');
  });

  test('should compute CG with a 60kg front pilot, an 70kg rear pilot, a 5kg front ballast and 40kg wing ballast', async ({ page }) => {
    // Check that glider F-CJBH is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Biplace F-CJDT');
    await expect(page.getByTestId('stMainBlockContainer')).toContainText('planeur Janus C de marque Schempp Hirth');
    
    // Specify a 60kg front pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('60');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a 80kg rear pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).press('Enter');

    // Specify a 5kg front ballast
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).fill('5');
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).press('Enter');

    // Specify a 40kg wing ballast
    await page.getByRole('spinbutton', { name: 'Masse d\'eau dans les ailes (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse d\'eau dans les ailes (kg)' }).fill('40');
    await page.getByRole('spinbutton', { name: 'Masse d\'eau dans les ailes (kg)' }).press('Enter');    

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('203.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('595.9');

    // check weight and CG with empty ballast

    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('206.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('555.9');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('336.4');

    // check CG out of limit
    await expect(page.getByRole('tabpanel', { name: 'Calculateur centrage pilote' }).getByTestId('stAlertContainer')).toBeVisible();
  });

  test('should compute CG with a 50kg front pilot, an 70kg rear pilot, a 5kg front ballast and 40kg wing ballast', async ({ page }) => {
    // Check that glider F-CJBH is selected
    await expect(page.locator('#monoplace-f-cgup')).toContainText('Biplace F-CJDT');
    await expect(page.getByTestId('stMainBlockContainer')).toContainText('planeur Janus C de marque Schempp Hirth');
    
    // Specify a 50kg front pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).fill('50');
    await page.getByRole('spinbutton', { name: 'Masse pilote avant équipé (en' }).press('Enter');

    // Specify a 80kg rear pilot
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).fill('80');
    await page.getByRole('spinbutton', { name: 'Masse pilote arrière équipé (kg)' }).press('Enter');

    // Specify a 5kg front ballast
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).fill('5');
    await page.getByRole('spinbutton', { name: 'Masse Gueuse avant (kg)' }).press('Enter');

    // Specify a 40kg wing ballast
    await page.getByRole('spinbutton', { name: 'Masse d\'eau dans les ailes (kg)' }).click();
    await page.getByRole('spinbutton', { name: 'Masse d\'eau dans les ailes (kg)' }).fill('40');
    await page.getByRole('spinbutton', { name: 'Masse d\'eau dans les ailes (kg)' }).press('Enter');    

    // compute weight and balance
    await page.getByTestId('stBaseButton-primary').click();
		await page.waitForTimeout(1000);

    // check weight and CG
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('229.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('585.9');

    // check weight and CG with empty ballast
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('233.0');
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('545.9');

    // check the non-lifting components weight
    await expect(page.getByLabel('Calculateur centrage pilote')).toContainText('326.4');

    // check CG out of limit
    await expect(page.getByRole('tabpanel', { name: 'Calculateur centrage pilote' }).getByTestId('stAlertContainer')).not.toBeVisible();
  });

});