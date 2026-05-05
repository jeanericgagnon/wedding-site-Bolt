import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

describe('action audit helpers', () => {
  it('does not expose sensitive metadata keys when logging actions', async () => {
    const { supabase } = await import('./supabase');
    const { logAppAction } = await import('./actionAudit');

    const insert = vi.fn(async () => ({ error: null }));
    vi.mocked(supabase.from).mockReturnValueOnce({ insert } as never);

    await logAppAction({
      weddingSiteId: 'site-1',
      area: 'planner',
      type: 'starter_suite_applied',
      summary: 'Starter suite added.',
      metadata: {
        taskCount: 5,
        apiToken: 'should-not-log',
        providerKey: 'should-not-log',
      },
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { taskCount: 5 },
    }));
  });

  it('does not throw when the audit table is not deployed yet', async () => {
    const { supabase } = await import('./supabase');
    const { logAppAction } = await import('./actionAudit');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.mocked(supabase.from).mockReturnValueOnce({
      insert: vi.fn(async () => ({ error: { message: 'relation does not exist' } })),
    } as never);

    await expect(logAppAction({
      weddingSiteId: 'site-1',
      area: 'settings',
      type: 'translation_requested',
      summary: 'Translation requested.',
    })).resolves.toBeUndefined();
  });
});
