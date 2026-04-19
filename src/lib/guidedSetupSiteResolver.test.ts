import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { maybeSingle, limit, order, eq, select, from };
});

vi.mock('./supabase', () => ({
  supabase: { from: mocks.from },
}));

import { resolvePrimaryWeddingSiteId } from './guidedSetupSiteResolver';

describe('guidedSetupSiteResolver', () => {
  it('returns the first ordered wedding site id', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: 'site_123' }, error: null });
    await expect(resolvePrimaryWeddingSiteId('user_123')).resolves.toBe('site_123');
  });

  it('returns null when no wedding site exists', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(resolvePrimaryWeddingSiteId('user_123')).resolves.toBeNull();
  });
});
