import { describe, it, expect, beforeEach } from 'vitest';

describe('ThemeContext', () => {
  beforeEach(() => {
    // simulate localStorage
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: () => null,
      length: 0,
    };
    global.document = { documentElement: { classList: { add: () => {}, remove: () => {} } } } as any;
  });

  it('reads stored theme from localStorage', async () => {
    localStorage.setItem('vyedge_theme', 'dark');
    // ThemeProvider uses 'vyedge_theme' key
    expect(localStorage.getItem('vyedge_theme')).toBe('dark');
  });

  it('defaults to light when localStorage is empty', () => {
    expect(localStorage.getItem('vyedge_theme')).toBeNull();
  });
});
