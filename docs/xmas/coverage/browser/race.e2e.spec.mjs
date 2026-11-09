import { expect, test } from '@playwright/test';
import { choosePhoto, deal, hostButton, openGame, readBoard } from './fixtures.mjs';

test.use({ reducedMotion: 'reduce' });

test('E01 the host takes a photo through a complete race, holds the winner, and deals again', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  // The seeded stock produces a Diamonds win, so the uploaded photo is shown in the result.
  const photo = await choosePhoto(page, 'Diamonds');
  const portrait = await photo.getAttribute('src');
  await deal(page);
  const initial = await readBoard(page);
  await hostButton(page, 'Start race').click();
  await page.clock.runFor(290_000);
  await expect(page.getByText('Race finished', { exact: true })).toBeVisible();
  await expect(page.locator('.winning-lane .track-finish .track-marker')).toHaveCount(1);
  await expect(page.locator('.winner-revealed')).toHaveCSS('animation-name', 'none');
  const result = await readBoard(page);
  const winningSuit = result.lastCard.split(' of ')[1];
  await expect(page.getByRole('status')).toContainText(winningSuit + ' crosses the finish and wins!');
  expect(result.positions.filter((position) => position === 8)).toHaveLength(1);
  expect(result.winner).toContain(winningSuit + ' wins!');
  await expect(page.locator('.race-result').getByRole('img', { name: 'Diamonds racer photo' }))
    .toHaveAttribute('src', portrait);
  expect(result.countdown).toBe('—');
  await page.clock.runFor(60_000);
  expect(await readBoard(page)).toEqual(result);

  await hostButton(page, 'New race').click();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(photo).toHaveAttribute('src', portrait);
  await expect(hostButton(page, 'Deal track')).toBeFocused();
  await deal(page);
  const next = await readBoard(page);
  expect(next.links).not.toEqual(initial.links);
  expect(next).toMatchObject({ positions: [0, 0, 0, 0], lastCard: null, countdown: '—', winner: '—' });
  expect(errors).toEqual([]);
});
