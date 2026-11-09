const DRAW_DELAY_MS = 10_000;

export function scheduleDraw(
  showSeconds: (seconds: number) => void,
  reveal: () => void,
): () => void {
  const deadline = performance.now() + DRAW_DELAY_MS;
  let timeout: ReturnType<typeof setTimeout>;
  let active = true;

  function tick() {
    if (!active) return;
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      active = false;
      reveal();
      return;
    }

    const seconds = Math.ceil(remaining / 1000);
    showSeconds(seconds);
    timeout = setTimeout(tick, remaining - (seconds - 1) * 1000);
  }

  tick();
  return () => {
    active = false;
    clearTimeout(timeout);
  };
}
