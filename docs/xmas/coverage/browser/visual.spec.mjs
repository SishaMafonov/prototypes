import { expect, test } from '@playwright/test';
import { choosePhoto, deal, hostButton, openGame } from './fixtures.mjs';

test('V01 desktop betting board keeps the track, odds, and mixed portraits legible', async ({ page }) => {
  await openGame(page);
  await choosePhoto(page, 'Hearts');
  await deal(page);
  await expect(page).toHaveScreenshot('desktop-betting.png', { maxDiffPixelRatio: 0.001 });
});

test('V02 desktop results display the champion portrait and finish marker together', async ({ page }) => {
  await openGame(page);
  await deal(page);
  await hostButton(page, 'Start race').click();
  await page.clock.runFor(290_000);
  await expect(page.locator('.winner-revealed')).toBeVisible();
  await expect(hostButton(page, 'New race')).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot('desktop-winner.png', { maxDiffPixelRatio: 0.001 });
});

test('V03 narrow setup keeps photo controls and fallback artwork readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);
  await expect(page).toHaveScreenshot('mobile-setup.png', { fullPage: true, maxDiffPixelRatio: 0.001 });
});
