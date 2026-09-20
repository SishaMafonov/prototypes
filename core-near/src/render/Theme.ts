export type Theme = 'light' | 'dark';
export const themeStorageKey = 'core-near-theme';

export function readTheme(storage: Pick<Storage, 'getItem'> | null, prefersDark: boolean): Theme {
  try {
    const saved = storage?.getItem(themeStorageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Private browsing may deny storage access. */ }
  return prefersDark ? 'dark' : 'light';
}

export function saveTheme(storage: Pick<Storage, 'setItem'> | null, theme: Theme): void {
  try { storage?.setItem(themeStorageKey, theme); } catch { /* The toggle still works without persistence. */ }
}

export const canvasThemes = {
  light: {
    paper: '#f6f5ef', cell: '#fffdf7', grid: '#e4e5dc', wall: '#303c34',
    blocked: '#343e38', hatch: '#526056', captureX: '#e0ece3', captureO: '#f7e9c8',
    X: '#27705b', O: '#b07817', inactive: '#9ba69d', coordinates: '#707c70',
  },
  dark: {
    paper: '#18221f', cell: '#202d27', grid: '#2d3c34', wall: '#b6c8b9',
    blocked: '#0d1512', hatch: '#384c3f', captureX: '#254b3d', captureO: '#4b4027',
    X: '#89d6ae', O: '#edc471', inactive: '#657a6c', coordinates: '#9aafa0',
  },
} as const;
