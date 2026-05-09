import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { invokeFunctionOrThrow } from './invokeFunctionOrThrow';

function createMockSupabase(error: unknown, data: unknown = null): SupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'session-token',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      }),
      refreshSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data, error }),
    },
  } as unknown as SupabaseClient;
}

describe('invokeFunctionOrThrow', () => {
  it('keeps safe JSON function errors and safe codes', async () => {
    const context = new Response(JSON.stringify({
      error: 'Missing siteId',
      code: 'VALIDATION_ERROR',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
    const supabase = createMockSupabase({ message: 'Function returned 400', context });

    await expect(invokeFunctionOrThrow(supabase, 'queue-guest-followups', {}))
      .rejects
      .toThrow('Missing siteId (VALIDATION_ERROR)');
  });

  it('does not surface raw non-JSON function response bodies', async () => {
    const context = new Response('<html>Supabase storage bucket policy denied token abc123</html>', {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
    const supabase = createMockSupabase({ message: 'Edge Function returned a non-2xx status code', context });

    await expect(invokeFunctionOrThrow(supabase, 'photo-album-create', {}))
      .rejects
      .toThrow('Request failed. Please try again.');
  });

  it('does not surface internal JSON function errors or unsafe codes', async () => {
    const context = new Response(JSON.stringify({
      error: 'duplicate key value violates unique constraint "messages_pkey"',
      code: 'DB_ERROR',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
    const supabase = createMockSupabase({ message: 'FunctionsHttpError', context });

    await expect(invokeFunctionOrThrow(supabase, 'send-bulk-message', {}))
      .rejects
      .toThrow('Request failed. Please try again.');
  });

  it('does not surface auth/session/cookie/passcode function diagnostics', async () => {
    const context = new Response(JSON.stringify({
      error: 'Auth session cookie failed for passcode session refresh',
      code: 'SESSION_COOKIE_FAILED',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
    const supabase = createMockSupabase({ message: 'FunctionsHttpError', context });

    await expect(invokeFunctionOrThrow(supabase, 'queue-guest-followups', {}))
      .rejects
      .toThrow('Request failed. Please try again.');
  });

  it('drops unsafe auth-shaped codes even when the message is safe', async () => {
    const context = new Response(JSON.stringify({
      error: 'Try again in a moment.',
      code: 'AUTH_SESSION_EXPIRED',
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 429,
    });
    const supabase = createMockSupabase({ message: 'FunctionsHttpError', context });

    await expect(invokeFunctionOrThrow(supabase, 'queue-guest-followups', {}))
      .rejects
      .toThrow('Try again in a moment.');
  });

  it('does not surface SDK wrapper messages when response context is missing', async () => {
    const supabase = createMockSupabase({ message: 'FunctionsHttpError: Edge Function returned a non-2xx status code' });

    await expect(invokeFunctionOrThrow(supabase, 'setup-bootstrap', {}))
      .rejects
      .toThrow('Request failed. Please try again.');
  });
});
