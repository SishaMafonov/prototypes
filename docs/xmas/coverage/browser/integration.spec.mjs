import { expect, test } from '@playwright/test';
import { avatar, deal, hostButton, openGame, photoInput, readBoard } from './fixtures.mjs';

test.beforeEach(async ({ page }) => openGame(page));

test('I01 the host action starts one timer and reveals the first two stock cards at their deadlines', async ({ page }) => {
  await deal(page);
  await page.clock.runFor(30_000);
  expect(await readBoard(page)).toMatchObject({ lastCard: null, countdown: '—', positions: [0, 0, 0, 0] });
  await hostButton(page, 'Start race').click();
  await page.locator('#start-race').dispatchEvent('click');
  await page.locator('#edit-racers').dispatchEvent('click');
  await page.locator('#new-race').dispatchEvent('click');

  const track = page.getByRole('region', { name: 'Race lanes and track cards' });
  await expect(track).toBeFocused();
  await expect(page.locator('#draw-countdown')).toHaveText('10s');
  await page.clock.runFor(9_999);
  expect(await readBoard(page)).toMatchObject({ lastCard: null, countdown: '1s', positions: [0, 0, 0, 0] });
  await page.clock.runFor(1);
  expect(await readBoard(page)).toMatchObject({ lastCard: 'K of Clubs', countdown: '10s', positions: [0, 0, 1, 0] });
  await expect(page.getByRole('status')).toHaveText('K of Clubs. Clubs advances to link 1.');
  await expect(page.locator('.marker-moved')).toHaveCSS('animation-name', 'racer-advance');
  await expect(page.locator('.race-status .race-card')).toHaveCSS('animation-name', 'card-reveal');
  await expect(track).toBeFocused();

  await page.clock.runFor(9_999);
  expect((await readBoard(page)).lastCard).toBe('K of Clubs');
  await page.clock.runFor(1);
  expect(await readBoard(page)).toMatchObject({ lastCard: '10 of Spades', positions: [0, 0, 1, 1] });
});

test('I02 a suspended clock reveals one card on resume and a resize preserves the live board', async ({ page }) => {
  await deal(page);
  await hostButton(page, 'Start race').click();
  await page.clock.fastForward(35_000);
  const resumed = await readBoard(page);
  expect(resumed).toMatchObject({ lastCard: 'K of Clubs', countdown: '10s', positions: [0, 0, 1, 0] });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readBoard(page)).toEqual(resumed);
  await page.clock.runFor(9_999);
  expect((await readBoard(page)).lastCard).toBe('K of Clubs');
  await page.clock.runFor(1);
  expect((await readBoard(page)).lastCard).toBe('10 of Spades');
});

test('I03 pending photo decoding blocks dealing and a superseded image cannot replace the latest selection', async ({ page }) => {
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    window.photoDecodes = [];
    HTMLImageElement.prototype.decode = function () {
      return new Promise((resolve, reject) => {
        window.photoDecodes.push(() => decode.call(this).then(resolve, reject));
      });
    };
  });
  const input = photoInput(page, 'Hearts');
  await input.setInputFiles(avatar('#bf2449'));
  await expect(hostButton(page, 'Deal track')).toBeDisabled();
  await input.setInputFiles(avatar('#146650'));
  await expect(hostButton(page, 'Deal track')).toBeDisabled();
  await page.evaluate(() => window.photoDecodes[1]());
  await expect(hostButton(page, 'Deal track')).toBeEnabled();
  const photo = page.getByRole('img', { name: 'Hearts racer photo' });
  const latest = await photo.getAttribute('src');
  await page.evaluate(() => window.photoDecodes[0]());
  await expect(photo).toHaveAttribute('src', latest);
  await deal(page);
  await expect(photo).toHaveAttribute('src', latest);
});
