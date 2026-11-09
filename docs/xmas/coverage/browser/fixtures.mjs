import { expect } from '@playwright/test';

export const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
export const creatures = ['Reindeer', 'Snowman', 'Elf', 'Polar bear'];

export async function openGame(page) {
  const time = new Date('2026-12-01T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.addInitScript(() => {
    let seed = 1;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
  });
  await page.goto('/');
}

export function photoInput(page, suit) {
  return page.getByLabel(suit + ' photo', { exact: true });
}

export function avatar(color = '#bf2449') {
  return {
    name: 'avatar.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect width="64" height="64" rx="12" fill="' + color + '"/>' +
      '<path d="m32 8 6 16 17 1-13 11 4 17-14-9-14 9 4-17L9 25l17-1z" fill="#fff9ed"/></svg>',
    ),
  };
}

export async function choosePhoto(page, suit, file = avatar()) {
  await photoInput(page, suit).setInputFiles(file);
  const image = page.getByRole('img', { name: suit + ' racer photo' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBe(64);
  return image;
}

export function hostButton(page, name) {
  return page.getByRole('button', { name, exact: true });
}

export async function deal(page) {
  await hostButton(page, 'Deal track').click();
  await expect(page.getByText('Table betting', { exact: true })).toBeVisible();
}

export function readBoard(page) {
  return page.locator('.race-board').evaluate((board) => ({
    links: [...board.querySelectorAll('thead .race-card')].map((card) => card.getAttribute('aria-label')),
    positions: [...board.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].findIndex((cell) => cell.querySelector('.track-marker')),
    ),
    lastCard: board.querySelector('.race-status .race-card')?.getAttribute('aria-label') ?? null,
    countdown: board.querySelector('#draw-countdown').textContent,
    winner: board.querySelector('#race-winner').textContent.trim(),
  }));
}
