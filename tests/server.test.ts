import { describe, it, expect } from 'vitest';
import { createApp } from '../server';

describe('createApp', () => {
  it('returns an Express app with a post method', async () => {
    const app = await createApp();
    expect(typeof app.post).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.listen).toBe('function');
  });
});
