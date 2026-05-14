import { describe, expect, it, vi } from 'vitest';
import { isAuthishSupabaseError, retryOnceAfterRefresh } from './supabaseAuthRetry';

describe('isAuthishSupabaseError', () => {
  it('flags jwt and auth-shaped failures', () => {
    expect(isAuthishSupabaseError(new Error('Invalid JWT supplied'))).toBe(true);
    expect(isAuthishSupabaseError(new Error('401 unauthorized'))).toBe(true);
    expect(isAuthishSupabaseError(new Error('auth session missing'))).toBe(true);
    expect(isAuthishSupabaseError(new Error('network timeout'))).toBe(false);
  });
});

describe('retryOnceAfterRefresh', () => {
  it('returns immediately when the first call succeeds', async () => {
    const action = vi.fn(async () => 'ok');
    const refresh = vi.fn(async () => {});

    await expect(retryOnceAfterRefresh({ action, refresh })).resolves.toBe('ok');
    expect(action).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes once and retries auth failures', async () => {
    const action = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Invalid JWT'))
      .mockResolvedValueOnce('recovered');
    const refresh = vi.fn(async () => {});

    await expect(retryOnceAfterRefresh({ action, refresh })).resolves.toBe('recovered');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-auth failures', async () => {
    const action = vi.fn(async () => {
      throw new Error('Row write failed');
    });
    const refresh = vi.fn(async () => {});

    await expect(retryOnceAfterRefresh({ action, refresh })).rejects.toThrow('Row write failed');
    expect(refresh).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });
});
