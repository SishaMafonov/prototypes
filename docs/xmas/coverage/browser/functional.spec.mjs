import { expect, test } from '@playwright/test';
import { avatar, choosePhoto, creatures, deal, hostButton, openGame, photoInput, readBoard, suits } from './fixtures.mjs';

test.beforeEach(async ({ page }) => openGame(page));

test('F01 photo slots replace, reject invalid files, and clear independently', async ({ page }) => {
  const hearts = await choosePhoto(page, 'Hearts');
  const diamonds = await choosePhoto(page, 'Diamonds');
  const original = await hearts.getAttribute('src');
  const otherPhoto = await diamonds.getAttribute('src');
  await choosePhoto(page, 'Hearts', avatar('#146650'));
  await expect(hearts).not.toHaveAttribute('src', original);
  const replacement = await hearts.getAttribute('src');
  const canRead = (url) => page.evaluate((src) => fetch(src).then((response) => response.ok, () => false), url);
  expect(await canRead(original)).toBe(false);
  expect(await canRead(replacement)).toBe(true);

  await photoInput(page, 'Hearts').setInputFiles({
    name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image'),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'could not be opened' })).toBeVisible();
  await expect(hearts).toHaveAttribute('src', replacement);
  await expect(diamonds).toHaveAttribute('src', otherPhoto);
  await hostButton(page, 'Clear Hearts photo').click();
  await expect(page.getByText('Reindeer', { exact: true })).toBeVisible();
  await expect(hearts).toBeHidden();
  await expect(photoInput(page, 'Hearts')).toBeFocused();
  await expect(hostButton(page, 'Clear Hearts photo')).toBeDisabled();
  expect(await canRead(replacement)).toBe(false);
  await expect(diamonds).toHaveAttribute('src', otherPhoto);
});

test('F02 photos stay in the page and reload restores all four fallbacks', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request));
  for (const suit of suits) await choosePhoto(page, suit);
  await deal(page);
  await expect(page.locator('tbody img.track-marker')).toHaveCount(4);
  expect(requests.filter((request) => !request.url().startsWith('blob:'))).toEqual([]);

  await page.reload();
  for (const creature of creatures) await expect(page.getByText(creature, { exact: true })).toBeVisible();
  await expect(page.locator('.racer-preview img:visible')).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('F03 the host sees four suits, seven face-up links, and the corresponding table odds', async ({ page }) => {
  await deal(page);
  const table = page.getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveCount(10);
  await expect(table.getByRole('columnheader', { name: 'Start', exact: true })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: /Link 7/ })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Finish', exact: true })).toBeVisible();
  const board = await readBoard(page);
  const odds = ['1:1', '2:1', '3:1', '5:1', '10:1'];
  for (const [index, suit] of suits.entries()) {
    const count = board.links.filter((card) => card.endsWith(' of ' + suit)).length;
    await expect(table.getByRole('rowheader', { name: suit + ' ' + odds[count] })).toBeVisible();
    await expect(table.getByRole('img', { name: creatures[index] })).toBeVisible();
  }
  expect(board.positions).toEqual([0, 0, 0, 0]);
  expect(board.lastCard).toBeNull();
  await expect(page.getByRole('button')).toHaveText(['Start race', 'Back to racer setup']);
  await expect(page.locator('input:visible')).toHaveCount(0);
});

test('F04 keyboard navigation returns to editable setup with the photo intact', async ({ page }) => {
  const photo = await choosePhoto(page, 'Clubs');
  const source = await photo.getAttribute('src');
  await hostButton(page, 'Deal track').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Race track' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('region', { name: 'Race lanes and track cards' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(hostButton(page, 'Start race')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(hostButton(page, 'Back to racer setup')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(hostButton(page, 'Deal track')).toBeFocused();
  await expect(photo).toHaveAttribute('src', source);
  await expect(page.getByRole('table')).toHaveCount(0);
});

test.describe('touch and reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });

  test('F05 narrow host controls work by touch and reduced motion suppresses reveal effects', async ({ page }) => {
    await hostButton(page, 'Deal track').tap();
    await hostButton(page, 'Start race').tap();
    await page.clock.runFor(10_000);
    await expect(page.locator('.race-status .race-card')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.marker-moved')).toHaveCSS('animation-name', 'none');
    await expect(page.getByRole('status')).toContainText('advances to link 1');
    const layout = await page.locator('.track-scroll').evaluate((track) => ({
      trackOverflows: track.scrollWidth > track.clientWidth,
      pageFits: document.documentElement.scrollWidth === document.documentElement.clientWidth,
    }));
    expect(layout).toEqual({ trackOverflows: true, pageFits: true });
  });
});
