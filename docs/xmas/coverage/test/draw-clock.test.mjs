import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scheduleDraw } from '../src/draw-clock.ts';

function mockClock(t) {
  let elapsed = 0;
  t.mock.method(performance, 'now', () => elapsed);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  return (milliseconds) => {
    elapsed += milliseconds;
    t.mock.timers.tick(milliseconds);
  };
}

test('U10 the countdown and reveal share the same ten-second deadline', (t) => {
  const advance = mockClock(t);
  let displayed;
  let draws = 0;
  scheduleDraw((seconds) => { displayed = seconds; }, () => { draws++; });

  assert.equal(displayed, 10);
  advance(1_000);
  assert.equal(displayed, 9);
  advance(8_999);
  assert.equal(displayed, 1);
  assert.equal(draws, 0);
  advance(1);
  assert.equal(draws, 1);
  advance(20_000);
  assert.equal(draws, 1);
});

test('U11 a late reveal starts the next countdown from the actual reveal time', (t) => {
  const advance = mockClock(t);
  let draws = 0;
  let displayed;
  const onCountdown = (seconds) => { displayed = seconds; };
  scheduleDraw(onCountdown, () => {
    draws++;
    scheduleDraw(onCountdown, () => { draws++; });
  });

  advance(31_000);
  assert.equal(draws, 1);
  assert.equal(displayed, 10);
  advance(9_999);
  assert.equal(draws, 1);
  advance(1);
  assert.equal(draws, 2);
});

test('U12 cancelling an active countdown prevents its pending reveal', (t) => {
  const advance = mockClock(t);
  const reveal = t.mock.fn();
  const cancel = scheduleDraw(() => {}, reveal);
  advance(9_999);
  cancel();
  advance(20_000);
  assert.equal(reveal.mock.callCount(), 0);
});
