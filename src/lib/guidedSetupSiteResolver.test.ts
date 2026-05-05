import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const resolveActiveSiteForUser = vi.fn();
  return { resolveActiveSiteForUser };
});

vi.mock('./activeSite', () => ({
  resolveActiveSiteForUser: mocks.resolveActiveSiteForUser,
}));

import { resolvePrimaryWeddingSiteId } from './guidedSetupSiteResolver';

describe('guidedSetupSiteResolver', () => {
  it('returns the active wedding site id', async () => {
    mocks.resolveActiveSiteForUser.mockResolvedValueOnce({ id: 'site_123', role: 'owner', permissions: null });
    await expect(resolvePrimaryWeddingSiteId('user_123')).resolves.toBe('site_123');
  });

  it('returns null when no wedding site exists', async () => {
    mocks.resolveActiveSiteForUser.mockResolvedValueOnce(null);
    await expect(resolvePrimaryWeddingSiteId('user_123')).resolves.toBeNull();
  });
});
