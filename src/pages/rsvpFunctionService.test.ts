import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('rsvpFunctionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns missing-config when the RSVP function runtime is unavailable', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    vi.resetModules();
    const mod = await import('./rsvpFunctionService');

    expect(mod.hasRsvpFunctionRuntime()).toBe(false);
    await expect(mod.callValidateRsvpToken({ action: 'lookup', searchValue: 'Taylor' })).resolves.toEqual({
      error: 'missing-config',
      status: 0,
    });
  });

  it('posts validate-rsvp-token requests through the shared guest RSVP transport', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.resetModules();
    const mod = await import('./rsvpFunctionService');
    await mod.callValidateRsvpToken({ action: 'lookup', searchValue: 'Taylor Rivera' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/validate-rsvp-token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer anon-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          action: 'lookup',
          searchValue: 'Taylor Rivera',
        }),
      }),
    );
  });

  it('passes guest language context through the shared RSVP transport', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.resetModules();
    const mod = await import('./rsvpFunctionService');
    await mod.callValidateRsvpToken({ action: 'lookup_guest', guestId: 'guest-1', rsvpSession: 'session-1', language: 'es' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/validate-rsvp-token',
      expect.objectContaining({
        body: JSON.stringify({
          action: 'lookup_guest',
          guestId: 'guest-1',
          rsvpSession: 'session-1',
          language: 'es',
        }),
      }),
    );
  });
});
